import { GameData, addMenpower } from "./data.js";

export function objectCopy( object ){
    // 방법 A: 전개 연산자 (...) 사용
    //array.push({ ...Facility.GasTank });
    // 방법 B: Object.assign() 사용
    return Object.assign({}, object);
}
export const res0 = {
    house :0,
    manPower:0,
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
    data.house = 0;
    data.pop = [];  
    
    const res = [objectCopy(res0) , objectCopy(res0), objectCopy(res0) ] ;
    for(let r = 0; r < scene.mapDatas.length; r++) {
        for(let q = 0; q < scene.mapDatas[r].length; q++) {
            const mapdata = scene.mapDatas[r][q];
            const facility = mapdata.facility;
            const garrison = mapdata.garrison;
            const team = mapdata.team;
            const _res  = mapdata.res ?? objectCopy(res0);
            _res.house = 0;
            _res.pop = [];

            for(let i = 0; i < facility.length ; i++){
                //시설물 보너스 계산 
                const fs = facility[i];
                switch(fs.type){
                    case 'house':
                        _res.house += fs.maxAmount;
                        fs.amount = fs.pop.length ;

                        
                        _res.pop = _res.pop.concat( fs.pop);
                        
                        //console.log(fs.pop);
                        
                        break;
                }


                if(isTurnEnd){
                    //턴 넘길 때만 계산하기
                     if(fs.amount>0){
                        
                        if(fs.turnEnd!=null) {
                            const r = fs.turnEnd();
                        }
                        if(fs.labor>0){
                            const delta = fs.amount*fs.labor>10 ? 10 : fs.amount *fs.labor;
                            //res[team][fs.resource] += delta;
                            fs.amount -= delta;

                            const pushItems= (array, item)=>{

                                for(let n =0 ; n < array.length ; n++ ){
                                    if(array[n].tag == item.tag){
                                        array[n].num += item.num;
                                        return;
                                    }
                                }
                                array.push( item );
                                return;
                            }
                            if(fs.type=='mine'){
                                if(fs.resource=='misc'){
                                    pushItems( res[team].miscs,{tag:'misc', num:delta });
                                }
                                if(fs.resource=='scrapIron'){
                                    for(let c =0 ; c<delta ; c++){
                                        if(Math.random()<0.7){
                                            pushItems( res[team].miscs,{tag:'scrapIron', num:1 });
                                        }else{
                                            pushItems( res[team].miscs,{tag:'misc', num:1 });
                                        }
                                    }
                                    
                                }
                            }
                            
                            if(fs.type=='farm'){
                                //농사의 경우 
                                
                                pushItems( res[1].foods,{tag:fs.resource, num:Phaser.Math.Between( 1,10) });
                                
                            }
                        }
                    }else{
                        //자원 소진의 경우
                        fs.amount = 0;
                    }
                    
                }
                    
                

            }
            //자원계산 후 대입 
            
            mapdata.res = _res;

        
            Object.keys(mapdata.res).forEach((item) => {
                //console.log(`${item}:${res[1][item]}`)

                if (res[team][item] != null && mapdata.res[item] != null) {
                    
                    // 1. 둘 중 하나라도 배열인 경우 (예: pop 등)
                    if (Array.isArray(res[team][item]) || Array.isArray(mapdata.res[item])) {
                        const currentArr = Array.isArray(res[team][item]) ? res[team][item] : [res[team][item]];
                        const incomingArr = Array.isArray(mapdata.res[item]) ? mapdata.res[item] : [mapdata.res[item]];
                        
                        res[team][item] = currentArr.concat(incomingArr);
                    } 
                    // 2. 숫자인 경우 (예: house 등)
                    else {
                        res[team][item] += mapdata.res[item];
                    }
                }

            });
            if(team==1){
                
                data.pop = data.pop.concat( res[1].pop );
                data.house += res[1].house;
                //GameData.save();
            }
            
        }
    }
    if(isTurnEnd){
        //식량 소모
        //const data = GameData.saveData;
        //console.log( res[1].miscs );
        //console.log( res[1].foods );
        for(let i = 0 ;i <data.pop.length ; i++){
            const person = data.pop[i];
            
            if(data.food +res[1].food >0){
                // data.food --;
                //console.log(data.food)
                res[1].food--;
            }else{
                person.hunger -= 1;
            }
            if(person.hunger<=0){
                res[1].death++;
                console.warn(`${person.tag}가 굶주림으로 사망했습니다/탈주했습니다` );
                data.manPower--;
                data.pop.splice(i,1);
                i--;

            }
        }
        
    }

    return res;
    //GameData.save();
}
