import { TERRAIN_TYPES } from "../HexTile.js";
import { objectCopy} from "./calculateTurn.js";
import { GameOptions } from "./option.js";

// src/data.js
export const GameData = {
    // 1. 구글 스프레드시트(TSV)에서 불러온 정적 설정 데이터 보관소
    facilities: {},
    terrains: {},
    units: {},
    items: {},
    // ⭕ [필수 추가] preload.js에서 호출하고 있는 init 메서드 정의
    init(facilities = {}, items ={},terrains = {}, units = {}) {
        this.facilities = facilities;
        this.items = items;
        this.terrains = terrains;
        this.units = units;
        //console.log(items)
    },

    saveData: {
    },
    save() {
        localStorage.setItem('projectRTS_game_data', JSON.stringify(this.saveData));
        console.log('게임 데이터 저장 완료');
    },

    load() {
        //console.log(this.saveData)
        return;
        const data = localStorage.getItem('projectRTS_game_data');
        if (data) {
            this.saveData = JSON.parse(data);
            console.log('게임 데이터 불러오기 완료');
        }else{
            console.log('저장된 게임 데이터가 없습니다. 기본값 사용');
        }
    },
    reset(){
        const resetData = {
            house:0,
            pop:[], //0 아기 1 남자 2여자 (?)
            labor:0,
            ammo:100,
            food:120,
            fuel:20,
            misc:100,
            mapDatas:[],
            ammos:[],
            foods:[],
            miscs:[]
        }
        
       // returnMenpower( 7 , resetData.pop);
        //resetData.manPower = resetData.pop.length;
        this.saveData = {... resetData }
    }
};

export const res0 = {
    house :0,
    labor:0,
    birth:0,
    death:0,
    ammo:0,
    misc:0,
    food:0,
    fuel:0,
    pop:[],
    miscs:[],
    foods:[],
}


export function addMenpower(num=1, array = null){
    const names = ['Kim' ,'John', 'Johan', 'Betty', 'Rose', 'Henderson', 'Park', 'Lee', 'Abdule', 'Franc'];
    const a = array ?? [];
    for(let i = 0 ;i < num; i++){
        a.push( { tag: names[Phaser.Math.Between(0,names.length-1)] ,
                 type:Phaser.Math.Between(1,2), 
                 hunger: Phaser.Math.Between(2,4), 
                 thirst:4,
                 age:Phaser.Math.Between(18,36),
                 work:''
            } );
    }
    return a;
}
/**
 * 범용 TSV 텍스트 파서 함수
 * @param {string} tsvText - load.text로 불러온 TSV 원본 문자열
 * @param {string} keyField - 객체의 룩업 키로 사용할 컬럼명 (기본값: 'name' 또는 'id')
 * @returns {Object} 파싱된 데이터 맵 객체
 */
export function parseTSVToMap(tsvText, keyField = 'tag') {
    const lines = tsvText.trim().split('\n');
    if (lines.length === 0) return {};

    // 1. 첫 번째 줄(헤더) 분리
    const headers = lines[0].split('\t').map(h => h.trim());
    const dataMap = {};

    // 2. 두 번째 줄부터 데이터 행 순회
    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (!currentLine) continue;

        const values = currentLine.split('\t').map(v => v.trim());
        const itemObj = {};

        headers.forEach((header, index) => {
            let val = values[index];

            // 1. 빈 값이거나 존재하지 않는 셀인 경우 null 처리
            if (val === undefined || val === '') {
                itemObj[header] = null;
            } 
            // 2. Boolean 변환
            else if (val === 'TRUE' || val === 'true') {
                itemObj[header] = true;
            } else if (val === 'FALSE' || val === 'false') {
                itemObj[header] = false;
            } 
            // 3. Number 변환
            else if (!isNaN(val)) {
                itemObj[header] = Number(val);
            } 
            // 4. 일반 문자열
            else {
                itemObj[header] = val;
            }
        });

        // 지정한 keyField 값을 키로 사용하여 매핑
        const mapKey = itemObj[keyField];
        if (mapKey !== undefined) {
            dataMap[mapKey] = itemObj;
        }
    }

    return dataMap;
}
/**
 * 
 * @param {string} key - TERRAIN_TYPES.tag
 * @returns 
 */
export function createTileData(key , r, q ){
    const data = { ... Object.values(TERRAIN_TYPES).find(t => t.tag === key) || TERRAIN_TYPES.EMPTY };
    
    const facilityList = [];

    data.rad = Phaser.Math.Between(2,5);
    data.r = r;
    data.q = q;
    data.explored = GameOptions.config.debugMode;
    data.team = 0;
    data.res = objectCopy(res0);
    data.res.foods = [];
    data.res.foods =[];
    data.res.miscs=[];
    data.res.pop = [];

    if(key=='vil'){
        if(Math.random()< 0.4)  facilityList.push( createFacilityData( 'apartment'))
        if(Math.random()< 0.4)  facilityList.push( createFacilityData( 'apartment'))
        if(Math.random()< 0.3)  facilityList.push( createFacilityData( 'boardingHouse'));
        if(Math.random()< 0.5)  facilityList.push( createFacilityData('carScrap'));
        
        if(Math.random()< 0.9)  facilityList.push( createFacilityData( 'junkMine'));
    }
    if(key=='field'){
        if(Math.random()< 0.23)  facilityList.push( createFacilityData('carScrap'));
        if(Math.random()< 0.4)  facilityList.push( createFacilityData('redwood' ,{ maxAmount:100} ) );
        
        
    }

    if(key=='redwood' || key=='mountain'){
        facilityList.push( createFacilityData( 'redwood') );

    }
    if(key=='water'){
        facilityList.push( createFacilityData( 'water',{rad:data.rad}) );
    }

    data.facility = facilityList;
    data.garrison = [];
    
    return data;
}   
/**
 * 지정한 시설 키(Key)의 데이터 복사본 객체를 반환하는 팩토리 함수
 * @param {string} facilityKey - 예: 'GasTank', 'JunkMine' 등
 * @returns {Object|null} 독립된 속성을 가진 시설 데이터 객체
 */
export function createFacilityData(facilityKey, option={}) {
    //console.log(GameData.facilities.gasTank.amount); // 500
    const template = GameData.facilities[facilityKey];
    if (!template) {
        console.warn(`[Facility] 존재하지 않는 시설 타입입니다: ${facilityKey}`);
        return null;
    }
    //특정 랜덤값 계산
    const data = { ...template };
    //uuid = Phaser.Math.RND.uuid();
    data.id = 'facility_' + Math.random().toString(36).substring(2, 10);
    //console.log(data.id)

    data.buildTime = 0;
    if(data.status =='building'){
        data.amount = data.amount? 0 : null;
        
    }
    if(data.status==null) data.status='';
    if(data.type =='house'){
        //집 공간 랜덤값
        if(data.maxAmount !=null){
            if(data.amount< data.maxAmount){
                data.maxAmount = Phaser.Math.Between( data.amount, data.maxAmount);
            }
            
            if(data.maxAmount>0){
                if(data.amount< data.maxAmount){
                    data.pop = addMenpower( Phaser.Math.Between( 0, data.maxAmount) );
                }else{
                    data.pop = addMenpower( data.amount);
                }
                
            }else{
                data.pop = [];
            }
            data.amount = data.pop.length;            
            //console.log(data.pop);
        }
    }
    /*
    if(data.type=='farm'){
        data.turnEnd = ()=>{
           // console.log(`farm ${data.tag} : ` );
            return data;
        }
        
    }*/
    if(data.type=='facility' ||data.type=='farm' ){
        switch( data.tag){
            case 'radCleaner':
                data.workList =[{tag:'radCleaning',amount:0, maxAmount:10,min:1,max:1, repeat:-1}]  ;
                data.work = {... data.workList[0]}
            break;

            case 'mouseFarm':
                data.workList =[{tag:'mouse',amount:0, maxAmount:4, min:3,max:4, repeat:0},
                                 {tag:'rat',amount:0, maxAmount:5, min:4,max:7, repeat:0}]  ;
                data.work = {... data.workList[0]}
            break;
            case 'yard':
                data.workList =[{tag:'wheat',amount:0, maxAmount:70, min:6,max:8, repeat:0}, 
                                {tag:'corn',amount:0, maxAmount:55,min:4,max:7, repeat:0}, 
                                {tag:'cabbage',amount:0, maxAmount:40,min:7,max:12, repeat:0}]  ;
                data.work = {... data.workList[0]}
            break;
            default:
                data.turnEnd = ()=>{
                    console.log(`facility ${data.tag} : ` );
                    return data;
                }
            break;
        }
        
    }
    if(data.cost!=null){
        const cost = data.cost.split(',');
        let spent ={};
        for(let i =0 ; i< cost.length ; i++){
            if(cost[i].length>0){
                const value = cost[i].split(':');
                spent[value[0]] = Number(value[1])
            }
            
        }
        data.cost = spent;
    }
    if(data.output!=null){
        const split = data.output.split(",");
        let _output = [];
        for(let i =0 ; i<split.length ;i++){
            if(split[i].length>0){
                //ex) mouse:2-8-0.3  => getItem /  Between()
                const item = split[i].split(':');
                const num = item[1].split('-');
                const min = Number(num[0]) ?? 1;  //min 2 ?? 1
                const max = Number(num[1]) ?? min; //max 8 ?? min
                const per = num[2] ?? 1 // percentage% or 100%
                _output.push( {tag:String(item[0]), min:min,max:max, percentage:per });
            }else{

            }
        }
        data.output = _output;
    }else{
        data.output = [];
    }

    if(data.isWorkable){
        data.maxLaborBackup = Number(data.maxLabor);
    }
    

    //option
    Object.keys(option).forEach((item) => {
        data[item] = option[item];
    });


    if(data.type=='resource'){
        //광산 자원 랜덤값
        data.amount = Phaser.Math.Between( 0, data.maxAmount);
    }

    return data
}

export function getItem(tag, num , option={}){
    const template = GameData.items[tag] //{tag:tag, num:num}
    if (!template) {
         console.warn(`[Items] 존재하지 않는 아이템입니다: ${tag}`);
        return null;
    }
    const item = { ...template };
    item.num = Phaser.Math.Clamp( num,1,100);

    if(item.freshDay!=null){
        if(item.freshDay>20){
            item.fresh='perm';
        }else{
            item.fresh = 'fresh'
        }
    }
    return item;
}
