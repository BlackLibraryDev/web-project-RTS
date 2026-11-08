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
    // ⭕ 2차원 배열 초기화 (height x width)
const mapDataArray = [];
const scale = options.scale ?? 0.05; // 헥스 크기에 맞게 스케일 조정 (보통 0.05 ~ 0.1 사이가 적당)
const HEX_SIZE = 72; // 타일 반지름 (렌더링과 동일한 값)

for (let r = 0; r < height; r++) {
    const row = [];
    
    // Pointy-top Odd-R 렌더링 공식과 완전히 일치하는 홀수 행 X축 오프셋
    const rowXOffset = (r % 2 !== 0) ? (Math.sqrt(3) * HEX_SIZE / 2) : 0;

    for (let q = 0; q < width; q++) {
        // 1. axialToPixel과 정확히 일치하는 실제 픽셀 월드 좌표 계산
        const x = (Math.sqrt(3) * HEX_SIZE) * q + rowXOffset;
        const y = HEX_SIZE * (3 / 2 * r);

        // 2. 픽셀 좌표를 노이즈 공간에 매핑 (스케일 적용)
        const nx = x * scale;
        const ny = y * scale;
        
        const rawNoise = noise2D(nx, ny);
        const normalizedNoise = (rawNoise + 1) / 2;

        let actualTerrainId = 3; // GRASS 기본

        // 3. 임계값(Threshold)을 기준으로 지형 판별
        if (normalizedNoise < waterThreshold) {
            actualTerrainId = 1; // WATER (물)
        } else if (normalizedNoise < grassThreshold) {
            actualTerrainId = 3; // GRASS (들판/평야)
        } else if (normalizedNoise < redwoodThreshold) {
            actualTerrainId = 2; // REDWOOD (숲)
        } else {
            actualTerrainId = 4; // MOUNTAIN (산)
        }

        // ⭕ 객체 구조로 데이터를 담아주어야 나중에 지형 변경 및 길찾기가 편해집니다.
        row.push( actualTerrainId);
    }
    mapDataArray.push(row);
}

return mapDataArray;
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