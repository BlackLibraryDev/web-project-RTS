import { addMenpower, GameData, getItem, resData } from "./data.js";

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
    if(data.state =='building'){
        data.amount = data.amount? 0 : null;
        
    }
    if(data.state==null) data.state='active';
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
                data.workList =[{tag:'mouse',amount:0, maxAmount:4, min:5,max:8, repeat:-1},
                                 {tag:'rat',amount:0, maxAmount:5, min:6,max:10, repeat:-1}]  ;
                data.work = {... data.workList[0]}
            break;
            case 'yard':
                data.workList =[{tag:'wheat',amount:0, maxAmount:70, min:6,max:8, repeat:-1}, 
                                {tag:'corn',amount:0, maxAmount:55,min:4,max:7, repeat:-1}, 
                                {tag:'cabbage',amount:0, maxAmount:40,min:7,max:12, repeat:-1}]  ;
                data.work = {... data.workList[0]}
            break;

            case 'bucher':
                data.workList =[{tag:'jerky',amount:0, maxAmount:12, min:10,max:10, repeat:-1}]  ;
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
// ============================================================================
// 타입별 전용 핸들러 맵 (새로운 type이 추가되면 여기에 키만 추가하면 됨)
// ============================================================================
const FACILITY_HANDLERS = {
    // 1. 주거 시설: 팀의 총 수용 한도 증가
    house(facil, storageID) {
        const capacity = Number(facil.capacity || facil.house) || 0;
       // storageID.house = (Number(storageID.house) || 0) + capacity;
    },

    // 2. 자원 채취 시설: 매 턴 자원 생산
    resource(facil, storageID) {
        const res = resData.getRes(storageID);
        const activeLabor = Number(facil.labor) || 0;
        if (activeLabor <= 0 || !facil.resource) return;

        // 예: 배치된 일꾼 1명당 기본 생산량만큼 채취 facil.outputPerLabor = null ? 
        const yieldAmount = (Number(facil.outputPerLabor) || 1) * activeLabor;
         if(facil.labor>0 ){
            const outputs = FACILITY_HANDLERS.getOutputs( facil, storageID);
            return outputs;

         }
    },

    // 3. 농장 시설: worklist 진행 후 완료 시 수확물 획득
    farm(facil, storageID) {
        if(facil.labor>0 ){
            FACILITY_HANDLERS.working(facil);
            const outputs = FACILITY_HANDLERS.getOutputs( facil, storageID);
            return outputs;

         }
    },

    // 4. 공방/공장 시설: 자원 소모하며 worklist 진행 후 완료 시 결과물 획득
    facility(facil, storageID) {
        
        if(facil.labor>0){
            
            if(facil.amount>0 ){
                const outputs = FACILITY_HANDLERS.getOutputs( facil, storageID);
                return outputs;

            }else{
                if(facil.work !=null){
                    let action = true;
                    const handler = FACILITY_HANDLERS[facil.work.tag];
                    if(handler){
                        action = handler(facil, storageID);
                    }
                    if(action){
                        FACILITY_HANDLERS.working(facil);
                    }  
                }
            }
        }
    },
    jerky(facil, storageID){
        //data.work = {tag:'jerky',amount:0, maxAmount:10,min:5,max:5, repeat:-1}
        const res = resData.getRes(storageID);
        const work = facil.work;
        
        if(work.amount==0){
            //작업 시작 시 자원 검증
            const bool = resData.hasAnyTypes(storageID, 'meat', facil.work.max);
            
            if(bool){
                facil.maxAmount = facil.work.max;
                resData.consumeAnyTypes(storageID, 'meat', facil.work.max);
                return true;
            }else{
                //자원이 없는 경우
                
                return false;
            }
        }

        return true;
    },
    working(facil){
        if(facil.amount>0) return;
        const work = facil.work;

        if(work!=null ){
            if(work.amount < work.maxAmount){
                work.amount++;
            }else{
                facil.amount = facil.maxAmount;
                facil.output = [{tag:work.tag, min:work.min, max:work.max, percentage:1 } ];
                work.amount =0;
                if(work.repeat>0) work.repeat--;
                if(work.repeat==0){
                    work = null;
                }
            }
            
        }
        

    },
    getOutputs(facil, storageID){
        const array = [];
        for(let f = 0 ; f < facil.output.length ; f++){
            const d = facil.output[f];
            if(Math.random() <= d.percentage){
                const radDebuf = d.min==d.max? 1 :  ( facil.radDebuf ?? 1);
                let num0 = Phaser.Math.Between(d.min, d.max );
                facil.amount -= num0;
                if(facil.amount<0){
                    num0+= facil.amount;
                    facil.amount = 0;
                }

                const num = Math.ceil(num0*radDebuf);
                const item = getItem(d.tag, num);
                array.push( item );
                resData.addItems( storageID, item)
            }
        }
        return array;
    }
};

/**
 * 외부에서 호출하는 단일 진입점 함수
 */
export function processFacilityTurn(facil, storageID) {
    if (!facil || facil.state !== 'active') return; // 완공(가동) 상태인 시설만 처리
    const handler = FACILITY_HANDLERS[facil.type];
    if (handler) {
       handler(facil, storageID);
    }
    
}