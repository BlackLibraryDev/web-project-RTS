import { GameData, addMenpower, getItem , res0 } from "./data.js";

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

export function returnMapData(scene){
    const res=[[],[],[]] ;
     for(let r = 0; r < scene.mapDatas.length; r++) {
        for(let q = 0; q < scene.mapDatas[r].length; q++) {
            const mapdata = scene.mapDatas[r][q];
           res[mapdata.team].push( mapdata ); 
        }
    }
    return res;
}

export function calculateResourceData(scene, isTurnEnd=false){
    //자원 총합 계산
    const data = GameData.saveData;

    
    const res = [objectCopy(res0) , objectCopy(res0), objectCopy(res0) ] ;
    const delta = [
                    {miscs:[], foods:[], pop:[], food:0, labor:0} ,
                    {miscs:[], foods:[], pop:[], food:0, labor:0} ,
                    {miscs:[], foods:[], pop:[], food:0, labor:0} 
                ] ;


    res[1].foods = data.foods;
    res[1].miscs = data.miscs;

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
            for(let i = 0; i < facility.length ; i++){
                const facil = facility[i];
                
                facil.radDebuf = (10-mapdata.rad)/10;

                if(facil.type=='house'){
                    //집 계산
                    res[team].house += facil.maxAmount;
                    for(let n =0 ; n< facil.pop.length ; n++){
                        const person = facil.pop[n];
                        if(person.hunger<0){
                            
                        }else{
                            facil.pop[n].work = '';
                            delta[team].pop.push(facil.pop[n]);
                             workers.push( facil.pop[n]);

                             tileRes.labor++;
                             tileRes.pop.push( facil.pop[n]);
                        }
                        
                    }
                    facil.amount = facil.pop.length;
                    tileRes.house += facil.maxAmount;
                    //delta[team].pop = delta[team].pop.concat( facil.pop );
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
                            res[team].labor++;
                            tileRes.labor--;
                            assignedInRound = true; // 이번 바퀴에 최소 1명 배정 성공 -> 다음 바퀴 계속 진행
                        }
                    }
                }
            }
             
            /*
            
            for(let i = 0; i < facility.length ; i++){
                const facil = facility[i];
                facil.labor = 0;

                if(facil.isWorkable ){
                    for(let n = 0 ; n< workers.length ; n++){
                        if(facil.labor< facil.maxLabor){
                            if(workers[n].work ==''){
                                workers[n].work = facil.tag;
                                facil.labor++;
                                res[team].labor++;
                                tileRes.labor--;
                            }
                        }
                    }
                    
                }
                
            }
            */

            
           // if(team==1) console.table(workers)
        }
    }
    data.house = res[1].house;
    data.pop = delta[1].pop; //얕은참조
    data.labor = data.pop.length - res[1].labor;
     /*
    for(let r = 0; r < scene.mapDatas.length; r++) {
        for(let q = 0; q < scene.mapDatas[r].length; q++) {
            const mapdata = scene.mapDatas[r][q];
            const facility = mapdata.facility;
            //const garrison = mapdata.garrison;
            //const team = mapdata.team;
            for(let i = 0; i < facility.length ; i++){
                const facil = facility[i];

                if(facil.type=='resource'){
                //자원의 경우
                }
            }
            
        }
    }*/
    const consumeFood = (array, amount=1)=>{
        for(let n = 0; n<array.length ; n++){
            const item = array[n];
            
            if(item.num - amount >= 0) {
                item.num-= amount;
                if(item.num<=0){
                    array.splice(n,1);
                    n--;
                }
                return true;
                break;
            }
            
        }
        return false;
    }
    //console.warn( res );
    if(isTurnEnd){
        //턴 종료의 경우
        
        for(let r = 0; r < scene.mapDatas.length; r++) {
            for(let q = 0; q < scene.mapDatas[r].length; q++) {
                const mapdata = scene.mapDatas[r][q];
                const facility = mapdata.facility;
                //const garrison = mapdata.garrison;
                const team = mapdata.team;
                const tileRes = mapdata.res;

                for(let i = 0; i < facility.length ; i++){
                    const facil = facility[i];

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
                                pushItems(delta[team][item.type], item );
                                //각 타일에 아이템 넣기...
                                pushItems( tileRes[item.type], item );
                                
                                
                            }
                        }
                    }
                    let laborToken = true;
                    if(facil.status == '' && facil.amount==0){
                        if(facil.work !=null && facil.labor>0){
                            //작업리스트가 있는 경우
                            const work = facil.work;
                            if(work.amount==0 && work.consume !=null){
                                //재료소모가 있는 경우
                                const array = work.consume[work.tag](tileRes);
                                if(array !=null && array.length>0){
                                
                                    facil.output = [{tag:work.tag, min:array[0].num, max:array[0].num,percentage:1 } ]
                                    facil.amount =0;
                                    facil.maxAmount = array[0].num;

                                    work.amount++
                                    laborToken=false;
                                }

                            }else{

                                 if(work.amount>= work.maxAmount){
                                    //
                                    //console.log(`work complete : ${work.tag}`);
                                    facil.output = [{tag:work.tag, min:work.min, max:work.max,percentage:1 } ];
                                    facil.amount= facil.maxAmount;

                                    //pushItem(facil); 

                                    if(work.repeat==0){
                                        //작업종료
                                        facil.work = null;
                                    }else{
                                        work.amount = 0;
                                        //-1은 무한반복, 
                                        if(work.repeat>0) {
                                            work.repeat--;
                                        }
                                        
                                    }
                                    
                                }else{
                                    work.amount++;
                                    laborToken=false;
                                }
                                
                                
                            }

                            
                           
                        }
                        
                        /*
                        if(facil.type=='facility'){
                           // console.log(mapdata)
                            switch(facil.tag){
                                case 'radCleaner':
                                    
                                break;
                                default:
                                    
                                break;
                            }
                        } */
                    }

                    
                    if(facil.status=='building'){
                        laborToken=false;
                        facil.buildTime += facil.labor;
                        if(facil.buildTime >= facil.maxBuildTime){
                            facil.status = '';
                            facil.amount = 0;
                            if(facil.type=='house'){
                                facil.isWorkable=false;
                            }
                        }
                    }

                    //시설 파괴
                    
                    if(facil.status =='' && facil.amount<=0){

                        if(facil.type =='resource'){
                            facil.status = 'demolition';
                            //자원 소진 시 삭제하기
                        }

                        if(facil.tag == 'radCleaner'){
                            if(mapdata.rad >2){
                                mapdata.rad--;
                                facil.status = 'demolition';
                            }
                        }
                        
                        
                    }


                    if(laborToken ){
                        //식량 추가
                            
                        for(let n = 0; n< facil.labor ; n++){
                            //노동자 수 만큼 자원획득
                            if(facil.amount>0){
                                pushItem(facil);     
                                if(facil.work ==null){
                                                                    
                                }else{
                                        
                                }
                                
                            }else{
                                
                            }
                        }
                        
                    }

                    if(facil.status=='demolition'){
                        facil.amount -= facil.labor;
                        if(facil.amount <=0){
                            facil.status = '';
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
                const tileRes = mapdata.res;
                tileRes.foods.sort( (a,b) => a.freshDay - b.freshDay) ;//신선도 순으로 정렬

                for(let i = 0; i < facility.length ; i++){
                    const facil = facility[i];
                    
                    if(facil.type=='house'){
                        facil.pop.sort((a, b) => a.hunger - b.hunger); //배고픔 순으로 정렬
                        for(let n =0 ; n< facil.pop.length ; n++){
                            const person = facil.pop[n];
                            if(person.hunger>=0){
                                if(consumeFood( tileRes.foods, 1)){
                                    //음식섭취
                                    if(person.hunger<5) person.hunger++;
                                    delta[team].food--;
                                }else{
                                    if(team ==1){
                                        //테스트용, 
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
                for(let i =0 ;i < tileRes.foods.length ; i++){
                    const item = tileRes.foods[i];
                    item.freshDay--;
                    if(item.freshDay<0){
                        tileRes.foods.splice(i,1);
                        i--;
                    }
                }
                
            }
        }
        
    //console.table(res[1].foods);

        //턴 종료
    }

    return delta;
    //GameData.save();
}
