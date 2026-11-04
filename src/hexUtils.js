// src/hexUtils.js
import { HEX_SIZE } from './HexTile.js';
import { startX, startY } from './metaMap.js';


// 1. 두 헥스 좌표 간의 거리 계산
export function axialDistance(q1, r1, q2, r2) {
    return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs((q1 + r1) - (q2 + r2))) / 2;
}

// 2. 부동소수점 축 좌표를 가장 가까운 정수 헥스 좌표로 반올림
function axialRound(q, r) {
    let s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const q_diff = Math.abs(rq - q);
    const r_diff = Math.abs(rr - r);
    const s_diff = Math.abs(rs - s);

    if (q_diff > r_diff && q_diff > s_diff) {
        rq = -rr - rs;
    } else if (r_diff > s_diff) {
        rr = -rq - rs;
    } else {
        rs = -rq - rr;
    }
    return { q: rq, r: rr };
}

// 3. 두 타일 사이의 모든 경유지(Path) 좌표 배열 반환
export function getHexLine(q1, r1, q2, r2) {
    const N = axialDistance(q1, r1, q2, r2);
    const results = [];
    
    for (let i = 0; i <= N; i++) {
        const t = N === 0 ? 0 : i / N;
        const q = q1 + (q2 - q1) * t;
        const r = r1 + (r2 - r1) * t;
        results.push(axialRound(q, r));
    }
    return results;
}

// Axial 좌표를 화면 픽셀 좌표로 변환하는 헬퍼
export function axialToPixel(q, r) {
    const x = startX + HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = startY + HEX_SIZE * (3 / 2 * r);
    return { x, y };
}