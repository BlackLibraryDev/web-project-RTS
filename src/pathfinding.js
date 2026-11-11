// src/pathfinding.js

const ODD_R_DIRECTIONS = {
    even: [ // 짝수 행
        { q:  1, r:  0 },
        { q:  0, r:  1 },
        { q: -1, r:  1 },
        { q: -1, r:  0 },
        { q: -1, r: -1 },
        { q:  0, r: -1 }
    ],
    odd: [  // 홀수 행
        { q:  1, r:  0 },
        { q:  1, r:  1 },
        { q:  0, r:  1 },
        { q: -1, r:  0 },
        { q:  0, r: -1 },
        { q:  1, r: -1 }
    ]
};

function oddRToCube(q, r) {
    const x = q - (r - (r & 1)) / 2;
    const z = r;
    const y = -x - z;
    return { x, y, z };
}

function getOddRDistance(q1, r1, q2, r2) {
    const c1 = oddRToCube(q1, r1);
    const c2 = oddRToCube(q2, r2);
    return Math.max(
        Math.abs(c1.x - c2.x), 
        Math.abs(c1.y - c2.y), 
        Math.abs(c1.z - c2.z)
    );
}

export function findHexPath(startQ, startR, targetQ, targetR, tileMap) {
    // ⭕ [디버깅] 함수 진입 시 시작점과 목적지 좌표 출력
    //console.log(`[Pathfinder] 길찾기 요청 -> 시작점: (${startQ}, ${startR}) / 목적지: (${targetQ}, ${targetR})`);

    const startKey = `${startQ},${startR}`;
    const targetKey = `${targetQ},${targetR}`;

    if (!tileMap.has(targetKey)) {
        console.warn(`[Pathfinder] 목적지 타일(${targetKey})이 tileMap에 존재하지 않습니다!`);
        return [];
    }
    
    const targetTile = tileMap.get(targetKey);
    if (targetTile.terrain && !targetTile.terrain.isWalkable) {
        console.warn(`[Pathfinder] 목적지(${targetQ}, ${targetR})가 이동 불가능한 지형입니다.`);
        return [];
    }

    const openSet = [{ 
        q: startQ, 
        r: startR, 
        g: 0, 
        h: getOddRDistance(startQ, startR, targetQ, targetR), 
        f: 0, 
        parent: null 
    }];
    const closedSet = new Set();
    const nodeMap = new Map();

    nodeMap.set(startKey, openSet[0]);

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const currentKey = `${current.q},${current.r}`;

        if (current.q === targetQ && current.r === targetR) {
            const path = [];
            let temp = current;
            while (temp) {
                // 탐색 중인 현재 노드의 좌표와 이웃 노드의 좌표를 콘솔에 출력
                //console.log(`현재 탐색중: q=${current.q}, r=${current.r} (행 홀짝: ${current.r % 2})`);
                path.unshift({ q: temp.q, r: temp.r , moveCost:temp.moveCost});
                temp = temp.parent;
            }
           // console.log(`[Pathfinder] 경로 탐색 성공! 총 ${path.length}개 타일 이동`);
            return path;
        }

        closedSet.add(currentKey);

        const isOdd = (current.r % 2 !== 0);
        const directions = isOdd ? ODD_R_DIRECTIONS.odd : ODD_R_DIRECTIONS.even;

        for (const dir of directions) {
            const nq = current.q + dir.q;
            const nr = current.r + dir.r;
            const neighborKey = `${nq},${nr}`;

            if (closedSet.has(neighborKey)) continue;

            const neighborTile = tileMap.get(neighborKey);
            if (!neighborTile || (neighborTile.terrain && !neighborTile.terrain.isWalkable)) continue;

            const moveCost = neighborTile.terrain ? neighborTile.terrain.moveCost : 1;
            const tentativeG = current.g + moveCost;

            let neighborNode = nodeMap.get(neighborKey);

            if (!neighborNode) {
                neighborNode = {
                    q: nq,
                    r: nr,
                    g: tentativeG,
                    h: getOddRDistance(nq, nr, targetQ, targetR),
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

    console.warn(`[Pathfinder] 도달 가능한 경로가 없습니다. (출발: ${startQ},${startR} -> 도착: ${targetQ},${targetR})`);
    return [];
}