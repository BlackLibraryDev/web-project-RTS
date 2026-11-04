// src/pathfinding.js
import { axialDistance } from './hexUtils.js';

// 헥스 6방향 오프셋 (Axial)
const HEX_DIRECTIONS = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

export function findHexPath(startQ, startR, targetQ, targetR, tileMap) {
    const startKey = `${startQ},${startR}`;
    const targetKey = `${targetQ},${targetR}`;

    if (!tileMap.has(targetKey)) return [];
    const targetTile = tileMap.get(targetKey);
    if (!targetTile.terrain.isWalkable) return []; // 목적지가 장애물이면 이동 불가

    const openSet = [{ q: startQ, r: startR, g: 0, h: axialDistance(startQ, startR, targetQ, targetR), f: 0, parent: null }];
    const closedSet = new Set();
    const nodeMap = new Map(); // 좌표별 노드 상태 관리

    nodeMap.set(startKey, openSet[0]);

    while (openSet.length > 0) {
        // f 값이 가장 작은 노드 선택
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const currentKey = `${current.q},${current.r}`;

        if (current.q === targetQ && current.r === targetR) {
            // 경로 역추적
            const path = [];
            let temp = current;
            while (temp) {
                path.unshift({ q: temp.q, r: temp.r });
                temp = temp.parent;
            }
            return path;
        }

        closedSet.add(currentKey);

        // 6방향 이웃 탐색
        for (const dir of HEX_DIRECTIONS) {
            const nq = current.q + dir.q;
            const nr = current.r + dir.r;
            const neighborKey = `${nq},${nr}`;

            if (closedSet.has(neighborKey)) continue;

            const neighborTile = tileMap.get(neighborKey);
            // 맵에 존재하지 않거나, 통과할 수 없는 지형(물 등)이면 패스
            if (!neighborTile || !neighborTile.terrain.isWalkable) continue;

            // 이동 비용 계산 (기본 거리 1 * 지형 moveCost)
            const tentativeG = current.g + (1 * neighborTile.terrain.moveCost);

            let neighborNode = nodeMap.get(neighborKey);

            if (!neighborNode) {
                neighborNode = {
                    q: nq,
                    r: nr,
                    g: tentativeG,
                    h: axialDistance(nq, nr, targetQ, targetR),
                    f: 0,
                    parent: current
                };
                neighborNode.f = neighborNode.g + neighborNode.h;
                nodeMap.set(neighborKey, neighborNode);
                openSet.push(neighborNode);
            } else if (tentativeG < neighborNode.g) {
                neighborNode.g = tentativeG;
                neighborNode.f = neighborNode.g + neighborNode.h;
                neighborNode.parent = current;
            }
        }
    }

    return []; // 경로가 없는 경우
}