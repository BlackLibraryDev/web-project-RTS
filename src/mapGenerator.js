// src/mapGenerator.js
import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js';
import alea from 'https://cdn.jsdelivr.net/npm/alea@1.0.1/+esm';

export function generateRectangularNoiseMap(width, height, seed = 'default_seed', options={} ) {
    const prng = alea(seed);
    const noise2D = createNoise2D(prng);

    // 🎛️ 지형별 비율을 결정하는 임계값 설정 (옵션으로 외부에서 조절 가능)
    const waterThreshold = options.waterThreshold ?? 0.25;   // 물 비율 (기본 25%)
    const grassThreshold = options.grassThreshold ?? 0.55;   // 들판 비율 (기본 30%)
    const redwoodThreshold = options.redwoodThreshold ?? 0.75; // 숲 비율 (기본 20%)
    // 남은 0.75 ~ 1.0 (25%)은 산(Mountain)이 됩니다.

    
    // ⭕ 2차원 배열 초기화 (height x width)
    const mapDataArray = [];
    const scale = options.scale ?? 0.12; // 지형 덩어리 크기

    for (let r = 0; r < height; r++) {
        const row = [];
        const qOffset = Math.floor(r / 2); // 헥스 직사각형 정렬 오프셋
        
        for (let q = -qOffset; q < width - qOffset; q++) {
            const nx = q * scale;
            const ny = (r + q / 2) * scale;
            
            const rawNoise = noise2D(nx, ny);
            const normalizedNoise = (rawNoise + 1) / 2;

            let actualTerrainId = 3; // GRASS 기본

            // ⭕ 임계값(Threshold)을 기준으로 지형 판별
            if (normalizedNoise < waterThreshold) {
                actualTerrainId = 1; // WATER (물)
            } else if (normalizedNoise < grassThreshold) {
                actualTerrainId = 3; // GRASS (들판/평야)
            } else if (normalizedNoise < redwoodThreshold) {
                actualTerrainId = 2; // REDWOOD (숲)
            } else {
                actualTerrainId = 4; // MOUNTAIN (산)
            }

            // 개별 타일 객체 생성 후 행(row) 배열에 푸시
            row.push(actualTerrainId)
            /*
            row.push({
                q: q,
                r: r,
                actualTerrainId: actualTerrainId,
                isExplored: false
            });
            */
        }
        mapDataArray.push(row);
    }

    return mapDataArray; // 2차원 배열 반환
}
export function generateHexagonWoldMapData(radious, seed = 'default_seed'){
    const prng = alea(seed);
    const noise2D = createNoise2D(prng);
    const mapDataMap = new Map(); // key: "q,r", value: terrainId

    const scale = 0.15; // 노이즈 확대/축소 비율 (대륙 크기 조절)

    for (let q = -radius; q <= radius; q++) {
        const r1 = Math.max(-radius, -q - radius);
        const r2 = Math.min(radius, -q + radius);

        for (let r = r1; r <= r2; r++) {
            const nx = q * scale;
            const ny = (r + q / 2) * scale;
            
            const rawNoise = noise2D(nx, ny); // -1.0 ~ 1.0
            const normalizedNoise = (rawNoise + 1) / 2; // 0.0 ~ 1.0

            // 노이즈 값에 따른 지형 ID 판별 (공유해주신 TERRAIN_TYPES 기준)
            let actualTerrainId = 3; // 기본 GRASS(field)

            if (normalizedNoise < 0.25) {
                actualTerrainId = 1; // WATER (물)
            } else if (normalizedNoise < 0.55) {
                actualTerrainId = 3; // GRASS (들판)
            } else if (normalizedNoise < 0.75) {
                actualTerrainId = 2; // REDWOOD (숲)
            } else {
                actualTerrainId = 4; // MOUNTAIN (산)
            }

            // 각 좌표별로 [실제 숨겨진 지형]과 [현재 플레이어에게 보이는 지형]을 분리 관리
            mapDataMap.set(`${q},${r}`, {
                q: q,
                r: r,
                terrainId: actualTerrainId, // 노이즈로 결정된 진짜 지형
            });
        }
    }

    return mapDataMap;
}