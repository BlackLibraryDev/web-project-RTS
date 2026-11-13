import { LanguageData } from './translate.js';
import { GameOptions } from './core/option.js';

import { generateRectangularNoiseMap } from './mapGenerator.js';
import { HEX_SIZE , HexTile, TERRAIN_TYPES } from './HexTile.js';

import { Unit } from './Unit.js';
import { getHexLine , axialToPixel } from './hexUtils.js';
import { findHexPath } from './pathfinding.js';
import UIScene from './UIscene.js';
import { GameEvents } from './events.js';
import { GameData, createFacilityData } from './core/data.js';

export const startX = 200; // 맵 시작 X 오프셋
export const startY = 150; // 맵 시작 Y 오프셋

// Odd-R 헥스 그리드용 6방향 오프셋 정의
const ODD_R_DIRECTIONS = {
    even: [
        { q:  1, r:  0 }, // 우측
        { q:  0, r:  1 }, // 우하단
        { q: -1, r:  1 }, // 좌하단
        { q: -1, r:  0 }, // 좌측
        { q: -1, r: -1 }, // 좌상단
        { q:  0, r: -1 }  // 우상단
    ],
    odd: [
        { q:  1, r:  0 }, // 우측
        { q:  1, r:  1 }, // 우하단
        { q:  0, r:  1 }, // 좌하단
        { q: -1, r:  0 }, // 좌측
        { q:  0, r: -1 }, // 좌상단
        { q:  1, r: -1 }  // 우상단
    ]
};


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
        const seedName = 'world'+ Math.floor(Math.random()*100000000)
        this.mapGrid = generateRectangularNoiseMap(12,10, seedName);
        //console.log(`Random Seed: ${seedName}`);
        uiScene.seedName = seedName;

        this.mapDatas = [];
        for(let r = 0; r < this.mapGrid.length; r++) {
            this.mapDatas[r] = [];
            for(let q = 0; q < this.mapGrid[r].length; q++) {
                const terrainId = this.mapGrid[r][q];
                const terrainType = Object.values(TERRAIN_TYPES).find(t => t.id === terrainId) || TERRAIN_TYPES.EMPTY;
                let facilityList = [];
                let garrisonList = [];
                let teamNum = 0;
                let maxNum =terrainType.slot; 

                if(terrainType.name=='redwood' || terrainType.name=='mountain'){
                   
                    facilityList.push( createFacilityData('redwood'));
                }

                if(terrainType.name=='water'){
                    facilityList.push( createFacilityData('water'))
                }
                if(terrainType.name=='field'){
                    if(Math.random()< 0.4)  facilityList.push( createFacilityData('apartment')); 
                    if(Math.random()< 0.3)  facilityList.push( createFacilityData('boardingHouse')); 
                    if(Math.random()< 0.3)  facilityList.push( createFacilityData('junkMine'));
                    
                    if(Math.random()<0.12) {teamNum=2;  garrisonList.push( {team:2, tag:'scout', type:'infantry', amount:1})}
                    if(Math.random()<0.12) {teamNum=2;  garrisonList.push( {team:2, tag:'anti-drone team', type:'infantry', amount:1})}
                    if(Math.random()<0.2)  {teamNum=2;  garrisonList.push( {team:2, tag:'rifleman', type:'infantry', amount:1})}
                }

                

                this.mapDatas[r][q] = { 
                    id: terrainId , 
                    type: terrainType, 
                    name:terrainType.name, 
                    team:teamNum,
                    q:q, 
                    r:r,
                    slot:maxNum,
                    explored: GameOptions.config.debugMode, 
                    facility:facilityList, 
                    garrison:garrisonList
                };
            }
        }
        //마을 생성
        this.generateVil(3);


        //특정 맵 데이터 좌표를 랜덤으로 고른 후 주변 밝히기
        this.startingPoint = this.randomStartingPoint();
        this.hexTileFogVisible(this.startingPoint.r, this.startingPoint.q);
        const playerTile = this.startingPoint.playerTile;
        playerTile.team =1; 
        if(Object.keys( playerTile.facility).find((key) => playerTile.facility[key].type === 'house')){
            //console.log('집이 있음')
        }else{
            playerTile.facility.push( createFacilityData( 'baseCamp') )
        }
        
        for(let i = 0; i<playerTile.garrison.length ; i++){
            playerTile.garrison[i].team = 1;
        }
        this.centerCameraOnTile(this.startingPoint.r, this.startingPoint.q);
        //uiScene.setTileInfo(this.mapDatas[this.startingPoint.r][this.startingPoint.q])


        // 2. 맵 데이터 바탕으로 인스턴스 배치
        this.generateHexMapFromGrid(this.mapDatas);
        this.renderMapFog(this.mapDatas);
        

        // 3. 카메라 드래그 이동 설정
        this.setupCameraControls();

        this.player //  = new Unit(this, { tag: 'unit_commandVan', q: this.startingPoint.q, r: this.startingPoint.r });
        
        // 2. 타일 클릭 이벤트 수신
        // 더블탭 판정을 위한 시간 제한 (밀리초 단위, 보통 250ms ~ 350ms가 적당)
        const DOUBLE_CLICK_DELAY = 250;
        let dobuleClickedTile = null;
        this.events.on(GameEvents.TILE_CLICKED, (clickedTile) => {
            uiScene.setTileInfo(this.mapDatas[clickedTile.r][clickedTile.q])
            

            // 1. 이미 진행 중인 더블클릭 타이머가 있다면 -> '두 번째 클릭' (더블탭 성공!)
            if (this.doubleClickTimer!=null ) {
                // 타이머를 취소하여 단일 클릭 이벤트가 발생하는 것을 방지
                this.doubleClickTimer.remove();
                this.doubleClickTimer = null;
            
                if( clickedTile.r != dobuleClickedTile.r || clickedTile.q != dobuleClickedTile.q) return;
                //console.log(`[Double Tap] 타일 (${clickedTile.q}, ${clickedTile.r}) 더블클릭됨!`);
                
                // 🚀 [여기에 더블탭 시 실행할 로직 작성]
                // 예: 유닛 정보창 열기, 해당 타일로 카메라 즉시 이동 등
                this.centerCameraOnTile(clickedTile.r,clickedTile.q);

                return; // 단일 클릭 로직이 타지 않도록 종료
            }
            

            dobuleClickedTile ={q: clickedTile.q , r:clickedTile.r}
            // 2. 타이머가 없다면 -> '첫 번째 클릭'
            // 일정 시간 동안 두 번째 클릭이 들어오지 않으면 단일 클릭으로 확정하는 타이머 생성
            this.doubleClickTimer = this.time.delayedCall(DOUBLE_CLICK_DELAY, () => {
                
               // console.log(`[Single Click] 타일 (${clickedTile.q}, ${clickedTile.r}) 단일 클릭됨.`);
                
                    // 🚀 [여기에 싱글 클릭 시 실행할 기존 로직 작성]
                    // 예: 이동 경로 표시(Pathfinding), 타일 선택 하이라이트 등
                    //console.log(`클릭한 타일: ${clickedTile.terrain.name} (${clickedTile.q}, ${clickedTile.r})`)
                    
                    
                    if(this.player ==null) return; 

                    const startQ = this.player.q;
                    const startR = this.player.r;

                    // 1. A* 길찾기로 유효한 최적 경로 탐색 (물/장애물 회피)
                    const path = findHexPath(startQ, startR, clickedTile.q, clickedTile.r, this.tileMap);

                    if (path.length === 0) {
                        //console.log('이동할 수 없는 경로입니다! (물 또는 장애물)');
                        return;
                    }
                    // 1. 새로운 목적지를 누르면 기존 이동을 즉시 중단
                    if (this.player.isMoving) {
                        this.player.stopMovement();
                    }
                    //console.log(`이동 경로 타일 개수: ${path.length - 1}칸`);

                    // 유닛 이동 실행
                    this.player.moveAlongPath(path, () => {
                    // this.pathVisualizer.showPath(path);
                        uiScene.setTileInfo(this.mapDatas[this.player.r][this.player.q])
                        console.log('이동 완료!');
                    });
                
                // 타이머 종료 후 변수 초기화
                this.doubleClickTimer = null;

            }, [], this);

            
        });
        this.events.on(GameEvents.MOVE_POINT, (pos) =>{
            //console.log(`도착한 타일: ${pos.q} ${pos.r}`)
            this.hexTileFogVisible( pos.r, pos.q);

            //uiScene.setTileInfo(this.mapDatas[pos.r][pos.q])
            
        });
         this.events.on(GameEvents.RENDER_TILE, (data) =>{
            this.mapDatas[data.r][data.q].team = data.team;
            this.renderHexTile( data.r, data.q);
            
        });
        this.registry.events.on(GameEvents.TURN_END, (isTurnEnd=false) =>{
            //데이터 종료 버튼 누를 시 자원 계산
            
            const res = this.calculateResource(isTurnEnd);
           
            if(isTurnEnd){
                //턴 종료 시
                //turn ++ 
                const player= GameData.saveData
                Object.keys(res[1]).forEach((item) => {
                    //console.log(`${item}:${res[1][item]}`)
                    player[item]+= res[1][item];
                })
                console.warn('turnEnd', res[1]);
            }
            uiScene.renderResourceBar( res, isTurnEnd );
            
        });

        this.events.once('shutdown', () => {
            this.events.off(GameEvents.TILE_CLICKED);
            this.events.off(GameEvents.MOVE_POINT);
            this.registry.events.off(GameEvents.TURN_END);
            this.doubleClickTimer =null;
            console.log('GameScene 종료: 타일 클릭 이벤트 리스너 해제됨');
        });
    }
    calculatePath(q,r, airPath=false){
        const path = findHexPath(this.startingPoint.q, this.startingPoint.r, q, r, this.tileMap, airPath);
        
        return path;
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
    generateVil(num = 1){
        for(let n =0;n<num ; n++){
            const vilPoint = this.randomStartingPoint();
            const array = this.hexTileRadious(vilPoint.r, vilPoint.q);
            for(let i = 0; i <array.length ; i++){
                if(Math.random()<0.7){
                    array[i].type  = TERRAIN_TYPES.VIL.id;
                    array[i].type = TERRAIN_TYPES.VIL;
                    array[i].name = TERRAIN_TYPES.VIL.name
                    let facilityList =[]
                    if(Math.random()< 0.4)  facilityList.push( createFacilityData( 'apartment'))
                    if(Math.random()< 0.4)  facilityList.push( createFacilityData( 'apartment'))
                    if(Math.random()< 0.3)  facilityList.push( createFacilityData( 'boardingHouse'));
                    if(Math.random()< 0.9)  facilityList.push( createFacilityData( 'junkMine'));
                    array[i].facility = facilityList;
                }
            }
        }
    }
    objectCopy( object ){
        // 방법 A: 전개 연산자 (...) 사용
        //array.push({ ...Facility.GasTank });
        // 방법 B: Object.assign() 사용
        return Object.assign({}, object);
    }
    /**
     * 자원 총합 계산 및 
     */
    calculateResource(isEndTurn=false){
        //자원 총합 계산
        const data = GameData.saveData;
        const res0 = {
            house :0,
            manPower:0,
            birth:0,
            death:0,
            ammo:0,
            misc:0,
            food:0,
            fuel:0,
        }
        const res = [this.objectCopy(res0) , this.objectCopy(res0), this.objectCopy(res0) ] ;
        for(let r = 0; r < this.mapDatas.length; r++) {
            for(let q = 0; q < this.mapDatas[r].length; q++) {
                const mapdata = this.mapDatas[r][q];
                const facility = mapdata.facility;
                const garrison = mapdata.garrison;
                const team = mapdata.team;
                
                for(let i = 0; i < facility.length ; i++){
                    //시설물 보너스 계산 
                    const fs = facility[i];
                    if(fs.amount!=null ){
                        if(fs.amount>0){
                            const delta = fs.amount>10 ? 10 : fs.amount ;
                            switch(fs.type){
                                case 'house':
                                    
                                    res[team].house += fs.amount;
                                    break;
                            }
                            if(isEndTurn){
                                //턴 넘길 때만 계산하기
                                if(fs.labor>0){
                                    res[team][fs.resource] += delta *fs.labor;
                                    fs.amount -= delta *fs.labor;
                                    if(fs.amount <0){
                                        res[team][fs.resource] += fs.amount;
                                    }
                                    
                                    if(fs.type=='farm'){
                                        //농사의 경우 재충전
                                        if(fs.amount<=0) fs.amount = fs.maxAmount;
                                    }
                                }
                            }
                           
                        }else{
                            //자원 소진의 경우
                            fs.amount = 0;
                        }
                        
                    }

                }
                
                
            }
        }
        if(isEndTurn){
            //식량 소모
            //const data = GameData.saveData;
            for(let i = 0 ;i <data.pop.length ; i++){
                const person = data.pop[i];
                
                if(data.food >0){
                    data.food --;
                    console.log(data.food)
                    res[1].food--;
                }else{
                    person.hunger -= 1;
                }
                if(person.hunger<=0){
                    res[1].death++;
                    console.warn(`${person.tag}가 굶주림으로 사망했습니다/탈주했습니다` );
                    data.pop.splice(i,1);
                    i--;

                }
            }
            //우선 값을 복원해줌
            data.food -= res[1].food;
        }

        data.house = res[1].house;
        
        return res;
        //GameData.save();
    }
    ////////////////////////////////////////////////////////////////////////////////////////
    hexTileFogVisible( r, q) {
        //주변도 밝히기
        const array = this.hexTileRadious(r,q);
        for(let i = 0; i <array.length ; i++){
            array[i].explored = true;
        }
        this.renderMapFog(this.mapDatas);
    }
    hexTileNeighbors(r,q){
        const neighbors = [];
        const isOdd = (r % 2 !== 0);
        const directions = isOdd ? ODD_R_DIRECTIONS.odd : ODD_R_DIRECTIONS.even;
        for (const dir of directions) {
            if(r + dir.r >=0 && r+dir.r< this.mapDatas.length &&  q + dir.q >=0 && q + dir.q < this.mapDatas[r].length){
                neighbors.push(this.mapDatas[r + dir.r][q + dir.q])
            }
            
        }

        return neighbors;
    }
    hexTileRadious(r,q){

        const neighbors = this.hexTileNeighbors(r,q);
        neighbors.splice(0,0,this.mapDatas[r][q])
        return neighbors;
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
                const pos = axialToPixel(q, r);

                // 🔥 HexTile 인스턴스 생성!
                const tileInstance = new HexTile(this, pos.x, pos.y, q, r, terrainType, team );
                
                // Map에 인스턴스 저장 (q, r 키 사용)
                this.tileMap.set(`${q},${r}`, tileInstance);
            }
        }
    }
    renderHexTile( r, q){
       // const terrainId = this.mapdatas[r][q].id;\
        const terrainType = this.mapDatas[r][q].type;
        const team = this.mapDatas[r][q].team;
        const pos = axialToPixel(q, r);
        const tileInstance = new HexTile(this, pos.x, pos.y, q, r, terrainType, team );
        this.tileMap.set(`${q},${r}`, tileInstance);
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
                const pos = axialToPixel(q, r);
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



    centerCameraOnTile( r, q,duration = 700) {
        const {x,y} = axialToPixel(q,r);
        //console.log(x,y)

        // 2. 방법 A: 즉시 순간이동 시키기
        //this.cameras.main.centerOn(x, y);

        // 2. 방법 B: 부드럽게 스크롤하며 이동시키고 싶을 때 (Camera Pan 효과)
         this.cameras.main.pan(x, y, duration, 'Power2', false, (camera, progress) => {
             if (progress === 1) {
                 //console.log(`카메라가 타일 (${q}, ${r}) 정중앙에 도달했습니다.`);
             }
         });
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