import { LanguageData } from './translate.js';

import { HEX_SIZE , HexTile, TERRAIN_TYPES } from './HexTile.js';
import { Unit } from './Unit.js';
import { getHexLine } from './hexUtils.js';
import { findHexPath } from './pathfinding.js';

export const startX = 200; // 맵 시작 X 오프셋
export const startY = 150; // 맵 시작 Y 오프셋


export default class metaMap extends Phaser.Scene {
    constructor() {
        super({ key: 'metaMap' });

        this.tileMap = new Map(); // (q, r) 키 기반 타일 인스턴스 저장소
        this.fogMap = new Map();
    }

    create() {
        
        this.mapGrid = [
            [0, 3, 3, 1, 3, 4, 3, 3],
            [0, 3, 1, 3, 4, 3, 3, 3],
            [3, 3, 1, 3, 3, 3, 3, 0],
            [3, 3, 1, 2, 2, 3, 0, 0],
            [3, 3, 3, 2, 2, 3, 0, 0],
            [0, 3, 3, 3, 3, 3, 0, 0],
            [0, 3, 3, 3, 3, 0, 0, 0]
        ];
        this.mapDatas = [];
        for(let r = 0; r < this.mapGrid.length; r++) {
            this.mapDatas[r] = [];
            for(let q = 0; q < this.mapGrid[r].length; q++) {
                const terrainId = this.mapGrid[r][q];
                const terrainType = Object.values(TERRAIN_TYPES).find(t => t.id === terrainId) || TERRAIN_TYPES.EMPTY;

                this.mapDatas[r][q] = { id: terrainId , type: terrainType, explored:false, facility:[] };
            }
        }
        
        //특정 맵 데이터 좌표를 랜덤으로 고른 후 주변 밝히기
        const randomQ = Math.floor(Math.random() * this.mapGrid[0].length);
        const randomR = Math.floor(Math.random() * this.mapGrid.length);
        this.hexTileSightVisible(randomR, randomQ);

       // this.player = this.drawObject({ tag: 'unit_commandVan', q: randomQ, r: randomR });

        // 2. 맵 데이터 바탕으로 인스턴스 배치
        this.generateHexMapFromGrid(this.mapDatas);
        this.renderMapFog(this.mapDatas);

        // 3. 카메라 드래그 이동 설정
        this.setupCameraControls();

        this.player = new Unit(this, { tag: 'unit_commandVan', q: randomQ, r: randomR });
        
        // 2. 타일 클릭 이벤트 수신
        this.events.on('tileClicked', (clickedTile) => {

            
            const startQ = this.player.q;
            const startR = this.player.r;

            // 1. A* 길찾기로 유효한 최적 경로 탐색 (물/장애물 회피)
            const path = findHexPath(startQ, startR, clickedTile.q, clickedTile.r, this.tileMap);

            if (path.length === 0) {
                console.log('이동할 수 없는 경로입니다! (물 또는 장애물)');
                return;
            }
            // 1. 새로운 목적지를 누르면 기존 이동을 즉시 중단
            if (this.player.isMoving) {
                this.player.stopMovement();
            }
            console.log(`이동 경로 타일 개수: ${path.length - 1}칸`);

            // 유닛 이동 실행
            this.player.moveAlongPath(path, () => {
                console.log('이동 완료!');
            });
        });
        this.events.on('movePoint', (pos) =>{
            console.log(`도착한 타일: ${pos.q} ${pos.r}`)
            this.hexTileSightVisible( pos.r, pos.q);
        });

        this.events.once('shutdown', () => {
            
        });
    }
    hexTileSightVisible( randomR, randomQ) {
        //주변도 밝히기
        this.mapDatas[randomR][randomQ].explored = true;
        console.log(`(${randomR}, ${randomQ}) | 지형: ${this.mapDatas[randomR][randomQ].type.name}`);
        if(randomR > 0) this.mapDatas[randomR-1][randomQ].explored = true;
        if(randomR < this.mapGrid.length-1) this.mapDatas[randomR+1][randomQ].explored = true;
        if(randomQ > 0) this.mapDatas[randomR][randomQ-1].explored = true;
        if(randomQ < this.mapGrid[0].length-1) this.mapDatas[randomR][randomQ+1].explored = true;
        if(randomR > 0 && randomQ < this.mapGrid[0].length-1) this.mapDatas[randomR-1][randomQ+1].explored = true;
        if(randomR < this.mapGrid.length-1 && randomQ > 0) this.mapDatas[randomR+1][randomQ-1].explored = true;
        this.renderMapFog(this.mapDatas);
    }
    drawObject(object) {
        // object: { type: 'building' | 'unit', q, r, ... }
        const pos = this.axialToPixel(object.q, object.r);
        const sprite = this.add.sprite(pos.x, pos.y, object.tag);

        sprite.setOrigin(0.5,0.7).setDepth(10).setScale(0.5);
        sprite.play(`${object.tag}_idle`)
        // 필요에 따라 추가 속성 설정
        sprite.r = object.r;
        sprite.q = object.q;
        sprite.rawData= object;
        return sprite;
    }

    // Axial 좌표 (q, r) -> 화면 픽셀 좌표 (x, y) 변환식
    axialToPixel(q, r) {
        
        const x =startX+ HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const y =startY+ HEX_SIZE * (3 / 2 * r);
        return { x, y };
    }
    clearHexMap(){
        // 기존 타일 인스턴스 제거
        this.tileMap.forEach(tile => {
            tile.destroy();
        });
        this.tileMap.clear();
    }
    generateHexMapFromGrid(mapdatas) {
        
        this.clearHexMap();
        for (let r = 0; r < mapdatas.length; r++) { // 행(Row)
            for (let q = 0; q < mapdatas[r].length; q++) { // 열(Column)
                
                
                // 지형 객체 매핑
                const terrainId = mapdatas[r][q].id;
                const terrainType = mapdatas[r][q].type;
                
                // 화면 위치 계산
                const pos = this.axialToPixel(q, r);

                // 🔥 HexTile 인스턴스 생성!
                const tileInstance = new HexTile(this, pos.x, pos.y, q, r, terrainType );
                
                // Map에 인스턴스 저장 (q, r 키 사용)
                this.tileMap.set(`${q},${r}`, tileInstance);
            }
        }
    }
    clearFogMap(){
        // 기존 타일 인스턴스 제거
        this.fogMap.forEach(tile => {
            if(tile!=null) tile.destroy();
        });
        this.fogMap.clear();
    }
    renderMapFog(mapdatas){
        this.clearFogMap();
        for (let r = 0; r < mapdatas.length; r++) { // 행(Row)
            for (let q = 0; q < mapdatas[r].length; q++) { // 열(Column)
                const pos = this.axialToPixel(q, r);
                const explored = mapdatas[r][q].explored;
                if(!explored){
                    const fogInstance = new HexTile(this, pos.x, pos.y, q,r, TERRAIN_TYPES.FOG);
                    this.fogMap.set(`${q},${r}`, fogInstance);
                }else{
                    this.fogMap.set(`${q},${r}`, null);
                }
           
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