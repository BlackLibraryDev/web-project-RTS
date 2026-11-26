import { TERRAIN_TYPES } from "../HexTile.js";
import { objectCopy} from "./calculateTurn.js";
import { createFacilityData } from "./facilities.js";
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
            miscs:[],
            foodRestric:3,
            waterRestric:3,
            storageID:'',
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
// 실제 세이브 파일(JSON)에 저장될 순수 데이터 객체
export const storageData = {};

// 창고 데이터 접근 및 조작 유틸리티
export const resData = {
    // 1. storageID가 없으면 기본 구조 생성 후 반환, 있으면 기존 객체 참조 반환
    foodSpoiled(){
        Object.keys(storageData).forEach((storageID) => {
            const target= resData.getItems(storageID);
            if(target.foods !=null && Array.isArray(target.foods)){
                for (let i = target.foods.length - 1; i >= 0; i--) {
                    if(target.foods[i].freshDay!=null) target.foods[i].freshDay--;
                    if(target.foods[i].freshDay<0){
                        target.foods[i].num=0;
                    }
                    if ((Number(target.foods[i].num) || 0) <= 0) {
                        target.foods.splice(i, 1);
                    }
                }
            }
             if(target.miscs !=null && Array.isArray(target.miscs)){
                for (let i = target.miscs.length - 1; i >= 0; i--) {
                    if ((Number(target.miscs[i].num) || 0) <= 0) {
                        target.miscs.splice(i, 1);
                    }
                }
             }
        });
    },
    getRes(storageID) {
        if (!storageID) return null;

        if (!storageData[storageID]) {
            storageData[storageID] = {
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
            };
        }
        return storageData[storageID];
    },
    setRes(storageID, type, value) {
        const target = this.getRes(storageID);
        if (!target) return;

        target[type] ??= 0;
        target[type] += value;
    },

    // 2. 식량 추가 (앞서 만드신 freshDay 구분 pushItems 연동)
    addFoods(storageID, item) {
        const target = this.getRes(storageID);
        if (target) {
            pushItems(target.foods, item);
        }
    },

    // 3. 일반 아이템/기타 자원 추가
    addMiscs(storageID, item) {
        const target = this.getRes(storageID);
        if (target) {
            pushItems(target.miscs, item);
        }
    },
    addItems(storageID, item){
        if(item.type=='foods'){
            this.addFoods( storageID, item); 
            return;
        } 
        if(item.type=='miscs') {
            this.addMiscs(storageID, item);
            return;
        }
        const target = this.getRes(storageID)[type];
        if(target) target += item;

    },

    // 4. 특정 storageID의 전체 아이템 목록 조회
    getItems(storageID) {
        const target = this.getRes(storageID);
        return {
            foods: target.foods,
            miscs: target.miscs
        };
    },
    /**
     * 요구 자원(costs)이 창고에 모두 충분히 있는지 검사합니다.
     * @param {string} storageID - 대상 창고 ID
     * @param {Object} costs - 예: { wood: 10, stone: 5 } 또는 { items: [{ tag: 'iron', num: 2 }] }
     * @returns {boolean} 모든 자원이 충분하면 true, 하나라도 부족하면 false
     */
    hasRes(storageID, costs) {
        if (!costs) return true;
        const target = this.getRes(storageID);
        if (!target) return false;

        for (const [key, need] of Object.entries(costs)) {
            // 1. 배열형 아이템 목록 검사 (예: costs.items = [{ tag: 'iron', num: 2 }])
            if (key === 'items' && Array.isArray(need)) {
                for (const reqItem of need) {
                    const reqNum = Number(reqItem.num) || 0;
                    if (reqNum <= 0) continue;

                    // foods와 miscs 배열에서 해당 tag의 총합 계산 (freshDay가 나뉘어 있을 수 있으므로 합산)
                    const totalOwned = [...target.foods, ...target.miscs]
                        .filter(el => el.tag === reqItem.tag)
                        .reduce((sum, el) => sum + (Number(el.num) || 0), 0);

                    if (totalOwned < reqNum) return false;
                }
                continue;
            }

            // 2. 일반 숫자형 자원 검사 (wood, stone 등)
            const required = Number(need) || 0;
            if (required <= 0) continue;

            const current = Number(target[key]) || 0;
            if (current < required) return false;
        }

        return true;
    },
    hasAnyTypes(storageID, subType, n=1){
        const reqCount = Number(n) || 0;
        if (reqCount <= 0) return true;
         const target = this.getRes(storageID);
        if (!target || !Array.isArray(target.foods)) return false;
        target.foods.sort((a, b) => (a.freshDay ?? Infinity) - (b.freshDay ?? Infinity));
        let totalAvailable = 0;
        for (const food of target.foods) {
            const count = Number(food.num) || 0;
            if (count <= 0) continue;
            if (food.subType != subType) continue;
            
            totalAvailable += count;

            // 목표 수량(n)에 도달하면 끝까지 순회하지 않고 즉시 true 반환
            if (totalAvailable >= reqCount) {
                return true;
            }
        }

    },

    consumeAnyTypes(storageID, subType, n=1){
        const reqCount = Number(n) || 0;
        if (reqCount <= 0) return;
         const target = this.getRes(storageID);
        if (!target || !Array.isArray(target.foods)) return;
        target.foods.sort((a, b) => (a.freshDay ?? Infinity) - (b.freshDay ?? Infinity));
         let totalAvailable = 0;
         let array = []
         
        for (const food of target.foods) {
            const count = Number(food.num) || 0;
            if (count <= 0) continue;
            if (food.subType != subType) continue;
            totalAvailable += count;
            // 목표 수량(n)에 도달하면 끝까지 순회하지 않고 즉시 true 반환
            if (totalAvailable >= reqCount) {
                totalAvailable = reqCount;
                break;
            }
        }
        if (totalAvailable >= reqCount) {
           // console.table( resData.getItems(storageID).foods)
            //console.log(array, totalAvailable)
            while(totalAvailable>0){
                for( const food of target.foods){
                    if(food.num>0){
                        food.num--;
                        totalAvailable--;
                    }
                }
                if(totalAvailable<=0) break;
            }
            //console.table( resData.getItems(storageID).foods)
            for (let i = target.foods.length - 1; i >= 0; i--) {
                if ((Number(target.foods[i].num) || 0) <= 0) {
                    target.foods.splice(i, 1);
                }
            }
        }
        
    },
   /**
     * 해당 창고(storageID)에 사용 가능한 식량이 n개 이상 있는지 검사합니다.
     * @param {string} storageID - 대상 창고 ID
     * @param {number} n - 필요한 최소 총 식량 수량 (기본값: 1)
     * @param {boolean} excludeSpoiled - 이미 상한 음식(freshDay <= 0) 제외 여부 (기본값: true)
     * @returns {boolean} 총 식량 수량이 n개 이상이면 true, 부족하면 false
     */
    hasAnyFoods(storageID, n = 1, excludeSpoiled = true) {
        const reqCount = Number(n) || 0;
        if (reqCount <= 0) return true;

        const target = this.getRes(storageID);
        if (!target || !Array.isArray(target.foods)) return false;

        let totalAvailable = 0;

        for (const food of target.foods) {
            const count = Number(food.num) || 0;
            if (count <= 0) continue;
            if (excludeSpoiled && (food.freshDay ?? Infinity) <= 0) continue;

            totalAvailable += count;

            // 목표 수량(n)에 도달하면 끝까지 순회하지 않고 즉시 true 반환
            if (totalAvailable >= reqCount) {
                return true;
            }
        }

        return false;
    },

    /**
     * 유통기한(freshDay)이 임박한 식량부터 우선 차감합니다.
     * 보유 총량이 요청 수량(amount)보다 부족하면 차감하지 않고 false를 반환합니다.
     * @param {string} storageID - 대상 창고 ID
     * @param {number} amount - 차감할 식량 수량 (기본값: 1)
     * @param {boolean} excludeSpoiled - 이미 상한 음식(freshDay <= 0) 제외 여부 (기본값: true)
     * @returns {boolean} 차감 성공 시 true, 식량 부족 시 false
     */
    consumeFoods(storageID, amount = 1, excludeSpoiled = true) {
        const reqAmount = Number(amount) || 0;
        if (reqAmount <= 0) return true;

        const target = this.getRes(storageID);
        if (!target || !Array.isArray(target.foods)) return false;

        // 1. 먹을 수 있는 식량 필터링 및 전체 보유 수량 사전 계산
        const validFoods = target.foods.filter(food => {
            const count = Number(food.num) || 0;
            if (count <= 0) return false;
            if (excludeSpoiled && (food.freshDay ?? Infinity) <= 0) return false;
            return true;
        });

        const totalAvailable = validFoods.reduce((sum, food) => sum + (Number(food.num) || 0), 0);

        // 2. 총량이 부족하면 기존 배열을 건드리지 않고 즉시 false 반환
        if (totalAvailable < reqAmount) {
            return false;
        }

        // 3. 유통기한(freshDay) 오름차순 정렬 (가장 빨리 상하는 식량부터 소모)
        // freshDay가 없는 통조림/건조식품류는 Infinity로 취급해 가장 나중에 소모
        target.foods.sort((a, b) => (a.freshDay ?? Infinity) - (b.freshDay ?? Infinity));

        // 4. 임박한 순서대로 차감 진행
        let remainToConsume = reqAmount;
        for (let i = 0; i < target.foods.length && remainToConsume > 0; i++) {
            const food = target.foods[i];
            const count = Number(food.num) || 0;
            if (count <= 0) continue;
            if (excludeSpoiled && (food.freshDay ?? Infinity) <= 0) continue;

            const take = Math.min(count, remainToConsume);
            food.num -= take;
            remainToConsume -= take;
        }

        // 5. 수량이 0이 된 빈 식량 스택 정리
        for (let i = target.foods.length - 1; i >= 0; i--) {
            if ((Number(target.foods[i].num) || 0) <= 0) {
                target.foods.splice(i, 1);
            }
        }

        return true;
    },


    /**
     * 자원이 충분한지 검사한 뒤, 모두 충족될 때만 안전하게 일괄 차감합니다.
     * @param {string} storageID - 대상 창고 ID
     * @param {Object} costs - 차감할 자원 객체
     * @returns {boolean} 차감 성공 시 true, 잔량 부족으로 실패 시 false
     */
    consumeRes(storageID, costs) {
        // 1. 사전 전수 검사 (하나라도 부족하면 아무것도 건드리지 않고 즉시 false 반환)
        if (!this.hasRes(storageID, costs)) {
            return false;
        }

        if (!costs) return true;
        const target = this.getRes(storageID);

        // 2. 검증 완료 후 일괄 차감 실행
        for (const [key, need] of Object.entries(costs)) {
            // 배열형 아이템 차감 (freshDay가 낮은 순으로 우선 차감)
            if (key === 'items' && Array.isArray(need)) {
                for (const reqItem of need) {
                    let remainToDeduct = Number(reqItem.num) || 0;
                    if (remainToDeduct <= 0) continue;

                    // foods 먼저 유통기한 임박순 정렬 후 차감, 부족분은 miscs에서 차감
                    const deductFromPool = (pool) => {
                        pool.sort((a, b) => (a.freshDay ?? Infinity) - (b.freshDay ?? Infinity));
                        for (let i = pool.length - 1; i >= 0; i--) {
                            if (remainToDeduct <= 0) break;
                            // 정방향 차감을 위해 인덱스 보정
                        }
                        for (let i = 0; i < pool.length && remainToDeduct > 0; i++) {
                            if (pool[i].tag !== reqItem.tag) continue;
                            const take = Math.min(pool[i].num, remainToDeduct);
                            pool[i].num -= take;
                            remainToDeduct -= take;
                        }
                        // 수량이 0이 된 스택 정리
                        for (let i = pool.length - 1; i >= 0; i--) {
                            if (pool[i].num <= 0) pool.splice(i, 1);
                        }
                    };

                    deductFromPool(target.foods);
                    if (remainToDeduct > 0) deductFromPool(target.miscs);
                }
                continue;
            }

            // 일반 숫자형 자원 차감
            const required = Number(need) || 0;
            if (required > 0) {
                target[key] = Math.max(0, (target[key] ?? 0) - required);
            }
        }

        return true;
    }
};
export function pushItems(array, incoming) {
    // 배열이 통째로 들어온 경우 재귀 처리
    if (Array.isArray(incoming)) {
        incoming.forEach(item => pushItems(array, item));
        return array;
    }

    if (!incoming || !incoming.tag) return array;

    // 1. 합칠 수 있는 기존 항목 탐색
    const existing = array.find(el => {
        // 기본 조건: tag가 다르면 다른 아이템
        if (el.tag !== incoming.tag) return false;

        // 특수 조건: 둘 다 'foods' 타입일 경우 freshDay까지 같아야 같은 스택으로 취급
        if (incoming.type === 'foods' || el.type === 'foods') {
            return el.freshDay === incoming.freshDay;
        }
        // 그 외 일반 아이템은 tag만 같으면 합산 대상
        return true;
    });

    // 2. 기존 항목이 있으면 수량 합산, 없으면 복제하여 새로 추가
    if (existing) {
        existing.num = (Number(existing.num) || 0) + (Number(incoming.num) || 0);
    } else {
        array.push({
            ...incoming,
            num: Number(incoming.num) || 0
        });
    }

    return array;
}


export function addMenpower(num=1, array = null){
    const names = ['Kim' ,'John', 'Johan', 'Betty', 'Rose', 'Henderson', 'Park', 'Lee', 'Abdule', 'Franc'];
    const a = array ?? [];
    for(let i = 0 ;i < num; i++){
        a.push( { tag: names[Phaser.Math.Between(0,names.length-1)] ,
                 type:Phaser.Math.Between(1,2), 
                 hunger: Phaser.Math.Between(2,4), 
                 thirst:4,
                 happy:0,
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
    data.storageID = 'storageID_' + Math.random().toString(36).substring(2, 10);
    data.res = objectCopy(res0);
    data.res.foods = [];
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
