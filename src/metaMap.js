import { LanguageData } from './translate.js';

import { HexTile, TERRAIN_TYPES, HEX_SIZE } from './HexTile.js';


export default class metaMap extends Phaser.Scene {
    constructor() {
        super({ key: 'metaMap' });

        this.tileMap = new Map(); // (q, r) 키 기반 타일 인스턴스 저장소
    }

    create() {
        
        this.mapGrid = [
            [0, 3, 3, 1, 3, 3, 3, 3],
            [0, 3, 1, 3, 3, 3, 3, 3],
            [3, 3, 1, 3, 3, 3, 3, 0],
            [3, 3, 1, 2, 2, 3, 0, 0],
            [3, 3, 3, 2, 2, 3, 0, 0],
            [0, 3, 3, 3, 3, 0, 0, 0]
        ];
        // 2. 맵 데이터 바탕으로 인스턴스 배치
        this.generateHexMapFromGrid(this.mapGrid);

        // 3. 카메라 드래그 이동 설정
        this.setupCameraControls();
    }

    // Axial 좌표 (q, r) -> 화면 픽셀 좌표 (x, y) 변환식
    axialToPixel(q, r) {
        const x = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const y = HEX_SIZE * (3 / 2 * r);
        return { x, y };
    }
    clearHexMap(){
        // 기존 타일 인스턴스 제거
        this.tileMap.forEach(tile => {
            tile.destroy();
        });
        this.tileMap.clear();
    }
    generateHexMapFromGrid(grid) {
        const startX = 200; // 맵 시작 X 오프셋
        const startY = 150; // 맵 시작 Y 오프셋

        for (let r = 0; r < grid.length; r++) { // 행(Row)
            for (let q = 0; q < grid[r].length; q++) { // 열(Column)
                const terrainId = grid[r][q];
                
                // 지형 객체 매핑
                const terrainType = Object.values(TERRAIN_TYPES).find(t => t.id === terrainId) || TERRAIN_TYPES.EMPTY;

                // 화면 위치 계산
                const pos = this.axialToPixel(q, r);
                const posX = startX + pos.x;
                const posY = startY + pos.y;

                // 🔥 HexTile 인스턴스 생성!
                const tileInstance = new HexTile(this, posX, posY, q, r, terrainType);

                // Map에 인스턴스 저장 (q, r 키 사용)
                this.tileMap.set(`${q},${r}`, tileInstance);
            }
        }
    }

    setupCameraControls() {
        // 마우스 드래그로 탐험
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) {
                this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x);
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y);
            }
        });
    }
}