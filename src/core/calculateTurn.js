import { GameData, addMenpower, getItem , pushItems, res0, resData } from "./data.js";
import { processFacilityTurn } from "./facilities.js";

export function objectCopy( object ){
    // 방법 A: 전개 연산자 (...) 사용
    //array.push({ ...Facility.GasTank });
    // 방법 B: Object.assign() 사용
    return { ... object}
   // return Object.assign({}, object);
}
/**
 * 배열에 아이템을 추가합니다.
 * - tag가 같더라도 type이 'foods'이고 freshDay가 다르면 별도 항목으로 추가
 * - 그 외(tag가 같고, foods가 아니거나 freshDay가 같은 경우)에는 num만 합산
 */


export function returnMapData(scene){
    const playerRes = resData.getRes( GameData.saveData.storageID);

    return playerRes;
}
export function calResourceData(scene, isTurnEnd=false){
    const data = GameData.saveData;

    
   // processFacilityTurn(facil, teamRes);

    //주석처리
    return;
}

export function calculateResourceData(scene, isTurnEnd=false){
    //자원 총합 계산
    const data = GameData.saveData;
    const playerRes = resData.getRes( data.storageID);

    const delta ={...res0};
    delta.pop = [];
    delta.foods=[];
    delta.miscs=[];

    //사실 resData의 모든 값을 초기화해야함... 
    playerRes.house =0;
    playerRes.labor =0;
    playerRes.pop = [];

    for(let r = 0; r < scene.mapDatas.length; r++) {
        for(let q = 0; q < scene.mapDatas[r].length; q++) {
            const mapdata = scene.mapDatas[r][q];
            const facility = mapdata.facility;
            const garrison = mapdata.garrison;
            const team = mapdata.team;
            const tileRes = mapdata.res;

            const workers = [];
            tileRes.labor=0;
            tileRes.house = 0;
            tileRes.pop = [];

            const res = resData.getRes(mapdata.storageID);
           // resData.house = 0;
           //resData.labor =0;

            for(let i = 0; i < facility.length ; i++){
                const facil = facility[i];
                
                facil.radDebuf = (16-mapdata.rad)/16;

                if(facil.type=='house'){
                    //집 계산
                    //res[team].house += facil.maxAmount;
                    res.house+= facil.maxAmount ;
                    for(let n =0 ; n< facil.pop.length ; n++){
                        const person = facil.pop[n];
                        if(person.hunger<0 || person.thirst<0){
                            
                        }else{
                            facil.pop[n].work = '';
                            res.pop.push(facil.pop[n]);
                             workers.push( facil.pop[n]);

                             tileRes.labor++;
                             tileRes.pop.push( facil.pop[n]);
                        }
                        
                    }
                    facil.amount = facil.pop.length;
                    tileRes.house += facil.maxAmount;
                    /////delta[team].pop = delta[team].pop.concat( facil.pop );
                    //console.log(facil.pop)
                }
            }
            //if(team==1) console.table(workers)
            for (let i = 0; i < facility.length; i++) {
                const facil = facility[i];
                if (facil.isWorkable) {
                    facil.labor = 0;
                }
            }
            workers.forEach(w => {
                // 이 타일의 시설에서 일하던 일꾼이라면 상태 초기화 (필요시 조건 추가)
                w.work = ''; 
            });

            // 2. 모든 일터에 1명씩 돌아가며(라운드 로빈) 남은 일꾼이 없을 때까지 배정
            let assignedInRound = true;

            while (assignedInRound) {
                assignedInRound = false;

                for (let i = 0; i < facility.length; i++) {
                    const facil = facility[i];
                    
                    // 가동 가능하고 아직 정원(facil.maxLabor)이 차지 않은 시설만 대상
                    if (facil.isWorkable && facil.labor < facil.maxLabor) {
                        // 유휴 일꾼(work === '') 1명 찾기
                        const idleWorker = workers.find(w => w.work === '');
                        
                        if (idleWorker) {
                            idleWorker.work = facil.tag;
                            facil.labor++;
                            res.labor++;
                            tileRes.labor--;
                            assignedInRound = true; // 이번 바퀴에 최소 1명 배정 성공 -> 다음 바퀴 계속 진행
                        }
                    }
                }
            }

            
           // if(team==1) console.table(workers)
        }
    }
    
    playerRes.house //= res[1].house;
    playerRes.pop   //= delta[1].pop; //얕은참조
    playerRes.labor =  playerRes.pop.length - playerRes.labor;
    
    
    //console.warn( res );
    if(isTurnEnd){
        //턴 종료의 경우
        
        for(let r = 0; r < scene.mapDatas.length; r++) {
            for(let q = 0; q < scene.mapDatas[r].length; q++) {
                const mapdata = scene.mapDatas[r][q];
                const facility = mapdata.facility;
                //const garrison = mapdata.garrison;
                const team = mapdata.team;
                const tileRes = resData.getRes(mapdata.tileRes );

                for(let i = 0; i < facility.length ; i++){
                    const facil = facility[i];
                    /*
                    const pushItem = (facil)=>{
                       
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
                            // pushItems(res[team][item.type], item  );
                                if(team ==1) pushItems(delta[item.type], item );
                                //각 타일에 아이템 넣기...
                               // pushItems( tileRes[item.type], item );

                                resData.addItems( mapdata.storageID, item );
                                //delta에 넣기

                            }
                        }
                    }*/

                    processFacilityTurn(facil, mapdata.storageID );

                    //console.log(outputs)
                    
                    let laborToken = true;
                    
                    
                    if(facil.state=='building'){
                        laborToken=false;
                        facil.buildTime += facil.labor;
                        if(facil.buildTime >= facil.maxBuildTime){
                            facil.state = 'active';
                            facil.amount = 0;
                            if(facil.type=='house'){
                                facil.isWorkable=false;
                            }
                        }
                    }

                    //시설 파괴
                    
                    if(facil.state =='active' && facil.amount<=0){

                        if(facil.type =='resource'){
                            facil.state = 'demolition';
                            //자원 소진 시 삭제하기
                        }

                        if(facil.tag == 'radCleaner'){
                            if(mapdata.rad >2){
                                mapdata.rad--;
                                facil.state = 'demolition';
                            }
                        }
                        
                        
                    }


                    if(facil.state=='demolition'){
                        facil.amount -= facil.labor;
                        if(facil.amount <=0){
                            facil.state = 'active';
                            //파괴
                            facility.splice(i,1);
                            i--;
                        }
                    }

                    
                }
                
            }
        }
        //data.foods = res[1].foods;

        for(let r = 0; r < scene.mapDatas.length; r++) {
            for(let q = 0; q < scene.mapDatas[r].length; q++) {
                const mapdata = scene.mapDatas[r][q];
                const facility = mapdata.facility;
                //const garrison = mapdata.garrison;
                const team = mapdata.team;
                //const tileRes = mapdata.res;
                //const res = resData.getRes(mapdata.storageID);

                //tileRes.foods.sort( (a,b) => a.freshDay - b.freshDay) ;//신선도 순으로 정렬

                for(let i = 0; i < facility.length ; i++){
                    const facil = facility[i];
                    
                    if(facil.type=='house'){
                        facil.pop.sort((a, b) => a.hunger - b.hunger); //배고픔 순으로 정렬
                        for(let n =0 ; n< facil.pop.length ; n++){
                            const person = facil.pop[n];
                            if(person.hunger>=0 ){
                                
                                if(team ==1 ){
                                    if( resData.hasAnyFoods(mapdata.storageID, 1) ){
                                        //
                                        //음식섭취
                                        if(person.hunger<5 && person.hunger< data.foodRestric){
                                            person.hunger++;
                                        }
                                        resData.consumeFoods(mapdata.storageID, 1 );
                                        //if(team ==1)  delta.food--;
                                    }else{
                                        person.hunger--;
                                    
                                    }

                                }
                                
                            }

                        

                            if(person.hunger<0){
                                if(team==1)  console.warn(`${person.tag}(${person.age})가 굶주림으로 사망했습니다/탈주했습니다` );
                                facil.pop.splice(n,1);
                                n--;
                            }
                        }
                        //낮은 확률로 인구추가
                        /*
                        if(facil.pop.length < facil.maxAmount){
                            if(Math.random() < 0.1 && team==1){
                                const person = addMenpower(1);
                                facil.pop.push(person[0]);
                                console.warn(`${person[0].tag}(${person[0].age})가 새로 들어왔습니다` );
                            }
                        }*/
                        facil.amount = facil.pop.length;
                    }
                }
                //아이템 신선도 감소
                
                
            }
        }
        resData.foodSpoiled();
    //console.table(res[1].foods);

        //턴 종료
    }

    return delta;
    //GameData.save();
}
