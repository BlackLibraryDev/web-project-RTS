import { LanguageData } from './translate.js';
import { GameOptions } from './core/option.js';

import { generateRectangularNoiseMap } from './mapGenerator.js';
import { HEX_SIZE , HexTile, TERRAIN_TYPES , Facility } from './HexTile.js';
import { Unit } from './Unit.js';
import { getHexLine } from './hexUtils.js';
import { findHexPath } from './pathfinding.js';
import UIScene from './UIscene.js';

export const startX = 200; // 맵 시작 X 오프셋
export const startY = 150; // 맵 시작 Y 오프셋



export default class metaMap extends Phaser.Scene {
    constructor() {
        super({ key: 'metaMap' });
        this.prevDistance = 0; // 이전 프레임의 두 손가락 사이 거리 저장
        this.tileMap = new Map(); // (q, r) 키 기반 타일 인스턴스 저장소
        this.fogMap = new Map();
    }

    create() {
        this.input.addPointer(2); //멀티터치 활성화
        this.zoomRatio = GameOptions.config.zoomRatio;
         const uiScene = this.scene.get('UIScene');
        this.mapGrid = [
            [0, 3, 3, 1, 3, 4, 3, 3],
            [0, 3, 1, 3, 4, 3, 3, 3],
            [3, 3, 1, 3, 3, 3, 3, 4],
            [3, 3, 1, 1, 1, 3, 4, 2],
            [3, 3, 3, 1, 1, 3, 2, 2],
            [0, 3, 3, 3, 3, 3, 2, 0],
            [0, 2, 2, 2, 3, 0, 2, 0]
        ];
        const seedName = 'my_explore_world'+ Math.floor(Math.random()*100000)
       this.mapGrid = generateRectangularNoiseMap(12,10, seedName);
        console.log(`Random Seed: ${seedName}`);

        this.mapDatas = [];
        for(let r = 0; r < this.mapGrid.length; r++) {
            this.mapDatas[r] = [];
            for(let q = 0; q < this.mapGrid[r].length; q++) {
                const terrainId = this.mapGrid[r][q];
                const terrainType = Object.values(TERRAIN_TYPES).find(t => t.id === terrainId) || TERRAIN_TYPES.EMPTY;
                let facilityList = [];
                let garrisonList = [];
                let teamNum = 0;

                if(terrainType.name=='redwood' || terrainType.name=='mountain'){
                    facilityList.push( Facility.redwood)
                }

                if(terrainType.name=='water'){
                    facilityList.push( Facility.water )
                }
                if(terrainType.name=='field'){
                    if(Math.random()< 0.4)  facilityList.push( Facility.Apartment)
                    if(Math.random()< 0.3)  facilityList.push( Facility.BoardingHouse)
                    if(Math.random()< 0.3)  facilityList.push( Facility.Well)
                    if(Math.random()< 0.3)  facilityList.push( Facility.JunkMine)
                    
                    if(Math.random()<0.12) {teamNum=2;  garrisonList.push( {team:2, name:'scout', type:'infantry', amount:1})}
                    if(Math.random()<0.12) {teamNum=2;  garrisonList.push( {team:2, name:'anti-drone team', type:'infantry', amount:1})}
                    if(Math.random()<0.2)  {teamNum=2;  garrisonList.push( {team:2, name:'rifleman', type:'infantry', amount:1})}
                }

                

                this.mapDatas[r][q] = { 
                    id: terrainId , 
                    type: terrainType, 
                    name:terrainType.name, 
                    team:teamNum,
                    q:q, 
                    r:r,
                    explored: GameOptions.config.debugMode, 
                    facility:facilityList, 
                    garrison:garrisonList
                };
            }
        }
        
        //특정 맵 데이터 좌표를 랜덤으로 고른 후 주변 밝히기
        const startingPoint = this.randomStartingPoint();
        this.hexTileFogVisible(startingPoint.r, startingPoint.q);
        const playerTile = startingPoint.playerTile;
        playerTile.team =1; 
        for(let i = 0; i<playerTile.garrison.length ; i++){
            playerTile.garrison[i].team = 1;
        }

        // 2. 맵 데이터 바탕으로 인스턴스 배치
        this.generateHexMapFromGrid(this.mapDatas);
        this.renderMapFog(this.mapDatas);

        // 3. 카메라 드래그 이동 설정
        this.setupCameraControls();

        this.player ;// = new Unit(this, { tag: 'unit_commandVan', q: randomQ, r: randomR });
        
        // 2. 타일 클릭 이벤트 수신
        this.events.on('tileClicked', (clickedTile) => {
            console.log(`클릭한 타일: ${clickedTile.terrain.name} (${clickedTile.r}, ${clickedTile.q})`)
            uiScene.setTileInfo(this.mapDatas[clickedTile.r][clickedTile.q])
            
            if(this.player ==null) return; 

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
            //console.log(`이동 경로 타일 개수: ${path.length - 1}칸`);

            // 유닛 이동 실행
            this.player.moveAlongPath(path, () => {
                uiScene.setTileInfo(this.mapDatas[this.player.r][this.player.q])
                console.log('이동 완료!');
            });
        });
        this.events.on('movePoint', (pos) =>{
            console.log(`도착한 타일: ${pos.r} ${pos.q}`)
            this.hexTileFogVisible( pos.r, pos.q);

            //uiScene.setTileInfo(this.mapDatas[pos.r][pos.q])
            
        });

        this.events.once('shutdown', () => {
            this.events.off('tileClicked');
            this.events.off('movePoint');
            console.log('GameScene 종료: 타일 클릭 이벤트 리스너 해제됨');
        });
    }

    randomStartingPoint(){
         //특정 맵 데이터 좌표를 랜덤으로 고른 후 주변 밝히기
         let randomQ =0;
         let randomR =0;
         let _playerTile ;
         while (true){
            randomQ = Math.floor(Math.random() * this.mapGrid[0].length);
            randomR = Math.floor(Math.random() * this.mapGrid.length);
            _playerTile = this.mapDatas[randomR][randomQ];
            if(_playerTile.id == TERRAIN_TYPES.GRASS.id || _playerTile.id == TERRAIN_TYPES.REDWOOD.id){
                break;
            }
            
         }
        return {q:randomQ , r:randomR, playerTile:_playerTile}
    }

    hexTileFogVisible( randomR, randomQ) {
        //주변도 밝히기
        this.mapDatas[randomR][randomQ].explored = true;
        //console.log(`(${randomR}, ${randomQ}) | 지형: ${this.mapDatas[randomR][randomQ].type.name}`);
        if(randomR > 0) this.mapDatas[randomR-1][randomQ].explored = true;
        if(randomR < this.mapGrid.length-1) this.mapDatas[randomR+1][randomQ].explored = true;
        if(randomQ > 0) this.mapDatas[randomR][randomQ-1].explored = true;
        if(randomQ < this.mapGrid[0].length-1) this.mapDatas[randomR][randomQ+1].explored = true;
        if(randomR > 0 && randomQ < this.mapGrid[0].length-1) this.mapDatas[randomR-1][randomQ+1].explored = true;
        if(randomR < this.mapGrid.length-1 && randomQ > 0) this.mapDatas[randomR+1][randomQ-1].explored = true;
        this.renderMapFog(this.mapDatas);
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
                const team = mapdatas[r][q].team;
                
                // 화면 위치 계산
                const pos = this.axialToPixel(q, r);

                // 🔥 HexTile 인스턴스 생성!
                const tileInstance = new HexTile(this, pos.x, pos.y, q, r, terrainType, team );
                
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
    update() {
        // 두 개의 포인터를 가져옵니다.
        const pointer1 = this.input.pointer1;
        const pointer2 = this.input.pointer2;

        // 2. 두 손가락이 모두 화면을 누르고 있을 때만 실행
        if (pointer1.isDown && pointer2.isDown) {
            // 현재 두 포인터 사이의 거리를 계산 (Phaser.Math 사용)
            const currentDistance = Phaser.Math.Distance.Between(
                pointer1.x, pointer1.y,
                pointer2.x, pointer2.y
            );

            // 이전 거리가 기록되어 있다면 (터치를 시작한 직후 프레임이 아니라면)
            if (this.prevDistance > 0) {
                // 거리의 변화량을 계산 (확대 시 양수, 축소 시 음수)
                const distanceDelta = currentDistance - this.prevDistance;

                // 3. 카메라 줌 값 변경 (0.01은 민감도 조절용 가중치)
                let newZoom = this.cameras.main.zoom + (distanceDelta * this.zoomRatio.ratio);

                // 줌 제한 범위 설정 (최소 0.5배 ~ 최대 3.0배)
                newZoom = Phaser.Math.Clamp(newZoom, this.zoomRatio.min, this.zoomRatio.max);

                this.cameras.main.setZoom(newZoom);
            }

            // 현재 거리를 다음 프레임을 위해 저장
            this.prevDistance = currentDistance;
        } else {
            // 두 손가락 중 하나라도 떼어지면 이전 거리 기록을 초기화
            this.prevDistance = 0;
        }
    }
}