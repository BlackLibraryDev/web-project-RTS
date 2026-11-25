import {  GameData } from "./core/data.js";
import { createFacilityData } from './core/facilities.js';
import { LanguageData } from "./translate.js";

export function renderSubModal(scene, data){
    
    if(scene.subTileInfoContainer){
        scene.subTileInfoContainer.destroy();
        scene.subTileInfoContainer = null;
    }
     const container = scene.add.container(scene.scale.width/2, scene.scale.height/2).setDepth(10);
     container.id = data.id;
     container.rawdata = data;
    const fontStyle ={
        fontFamily:'Arial',
        fontSize: '24px',
        fill: '#ffffff',
        padding:{ x: 2, y: 2 }
    } 

    const startX = 340-scene.scale.width/2;
    const startY = 150-scene.scale.height/2;
    const menuBg = scene.add.rectangle(startX,startY,300,400,0x000000,0.7).setStrokeStyle(2,0xffffff)
    .setInteractive().setOrigin(0); // 뒤쪽 인게임 클릭 차단;

    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let isPinned =false;

    // 1. menuBg 클릭 시 드래그 시작
    menuBg.on('pointerdown', (pointer) => {
        if (pointer.button !== 0) return;
         for(let i = 0 ; i< scene.subTileInfoContainerArray.length ; i++){
            scene.subTileInfoContainerArray[i].setDepth(9)
         }
         container.setDepth(10)
        isDragging = true;
        dragOffsetX = pointer.x - container.x;
        dragOffsetY = pointer.y - container.y;
    });

    // 2. 드래그 이동 및 해제
    const onPointerMove = (pointer) => {
        if (!isDragging) return;
        container.x = pointer.x - dragOffsetX;
        container.y = pointer.y - dragOffsetY;
    };

    const onPointerUp = () => {
        isDragging = false;
    };

    // 3. 바깥 클릭 감지 (전역 pointerdown)
    const onOutsidePointerDown = (pointer, currentlyOver) => {
        // 클릭된 위치에 있는 오브젝트들 중 container의 자식(menuBg, 내부 버튼 등)이 하나라도 있는지 확인
        const isClickedInside = currentlyOver.some(obj => container.list.includes(obj));
        // 컨테이너 내부를 클릭한 게 아니라면 창 닫기(destroy)
        if (!isClickedInside && isPinned==false) {
            container.destroy();
        }
    };

    scene.input.on('pointermove', onPointerMove);
    scene.input.on('pointerup', onPointerUp);

    // ⚠️ 중요: 이 메뉴를 여는 클릭 이벤트와 겹쳐서 생성되자마자 바로 닫히는 현상 방지
    scene.time.delayedCall(0, () => {
        if (container && container.active) {
            scene.input.on('pointerdown', onOutsidePointerDown);
        }
    });

    // 4. 컨테이너가 파괴될 때 등록했던 모든 전역 이벤트 리스너 깔끔하게 제거
    container.once('destroy', () => {
        if(scene.subTileInfoContainer ==container) scene.subTileInfoContainer = null;
         for(let i = 0 ; i< scene.subTileInfoContainerArray.length ; i++){
            if(scene.subTileInfoContainerArray[i].id == container.id) {
                scene.subTileInfoContainerArray.splice(i,1);
                break;
            }
        }
        scene.input.off('pointermove', onPointerMove);
        scene.input.off('pointerup', onPointerUp);
        scene.input.off('pointerdown', onOutsidePointerDown);
    });
    

    // 어두운 반투명 배경 레이어 (화면 전체 덮기)
    /*
    const overlay = scene.add.rectangle(320, 0, scene.scale.width, scene.scale.height, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
    overlay.on('pointerdown', () => {
        //container.destroy();
        //scene.subTileInfoContainer = null;
    }); 
    */
    const titleTxt = scene.add.text(startX+10,startY+10, LanguageData.getText(data.tag) ,fontStyle).setOrigin(0);
    const infoTxt = scene.add.text(startX+10, startY+ 160, '', fontStyle).setOrigin(0).setFontSize(20);
    const resourceTxt = scene.add.text(startX+10,startY+50, data.resource ,fontStyle).setOrigin(0).setFontSize(16);
    const bar = scene.add.graphics();

    const pin = scene.add.text(startX + 295, startY+10, '📌',fontStyle ).setOrigin(1,0).setInteractive({ useHandCursor: true });;
    pin.on('pointerdown', () => {
        if(isPinned){
            //고정해제
            for(let i = 0 ; i< scene.subTileInfoContainerArray.length ; i++){
                if(scene.subTileInfoContainerArray[i] == container) {
                    scene.subTileInfoContainerArray.splice(i,1);
                    break;
                }
            }
            scene.subTileInfoContainer = container;
            pin.setText('📌');
        }else{
            //고정
            scene.subTileInfoContainer = null
            for(let i = 0 ; i< scene.subTileInfoContainerArray.length ; i++){
                if(scene.subTileInfoContainerArray[i].id == container.id) {
                    scene.subTileInfoContainerArray[i].destroy();
                    scene.subTileInfoContainerArray.splice(i,1);
                    break;
                }
            }
            scene.subTileInfoContainerArray.push( container );
            pin.setText('📍');
        }
        isPinned = !isPinned;
    }); 
    
    container.add( [  menuBg, titleTxt, resourceTxt, infoTxt, bar, pin]); //overlay,
    
    container.items={
        titleText:titleTxt,
        infoText:infoTxt,
        resourceText:resourceTxt,
        bar:bar,
        startX:startX,
        startY:startY,
        pin:pin

    }
    if(data.status ==''){
        switch(data.type){
            case 'house':
                 renderSubModal_house(scene, container, data);
                //renderSubModalBar(scene, container,data);
                break;
            
            case 'facility':
                renderSubModal_facility(scene, container,data);
                break;

            case 'farm':
                renderSubModal_facility(scene, container,data);
                break;
        }
    }
    
    if(data.add!=null){
        renderSubModal_add(scene,container, data);
    }
    if(data.isWorkable ){
        renderSubModal_workable(scene, container, data );
        renderSubModalBar(scene, container,data);
    }
    

    scene.subTileInfoContainer = container;
    return container;
}

function renderSubModal_facility(scene, container, data){
    //시설 관리
     const fontStyle ={
        fontFamily:'Arial',
        fontSize: '24px',
        fill: '#ffffff',
        padding:{ x: 2, y: 2 }
    } 

    const items = container.items;
    const btMake = scene.makeButton(items.startX+150, items.startY+320, 260,80, ('schedule'),{color:0x2cb9ff});
    let bar = scene.add.graphics();

     const func = ()=>{
        //console.log(data.work)
        const txt = data.work!=null? data.work.tag :  'schedule';
        const color = data.work!=null? 0x000000 : 0x2cb9ff;
        btMake.nameText.setText( LanguageData.getText( txt ));
        btMake.bg.setFillStyle( color );
        if(data.work){
            bar.clear();
            bar = renderPercentageBar(scene, data.work, items.startX+20, items.startY+350, 260, 10).bar;
            container.add(bar);
        }else{
            bar.clear();
        }
        
    }


    btMake.on('pointerdown', ()=>{
        const container2 =scene.add.container(0,0).setDepth(100);
        const width =300;
        const height = 500;

        const overlay = scene.add.rectangle(scene.scale.width/2, scene.scale.height/2, scene.scale.width, scene.scale.height, 0x000000, 0.5)
        .setInteractive({ useHandCursor: true });
        overlay.on('pointerdown', () => {
            container2.destroy();
        }); 
        const menuBg = scene.add.rectangle(scene.scale.width/2-width/2,scene.scale.height/2-height/2,width,height,0x000000,0.7).setStrokeStyle(2,0xffffff)
         .setOrigin(0); // 뒤쪽 인게임 클릭 차단;

        container2.add([overlay, menuBg]);

         const array =  data.workList ?? [];
        for(let i =0 ; i< array.length ; i++){
            const work = array[i];
            const workContainer = scene.add.container(0,0).setDepth(11);
            const bg = scene.add.rectangle(menuBg.x+10, menuBg.y+10 , 280, 70,0x000000,0.8).setStrokeStyle(2,0xffffff)
             .setInteractive({ useHandCursor: true }).setOrigin(0); 
            bg.on('pointerdown', ()=>{
                data.work = {... work};
                func();
                container2.destroy();
            })
            const titleTxt = scene.add.text(menuBg.x+15, menuBg.y+15, `${LanguageData.getText(work.tag)} (+${work.min}~${work.max})` ,fontStyle);
            const infoTxt =  scene.add.text(menuBg.x+15, menuBg.y+45, `days:${work.maxAmount}, repeat: ${work.repeat<0? 'infinity': work.repeat }` ,fontStyle).setFontSize(16);
           
            
            workContainer.add([bg,titleTxt,infoTxt]);

            workContainer.y = i*80+10;
            container2.add(workContainer);
        }

        
    })
    const originFunc1 = container.func; // 무한 루프 방지를 위해 원본 저장
    container.func = (...args) =>{
        if(originFunc1) originFunc1(...args);
        func(...args);
    }
    
    container.add([btMake]);
    func();
}



function renderSubModal_workable(scene, container, data){
    const items = container.items;
    
    const btDel = scene.makeButton(items.startX+150, items.startY+360, 240,50, LanguageData.getText('demolition'));
    const btUp = scene.makeButton(items.startX+270,items.startY +110, 40,40, '+');
    const btDown = scene.makeButton(items.startX +30,items.startY +110, 40,40, '-');
    const laborText = scene.add.text(items.startX+150, items.startY +110 , ``, {
        fontFamily:'Arial',
        fontSize: '24px',
        fill: '#ffffff',
        align:'center',
        padding:{ x: 2, y: 2 }
    } ).setOrigin(0.5);
    container.add([btUp,btDown,laborText])

   // Calculate(scene,items, data);
   const calculate = ()=>{
        scene.calculateData();
        //res[team][fs.resource] += delta *fs.labor;
        if(data.status =='building'){
            items.infoText.setText(`status: ${data.status}`);
        }else{
            //건설완료
            if(data.type=='house'){
                
                renderSubModal(scene,data);
                container.destroy();
                return;
            }
            
            //건설완료 조건문 끝
            
            items.infoText.setText(`Max Labor : ${data.maxLaborBackup}\nEstimate income: \n   (Rad debuff: -${data.radDebuf*100}%)\n`);
            if(data.output!=null){
                const xp =( data.amount>0 ? (data.labor>0 ? data.labor : 1) : 0 ) * (data.radDebuf ?? 1);
                for(let i =0 ; i<data.output.length;i++){
                    const item = data.output[i];
                    const per = item.percentage<1 ? `(${Math.floor( item.percentage*100)}%)` : '';
                    if(item.min < item.max){
                        items.infoText.text += `+ ${item.tag}: +${Math.ceil(item.min *xp)}~${Math.ceil(item.max*xp)} ${per}\n`;
                    }else{
                        items.infoText.text += `+ ${item.tag}: +${Math.ceil(item.max)} ${per}\n`;
                    }
                    
                }
            }
            
        }
        
        laborText.setText( `${LanguageData.getText('labor')}: ${data.labor}/${data.maxLabor}`);
        
    }

    const originFunc1 = container.func; // 무한 루프 방지를 위해 원본 저장
    container.func = (...args) =>{
        if(originFunc1) originFunc1(...args);
        renderSubModalBar(scene, container,data);
        calculate(...args);
    } 
    container.func();
    btUp.on('pointerdown', () => {
        const player = GameData.saveData;
        if(data.isWorkable){
            if(data.maxLabor < data.maxLaborBackup){
                //player.manPower--;
                data.maxLabor++
                container.func();
                scene.forceUpdateTileInfo();
                scene.renderResourceBar();

                const cont = findSameIDcontainer(scene, container.id)?.func();;
            }
        }
    });
    btDown.on('pointerdown', () => {
        const player = GameData.saveData;
        if(data.isWorkable){
            if(data.maxLabor>0){
                //player.manPower++;
                data.maxLabor--
                container.func();
                scene.forceUpdateTileInfo();
                scene.renderResourceBar();

                const cont = findSameIDcontainer(scene, container.id)?.func();
                
            }
        }
    });
    
}

function renderSubModal_add(scene, container, data){
    const items = container.items;
    items.pin.setVisible(false);

    if(items.list!=null){
        for( let i =0 ;i <items.list.length ; i++){
            items.list[i].destroy();
        }
        items.list = [];
    }
    
    //건설항목 등 무언가 추가하는 경우
    items.list = [];
    const addList = [];
    switch(scene.tileData.tag){
        case 'water':
            addList.push( 
                createFacilityData('fishBay',{status:'building'}), 
                createFacilityData('waterPump',{status:'building'})
            );
            break;

        default:
            addList.push(
                createFacilityData('baseCamp', {amount:0, pop:[],status:'building',isWorkable:true}),
                createFacilityData('mouseFarm',{status:'building'}),
                createFacilityData('yard',{status:'building'}), 
                createFacilityData('radCleaner',{status:'building'}),
                createFacilityData('bucher',{status:'building'})
            );
        break
    }

    for(let n = 0 ; n<addList.length; n++){
        const ct = scene.make_tileInfoContainer(1, addList[n], items.startX+15, items.startY +60 + n*60);
        ct.nameText.setText(  `+add ${LanguageData.getText( ct.itemData.tag )} `);
        const spent = ct.itemData.cost;
        let txt = ''
        if(spent!=null){
                Object.keys(spent).forEach((item) => {
                txt += `${item}: ${Math.abs(spent[item]) }`
                //spent[item] = -Math.abs(spent[item])
                
            });
        }
        
        ct.infoText.setText( txt );
        ct.off('pointerDown');
        ct.on('pointerdown', () => {
            //클릭 시 건물 추가
            const spent =ct.itemData.cost;
            if(spent!=null){
                Object.keys(spent).forEach((item) => {
                    //GameData.saveData[item] += spent[item] ;
                })
            }
            scene.tileData.facility.push( ct.itemData );
            
            //scene.registry.events.emit(GameEvents.TURN_END, false);
            scene.calculateData();
            scene.forceUpdateTileInfo();
            scene.renderResourceBar([null, spent ]);
            scene.renderSubTileInfo(null,false);
        });
        items.list.push( ct );
        container.add( ct );
    }
    return container;
}

function renderSubModal_house(scene, container, data){
    const items = container.items;
    items.infoText.y = items.startY+100;
    items.resourceText.setVisible(true);

    const calculate = ()=>{
        if(data.status =='building'){
            items.infoText.setText(`status: ${data.status}`);
        }else{
            items.titleText.setText( `${LanguageData.getText(data.tag)} (${data.pop.length}/${data.maxAmount})`)
            items.resourceText.setText( `house upkeep: +${data.amount}`);

            items.infoText.setText(`${LanguageData.getText('houseMember')}: ${data.pop.length}\n`);
            for(let n =0 ;n< data.pop.length; n++){
                const person = data.pop[n];
                items.infoText.text += `* ${person.tag}(${person.age}) | [${person.hunger},${person.thirst},${person.happy}]\n`
            }
        }
    }
    

    container.func =()=>{
        renderSubModalBar(scene, container,data);
        calculate();
    } 
    container.func();

    return container;
}



function renderSubModalBar(scene, container, data){
    const items = container.items;
    if(data.amount!=null && data.maxAmount ){
        let tag = data.resource ?? LanguageData.getText('houseMember');
        if(data.status=='building'){
            tag = data.status;
        }

        items.bar.clear();
        const barData = renderPercentageBar(scene, data, -290, items.startY+70, 280, 10);
        items.bar = barData.bar;
        container.add(items.bar);
        items.resourceText.setText( `${tag}: ${barData.amount}/${barData.maxAmount}(${ Math.ceil(barData.percentage*1000)/10 }%)`)
        
    }else{
        items.bar.setVisible(false);
        items.resourceText.setText( `resource: ${data.resource}`);
    }
    return container;
}

function renderPercentageBar(scene,  data, startX, startY, width, height=10){
    const amount = data.status=='building'? data.buildTime : data.amount;
    const maxAmount= data.status=='building'? data.maxBuildTime : data.maxAmount;

    const percentage = amount / maxAmount ?? 0 // 비율 계산 (0 ~ 1)          
    const bar = scene.add.graphics();
    bar.fillStyle(0x333333, 1); // 어두운 회색 배경
    bar.fillRect(startX, startY, width, height);
    // [잔여량 게이지 상자] 게이지가 차오르는 색상 (예: 녹색 0x00ff00)
    if (percentage > 0) {
        bar.fillStyle(0x00ff00, 1); 
        bar.fillRect(startX, startY, width * percentage, height);
    }
    return {bar:bar, amount:amount, maxAmount:maxAmount, percentage:percentage};
}
function findSameIDcontainer(scene, id){
    for(let i = 0 ; i< scene.subTileInfoContainerArray.length ; i++){
        if(scene.subTileInfoContainerArray[i].id == id) {
            return scene.subTileInfoContainerArray[i];
        }
    }
}