import { GameData, addMenpower, getItem } from "./data.js";

export function objectCopy( object ){
    // 방법 A: 전개 연산자 (...) 사용
    //array.push({ ...Facility.GasTank });
    // 방법 B: Object.assign() 사용
    return { ... object}
   // return Object.assign({}, object);
}
export function pushItems(array, incoming) {
    // 1. 만약 incoming이 배열 형태로 들어오면 하나씩 재귀 호출하여 처리
    if (Array.isArray(incoming)) {
        incoming.forEach(item => pushItems(array, item));
        return array;
    }

    if (!incoming || !incoming.tag) return array;

    // 2. 기존 배열에서 동일한 tag 탐색
    const existing = array.find(el => el.tag === incoming.tag);

    if (existing) {
        // 기존 항목이 있으면 수량 합산 (숫자형 보장)
        existing.num = (Number(existing.num) || 0) + (Number(incoming.num) || 0);
    } else {
        // ⚠️ 핵심: 원본 객체 오염을 막기 위해 반드시 얕은 복사({ ...incoming })로 삽입!
        array.push({ 
            ...incoming, 
            num: Number(incoming.num) || 0 
        });
    }

    return array;
}
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
            
            const workers = [];
            for(let i = 0; i < facility.length ; i++){
                const facil = facility[i];

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
                            
                            
                        }
                        
                    }
                    facil.amount = facil.pop.length;
                    //delta[team].pop = delta[team].pop.concat( facil.pop );
                    //console.log(facil.pop)
                }
            }
            //if(team==1) console.table(workers)
            
            for(let i = 0; i < facility.length ; i++){
                const facil = facility[i];
                facil.labor = 0;

                if(facil.isWorkable){
                    for(let n = 0 ; n< workers.length ; n++){
                        if(facil.labor< facil.maxLabor){
                            if(workers[n].work ==''){
                                workers[n].work = facil.tag;
                                facil.labor++;
                                res[team].labor++;
                            }
                        }
                    }
                    
                }
                
            }

            
           // if(team==1) console.table(workers)
        }
    }
    data.house = res[1].house;
    data.pop = delta[1].pop; //얕은참조
    data.labor = data.pop.length - res[1].labor;
     
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
    }
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
    
    if(isTurnEnd){
        //턴 종료의 경우
        
        for(let r = 0; r < scene.mapDatas.length; r++) {
            for(let q = 0; q < scene.mapDatas[r].length; q++) {
                const mapdata = scene.mapDatas[r][q];
                const facility = mapdata.facility;
                //const garrison = mapdata.garrison;
                const team = mapdata.team;

                //delta[1].pop.sort((a, b) => a.hunger - b.hunger); //배고픔 순으로 정렬
                //facility.sort((a,b) => b.status.length - a.status.length );

                for(let i = 0; i < facility.length ; i++){
                    const facil = facility[i];
                    if(facil.status == ''){
                       //amount가 꽉 차야 작업시작
                        if(facil.amount>0 ){
                            //식량 추가
                            
                            for(let n = 0; n< facil.labor ; n++){
                                //노동자 수 만큼 자원획득
                                for(let f = 0 ; f < facil.output.length ; f++){
                                    const d = facil.output[f];
                                    //console.log(d)
                                    if(facil.amount>0){
                                        if(Math.random() <= d.percentage){
                                            const item = getItem(d.tag, Phaser.Math.Between(d.min, d.max ));
                                            pushItems(res[team][item.type], item  );
                                            pushItems(delta[team][item.type], item );
                                            facil.amount -= item.num;
                                        }
                                    }else{
                                        
                                    }
                                    
                                    
                                }
                            }
                            
                        }else {
                            if(facil.type=='farm'){
                                facil.buildTime = 0;
                                facil.status = 'building';
                            }
                            facil.amount =0;
                            
                        }
                    }
                        
                        
                    
                    
                    if(facil.status=='building'){
                        facil.buildTime += facil.labor;
                        if(facil.buildTime >= facil.maxBuildTime){
                            facil.status = '';
                            facil.amount = facil.maxAmount
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
        data.foods = res[1].foods;


        //식량소비
        delta[1].pop.sort((a, b) => a.hunger - b.hunger); //배고픔 순으로 정렬
        for(let n = 0 ; n < delta[1].pop.length ; n++){
            const person = delta[1].pop[n];
            if(person.hunger>=0){
                if(consumeFood( data.foods, 1)){
                    //음식섭취
                    if(person.hunger<5) person.hunger++;
                    delta[1].food--;
                }else{
                    person.hunger--;
                }
            }

        }
        for(let r = 0; r < scene.mapDatas.length; r++) {
            for(let q = 0; q < scene.mapDatas[r].length; q++) {
                const mapdata = scene.mapDatas[r][q];
                const facility = mapdata.facility;
                const garrison = mapdata.garrison;
                const team = mapdata.team;
                
                for(let i = 0; i < facility.length ; i++){
                    const facil = facility[i];

                    if(facil.type=='house'){
                        for(let n =0 ; n< facil.pop.length ; n++){
                            const person = facil.pop[n];
                            if(person.hunger<0){
                                if(team==1)  console.warn(`${person.tag}(${person.age})가 굶주림으로 사망했습니다/탈주했습니다` );
                                facil.pop.splice(n,1);
                                n--;
                            }
                        }
                        //낮은 확률로 인구추가
                        if(facil.pop.length < facil.maxAmount){
                            if(Math.random() < 0.1 && team==1){
                                const person = addMenpower(1);
                                facil.pop.push(person[0]);
                                console.warn(`${person[0].tag}(${person[0].age})가 새로 들어왔습니다` );
                            }
                        }
                        facil.amount = facil.pop.length;
                    }
                }
            }
        }
        
    //console.table(res[1].foods);

        //턴 종료
    }

    return delta;

    for(let r = 0; r < scene.mapDatas.length; r++) {
        for(let q = 0; q < scene.mapDatas[r].length; q++) {
            const mapdata = scene.mapDatas[r][q];
            const facility = mapdata.facility;
            const garrison = mapdata.garrison;
            const team = mapdata.team;

            
            const _res  = objectCopy(res0);
            _res.foods = [];
            _res.miscs = [];
            _res.pop = [];

            const consumeFood = (amount)=>{
                for(let n = 0; n<mapdata.foods.length ; n++){
                    const item = mapdata.foods[n];
                    
                    if(item.num - amount >= 0) {
                        item.num-= amount;
                        if(item.num<=0){
                            mapdata.foods.splice(n,1);
                            n--;
                        }
                        return true;
                        break;
                    }
                    
                }
                return false;
            }
            //if(team==1) console.log( mapdata.foods )

            for(let i = 0; i < facility.length ; i++){
                //시설물 보너스 계산 
                const fs = facility[i];
                switch(fs.type){
                    case 'house':
                        fs.foods = mapdata.foods;
                        fs.amount = fs.pop.length ;
                        
                        _res.house += fs.maxAmount;
                        _res.pop = _res.pop.concat( fs.pop);   
                        _res.manPower = _res.pop.length;                 
                        break;
                    
                }
            }
            
            for(let i = 0; i < facility.length ; i++){
                const fs = facility[i];
                if(fs.labor!=null){
                    if(fs.labor>0){
                        _res.manPower -= fs.labor;
                        if(_res.manPower<0){
                            fs.labor +=_res.manPower;
                        }
                    }
                }
                


                if(isTurnEnd){
                    //턴 넘길 때만 계산하기
                    if(fs.type=='house'){
                        //굶주림 처리
                        //식량 소모
                        for(let p = 0 ;p <fs.pop.length ; p++){
                            const person = fs.pop[p];
                            if(consumeFood(1)){
                                res[team].food--;
                                if(person.hunger<5) person.hunger++;
                            }else{
                                person.hunger --;
                            }
                            if(person.hunger<0){
                                _res.death++;
                                if(team==1)  console.warn(`${person.tag}가 굶주림으로 사망했습니다/탈주했습니다` );
                                //if(_res.manPower>0) _res.manPower--;
                                fs.pop.splice(p,1);
                                p--;

                            }
                        }
                    }
                     if(fs.amount>0){
                        
                        if(fs.turnEnd!=null) {
                            const r = fs.turnEnd();
                        }
                        for(let n = 0; n < fs.labor ; n++){
                            const delta = fs.amount>10 ? 10 : fs.amount ;
                            //res[team][fs.resource] += delta;
                            fs.amount -= delta;

                            
                            if(fs.type=='resource'){
                                /*
                                if(fs.resource=='wood'){
                                    pushItems( _res.miscs,getItem('wood', delta));
                                }
                                if(fs.resource=='misc'){
                                    pushItems( _res.miscs,getItem('misc', delta));
                                }*/
                                if(fs.resource=='scrapIron'){
                                    for(let c =0 ; c<delta ; c++){
                                        if(Math.random()<0.1){
                                            pushItems( _res.foods, getItem('can_tuna', 1));
                                        }
                                        if(Math.random()<0.7){
                                            pushItems( _res.miscs, getItem('scrapIron', 1));
                                        }else{
                                            pushItems( _res.miscs, getItem('misc', 1));
                                        }
                                    }
                                    
                                }else{
                                    pushItems( _res.miscs,getItem(fs.resource, delta));
                                }
                            }
                            
                            if(fs.type=='farm'){
                                //농사의 경우 
                                pushItems( _res.foods, getItem(fs.resource, Phaser.Math.Between( 1, 4) )  );
                                //console.log(n, _res.foods)
                            }
                        }
                    }else{
                        //자원 소진의 경우
                        fs.amount = 0;
                    }
                    
                    
                }
                    
                

            }
            //자원계산 후 대입 
            
            //mapdata.res = _res;
            if(team==1){
                data.pop = data.pop.concat( _res.pop );
                data.house += _res.house;
                data.manPower += _res.manPower;
            }
            Object.keys(_res).forEach((item) => {
                //console.log(`${item}:${res[1][item]}`)

                if (res[team][item] != null && _res[item] != null) {
                    
                    // 1. 둘 중 하나라도 배열인 경우 (예: pop 등)
                    if (Array.isArray(res[team][item]) || Array.isArray(_res[item])) {
                        const currentArr = Array.isArray(res[team][item]) ? res[team][item] : [res[team][item]];
                        const incomingArr = Array.isArray(_res[item]) ? _res[item] : [_res[item]];
                        
                        res[team][item] = currentArr.concat(incomingArr);
                    } 
                    // 2. 숫자인 경우 (예: house 등)
                    else {
                        if(item != 'manPower'){
                            res[team][item] += _res[item];
                        }
                        
                    }
                }

            }); 

           // if(team==1)      console.log(mapdata.foods)
           for(let n = 0; n<_res.foods.length ; n++){
                pushItems( mapdata.foods, _res.foods[n] );
           }
           //mapdata.foods = mapdata.foods.concat( _res.foods);
            
            if(team==1){
                for(let n = 0; n<mapdata.foods.length ; n++){
                    //pushItems( data.foods, mapdata.foods[n] );
                }
                for(let n = 0; n< _res.miscs.length ; n++){
                    pushItems( data.miscs, _res.miscs[n] );
                }

                data.foods = data.foods.concat(mapdata.foods);
                //data.miscs = data.miscs.concat(_res.miscs);
            }else{
                mapdata.foods = [ getItem('mouse',15)];
            }
        }
        
    }

    return res;
    //GameData.save();
}
