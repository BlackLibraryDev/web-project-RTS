// src/UIscene.js
import { GameEvents } from './events.js';
import { LanguageData } from './translate.js';
import { GameData, createFacilityData } from './core/data.js';

export const zoomRato = {ratio:0.001, min:0.5, max:2.5};

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }
    
    create() {
        const gameScene = this.scene.get('GameScene');

        this.turn = {year:2054 , week:0 };

        // --------------------------------------------------
        // 2. 일시정지 팝업 메뉴 컨테이너 (초기에는 숨김)
        // --------------------------------------------------
        this.make_pauseManuContainer();

        this.make_resourceBar();
        this.make_tileInfo();
        this.make_subTileInfo();
        this.registry.events.emit(GameEvents.TURN_END, false);

        this.endTurnButton = this.makeButton( this.scale.width/2, this.scale.height-60,200,60,'EndTurn');
        this.endTurnButton.on('pointerdown', () => {
            //턴 넘김
             
            this.registry.events.emit(GameEvents.TURN_END, true);
           this.forceUpdateTileInfo();
            this.renderSubTileInfo(null,false);
           this.createFloatingText( this.endTurnButton.x, this.endTurnButton.y, '','endTurn');
        }); 
        
        // --------------------------------------------------
        // 3. registry 이벤트 수신
        // --------------------------------------------------
        this.registry.events.on(GameEvents.GAME_PAUSE, (isPaused) => {
            this.pauseMenuContainer.setVisible(isPaused);
        }, this);

        this.events.once('shutdown', () => {
            this.registry.events.off(GameEvents.TURN_END);
            this.registry.events.off(GameEvents.GAME_PAUSE);
            this.subTileInfoContainer = null;
            this.tileInfoContainer = null;
        });
        
    }
    make_subTileInfo(){
        //서브 타일 항목
        this.subTileInfoContainer  = this.add.container(this.scale.width/2, this.scale.height/2).setDepth(10);
        const fontStyle ={
            fontFamily:'Arial',
            fontSize: '24px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 }
        } 

        const startX = 340-this.scale.width/2;
        const startY = 150-this.scale.height/2;
        const menuBg = this.add.rectangle(startX,startY,300,400,0x000000,0.7).setStrokeStyle(2,0xffffff)
        .setInteractive().setOrigin(0); // 뒤쪽 인게임 클릭 차단;
        menuBg.on('pointerdown', () => {
            //this.subTileInfoContainer.setVisible(false);
        });

        const titleTxt = this.add.text(startX+10,startY+10, 'title' ,fontStyle).setOrigin(0);
        
        const resourceTxt = this.add.text(startX+10,startY+50, 'Resource: ' ,fontStyle).setOrigin(0).setFontSize(16);
        const bar = this.add.graphics();
        
        const btDel = this.makeButton(startX+150, startY+360, 240,50, LanguageData.getText('demolition'));
        const btUp = this.makeButton(startX+270,startY +110, 40,40, '+');
        const btDown = this.makeButton(startX +30,startY +110, 40,40, '-');
        const laborTxt = this.add.text(startX+150, startY +110 , `Labor: 0`, {
            fontFamily:'Arial',
            fontSize: '24px',
            fill: '#ffffff',
            align:'center',
            padding:{ x: 2, y: 2 }
        } ).setOrigin(0.5);

        this.subTileInfoContainer.add( [ menuBg, titleTxt, resourceTxt, bar , btDel, btUp, btDown, laborTxt]);
        this.subTileInfoContainer.items={
            titleText:titleTxt,
            resourceText:resourceTxt,
            bar:bar,
            startX:startX,
            startY:startY,
            laborText:laborTxt,
            btUp:btUp,
            btDown:btDown,
            btDel:btDel
        }
        this.subTileInfoContainer.setVisible(false);

    }
    renderSubTileInfo(data, isVisible=false){
        this.subTileInfoContainer.setVisible(isVisible);
        if(isVisible){
            const items = this.subTileInfoContainer.items;
            items.titleText.setText( LanguageData.getText( data.tag ) );
            items.laborText.setText( `Labor: ${data.labor}`);
            
            let spentTxt = '';
            if(data.spentResource!=null){
                for(let i = 0; i < this.tileData.facility.length ; i++){
                    if(this.tileData.facility[i] == data){
                        const spent = data.spentResource;
                        Object.keys(spent).forEach((item) => {
                            spentTxt += `${item} +${Math.abs(spent[item])/2}`;
                        });
                        break;
                    }
                }
            }
            
            items.btDel.nameTxt.setText( LanguageData.getText('demolition')+`${spentTxt.length>0?' ('+spentTxt+')'  :''}`)
            items.btDel.off('pointerdown');
            items.btDel.on('pointerdown', () => {
                for(let i = 0; i < this.tileData.facility.length ; i++){
                    if(this.tileData.facility[i] == data){

                        if(data.labor!=null)  GameData.saveData.manPower+= data.labor;
                        const spent = data.spentResource;
                        
                        Object.keys(spent).forEach((item) => {
                            //건설비 절반 반환
                            spent[item] =Math.abs(spent[item])/2
                            GameData.saveData[item] += spent[item];
                        })


                        this.tileData.facility.splice(i,1);
                        this.renderSubTileInfo(null,false);
                        this.forceUpdateTileInfo();
                        this.renderResourceBar([null, spent ]);
                        
                        break;
                    }
                }
            });

            items.btUp.off('pointerdown');
            items.btUp.on('pointerdown', () => {
                const player = GameData.saveData;
                if(data.labor!=null){
                    if(player.manPower>0 && data.labor < data.maxLabor){
                        player.manPower--;
                        data.labor++
                        items.laborText.setText( `Labor: ${data.labor}`);
                        this.forceUpdateTileInfo();
                        this.renderResourceBar();
                    }
                }
            });
            items.btDown.off('pointerdown');
            items.btDown.on('pointerdown', () => {
                const player = GameData.saveData;
                if(data.labor!=null){
                    if(data.labor>0){
                        player.manPower++;
                        data.labor--
                        items.laborText.setText( `Labor: ${data.labor}`);
                        this.forceUpdateTileInfo();
                        this.renderResourceBar();
                    }
                }
            });

            items.btDel.setVisible(data.isDemol ?? false);
            items.btDown.setVisible(false);
            items.btUp.setVisible(false);
            items.laborText.setVisible(false);
            items.bar.clear();
            items.resourceText.setVisible(false);
            //amout 가 있는 경우 바 표시 및 노동력 버튼 추가
            if(data.labor !=null ){
                items.resourceText.setVisible(true);
                items.btDown.setVisible(true);
                items.btUp.setVisible(true);
                items.laborText.setVisible(true);

                if(data.amount!=null && data.maxAmount){
                    const percentage = data.amount!=null ? data.amount / data.maxAmount : 0 ; // 비율 계산 (0 ~ 1)            
                    items.bar = this.add.graphics();
                    items.bar.fillStyle(0x333333, 1); // 어두운 회색 배경
                    items.bar.fillRect(-290, items.startY+70, 280, 10);

                    // [잔여량 게이지 상자] 게이지가 차오르는 색상 (예: 녹색 0x00ff00)
                    if (percentage > 0) {
                        items.bar.fillStyle(0x00ff00, 1); 
                        items.bar.fillRect(-290, items.startY+70, 280 * percentage, 10);
                    }
                    this.subTileInfoContainer.add(items.bar)
                    items.resourceText.setText( `resource: ${data.amount}/${data.maxAmount}(${ Math.ceil(percentage*1000)/10 }%)`)
                    items.bar.setVisible(true);
                }else{
                    items.resourceText.setText( `resource: ${data.resource}`);
                }
                
                
                
            }

            if(data.type =='house'){
                items.btDown.setVisible(false);
                items.btUp.setVisible(false);
                items.laborText.setVisible(false)
                items.resourceText.setVisible(true);
                items.resourceText.setText( `house upkeep: +${data.amount}`);
            }
            if(items.list!=null){
                for( let i =0 ;i <items.list.length ; i++){
                    items.list[i].destroy();
                }
                items.list = [];
            }
            if(data.add!=null){
                //무언가 추가하는 경우
                items.list = [];
                const addList = [createFacilityData('baseCamp'), createFacilityData('mouseFarm')];
                for(let n = 0 ; n<addList.length; n++){
                    const ct = this.make_tileInfoContainer(1, addList[n], items.startX+15, items.startY +60 + n*60);
                    ct.off('pointerDown');
                    ct.on('pointerdown', () => {
                        //클릭 시 건물 추가
                        const spent = ct.itemData.spentResource;
                        Object.keys(spent).forEach((item) => {
                           // console.log(item, spent[item])
                           if(GameData.saveData[item] < Math.abs(spent[item]) ){
                                console.warn('자원이 부족합니다');
                                return;
                           }else{
                                spent[item] = -Math.abs(spent[item])
                           }
                        });
                        Object.keys(spent).forEach((item) => {
                            GameData.saveData[item] += spent[item] ;
                        })
                        this.tileData.facility.push( ct.itemData );
                        
                        //this.registry.events.emit(GameEvents.TURN_END, false);
                        this.forceUpdateTileInfo();
                        this.renderResourceBar([null, spent ]);
                        this.renderSubTileInfo(null,false);
                    });
                    items.list.push( ct );
                    this.subTileInfoContainer.add( ct );
                }
            }

        }else{
            //감추는 경우 랜더링 X 
        }
    }
    make_tileInfo(){
        this.tileInfoContainer = this.add.container(this.scale.width/2, this.scale.height/2).setDepth(10);
        const fontStyle ={
            fontFamily:'Arial',
            fontSize: '24px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 }
        }
        const startX = 30-this.scale.width/2;
        const startY = 40-this.scale.height/2;
        const menuBg = this.add.rectangle(startX+150,20,300,this.scale.height-60,0x000000,0.7).setStrokeStyle(2,0xffffff)
        .setInteractive(); // 뒤쪽 인게임 클릭 차단;

        const sX =startX+21;
        const sY =startY+34;
        const points = [];
        const HEX_SIZE = 36;
        for (let i = 0; i < 6; i++) {
            const angleDeg = 60 * i - 30;
            const angleRad = (Math.PI / 180) * angleDeg;
            points.push(new Phaser.Geom.Point(
               sX+ HEX_SIZE * Math.cos(angleRad),
               sY+ HEX_SIZE * Math.sin(angleRad)
            ));
        }
        const textureToUse ='tile_fog';
        const tileImage = this.add.sprite(sX, sY, textureToUse).setOrigin(0.5).setScale(0.5);;
        
        const targetHeight = HEX_SIZE * 2;
        const scale = targetHeight / tileImage.height;
        tileImage.setScale(scale);
        
        const bgGraphics = this.add.graphics();
        bgGraphics.fillStyle(0xffffff, 0);
        bgGraphics.lineStyle(2, 0xffffff, 1);
        bgGraphics.fillPoints(points, true);
        bgGraphics.strokePoints(points, true);


        const returnButton = this.makeButton(sX, sY , 50,50, '<')
        returnButton.bg.setVisible(false);
        returnButton.nameTxt.setFontSize(36);
        returnButton.on('pointerdown', () => {
            this.tileInfoContainer.setVisible(false);
        });

        

        const titleTxt = this.add.text(startX+55,sY-12, 'title' ,fontStyle).setOrigin(0);

        const facilityContainer = this.add.container(startX, startY+60);
        const facilityBg = this.add.rectangle(10, 0, 280,380, 0x000000, 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
        const facilityTxt = this.add.text(20, 10, LanguageData.getText('facility') ,fontStyle).setOrigin(0);
        facilityContainer.add([facilityBg,facilityTxt]);

        const garrisonContainer = this.add.container(startX,startY+450);
        const garrisonBg = this.add.rectangle(10,0,280,200, 0x000000, 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
         const garrisonTxt = this.add.text(20, 10, LanguageData.getText('garrison') ,fontStyle).setOrigin(0);
        garrisonContainer.add([garrisonBg,garrisonTxt]);

         const facilityList = [];
         const garrisonList = [];
        this.tileInfoContainer.items ={
            titleText :titleTxt,
            facilityList: facilityList,
            garrisonList: garrisonList,
            facilityContainer: facilityContainer,
            garrisonContainer: garrisonContainer,
            startX: startX,
            startY: startY,
            tileImage : tileImage,
            facilityText:facilityTxt,
            garrisonText:garrisonTxt
        }
        this.tileInfoContainer.add([menuBg,facilityContainer, garrisonContainer,  tileImage,bgGraphics, returnButton,titleTxt ]);

        this.tileInfoContainer.setVisible(false);//기본값 안보이게
    }
    

    make_tileInfoContainer(team, data, startX, startY, bgColor =null){
        //타일 내 설치된 시설 혹은 주둔군 버튼
        const width = 270;
        const height = 60;
        const container = this.add.container(startX,startY).setInteractive({ 
            hitArea: new Phaser.Geom.Rectangle(0,0,width, height), 
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            useHandCursor: true // 컨테이너에 직접 커서 설정
        });
        
       
        //container.input.topOnly = true; 

        const fontStyle ={
            fontFamily:'Arial',
            fontSize: '16px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 }
        }
        
        const bgcolor = data.team? ( data.team >1 ? 0xff4f4f :  0x2cb9ff  ) : ( 0x000000 ); 
        const bg = this.add.rectangle(0,0, width,height, (bgColor!=null? bgColor :bgcolor) , 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
        
        let num = ''
        if(data.labor!=null ) num = '('+data.labor+')';
        if(data.type == 'house') num = '(+'+ data.amount +')';
        let name =`${ LanguageData.getText(data.tag)} ${ num }` 
        const nameTxt = this.add.text(40,5, name , fontStyle).setOrigin(0).setFontSize(20);

        let text = `${data.type} ${data.resource? ': '+data.resource :''}`
        const infoTxt = this.add.text(40,25,text, fontStyle).setOrigin(0);

        const icon = this.add.image(4,12,'icon').setOrigin(0);

        const percentage = data.amount!=null ? data.amount / data.maxAmount :0 ; // 비율 계산 (0 ~ 1)
        const bar = this.add.graphics();
        // [배경 회색 상자] 중심점 기준으로 그리기 위해 -width/2, -height/2 적용
        bar.fillStyle(0x333333, 1); // 어두운 회색 배경
        bar.fillRect(0, height-10, width, 10);

        // [잔여량 게이지 상자] 게이지가 차오르는 색상 (예: 녹색 0x00ff00)
        if (percentage > 0) {
            bar.fillStyle(0x00ff00, 1); 
            bar.fillRect(0, height-10, width * percentage, 10);
        }



        container.add([bg,nameTxt,infoTxt,icon, bar]);
        container.bar = bar;
        container.itemData = data;
        return container;
    }

    clearTileInfoList(){
         const items = this.tileInfoContainer.items;

        for(let i = 0; i<items.facilityList.length; i++){
            this.tileInfoContainer.remove( items.facilityList[i], true);
            items.facilityList[i].destroy();
        }
        items.facilityList = [];
        items.facilityContainer.setVisible(false);

        for(let i = 0; i<items.garrisonList.length; i++){
            this.tileInfoContainer.remove( items.garrisonList[i], true);
            items.garrisonList[i].destroy();
        }
        items.garrisonList = [];
        items.garrisonContainer.setVisible(false);

        //this.renderSubTileInfo(null,false);
    }
    renderTileInfoList(tileData ){
        this.clearTileInfoList();
        const items = this.tileInfoContainer.items;

       if(tileData.facility.length>=0){
            items.facilityContainer.setVisible(true);
            for(let i= 0; i<tileData.facility.length ; i++){

                const data = tileData.facility[i];

                const container = this.make_tileInfoContainer(tileData.team, data, items.facilityContainer.x +15 ,items.facilityContainer.y +i*70 +45);
                 container.on('pointerdown', () => {
                    //서브항목 호출
                    if(tileData.team!=1) return;
                    this.renderSubTileInfo(data, true);
                    this.forceUpdateTileInfo();
                    this.renderResourceBar();
                });
                items.facilityList.push(container);
                this.tileInfoContainer.add(container);
            
            }

            const metaMap = this.scene.get('metaMap');
            let obj = { tag:'addFacility', type:'', add:'facility'};
            let color = 0x43c563;
            if(tileData.team<1){
                
                obj = { tag:'captureTheSector', type:'', conquest:true};
                color = 0xffe449;
            }
            if(tileData.team>1){
                obj = { tag:'attack', type:'', conquest:true};
                color =0xff2d2a;
            }
            
                 const addFacilityBt = this.make_tileInfoContainer(tileData.team, obj, 
                    items.facilityContainer.x+15, items.facilityContainer.y + tileData.facility.length*70 +45,
                    color);
                 addFacilityBt.on('pointerdown', () => {
                    if(tileData.team==1){
                        if(addFacilityBt.itemData !=null){
                            this.renderSubTileInfo(addFacilityBt.itemData, true);
                        }
                        this.forceUpdateTileInfo();
                        this.renderResourceBar();
                    }
                    if(tileData.team<1){
                        //지역 점령
                        const path = metaMap.calculatePath(tileData.q, tileData.r);
                        if(path.length ==0){  
                            console.warn('no path'); 
                            return;
                        }else{
                            //연료가 소모됨
                            if(GameData.saveData.fuel - path.length>=0){
                                GameData.saveData.fuel -= path.length;
                            }else{
                                console.warn('no fuel'); 
                                return;
                            }
                        }

                        tileData.team = 1;
                        
                        metaMap.renderHexTile(tileData.r, tileData.q);
                        metaMap.hexTileFogVisible( tileData.r, tileData.q);
                        //metaMap.events.emit(GameEvents.RENDER_TILE, {r:this.tileData.r, q:this.tileData.q, team:1} );
                        this.forceUpdateTileInfo();
                        this.renderResourceBar();

                    }
                    if(tileData.team>1){
                        //공격
                    }
                    
                });    
                items.facilityList.push(addFacilityBt);
                this.tileInfoContainer.add(addFacilityBt);
            
           
            
        }
        if(tileData.garrison.length>=0){
            items.garrisonContainer.setVisible(true);
            for(let i= 0; i<tileData.garrison.length ; i++){

                const data = tileData.garrison[i];

                const container = this.make_tileInfoContainer(tileData.team, data, items.garrisonContainer.x +15 ,items.garrisonContainer.y +i*70 +45);
                
                items.garrisonList.push(container);
                this.tileInfoContainer.add(container);
            
            }
            if(tileData.team==1){
                 const addGarrisonBt = this.make_tileInfoContainer(tileData.team, {tag:'add Garrison', type:'' ,add:'garrison'}, 
                    items.garrisonContainer.x+15, items.garrisonContainer.y + tileData.garrison.length*70 +45,
                    0x43c563);
                items.garrisonList.push(addGarrisonBt);
                this.tileInfoContainer.add(addGarrisonBt);
            }

        }

    }
    forceUpdateTileInfo(){
        if(this.tileData){
           // this.renderSubTileInfo(null,false);
            const metaMap = this.scene.get('metaMap');
            metaMap.events.emit(GameEvents.TILE_CLICKED, {r:this.tileData.r, q:this.tileData.q} );
            
        }
    }
    setTileInfo(tileData){
        if(!this.tileInfoContainer) return
        
        this.tileInfoContainer.setVisible(true);
        if(this.tileData!=null ){
            if(this.tileData.q == tileData.q  && this.tileData.r == tileData.r){

            }else{
                //같은 좌표가 아니면 창 종료
                this.renderSubTileInfo(null,false);
            }
        }
        this.tileData = tileData;
        const items = this.tileInfoContainer.items;
        if(tileData.explored && tileData.name != 'empty'){

            if(items.tileImage)  items.tileImage.setTexture(`tile_${tileData.name}` ?? 'tile_fog');

            items.titleText.setText( 
                `${LanguageData.getText( tileData.name)} (${tileData.q},${tileData.r}) ${tileData.team>0? 'team '+tileData.team :''}` );
            this.renderTileInfoList( tileData);
            
            let num = tileData.facility.length;
            let maxNum = tileData.slot;
            items.facilityText.setText( `${LanguageData.getText('facility')} - slot: ${num}/${maxNum}`  );
        }else{
            //미탐험지역
            items.titleText.setText(`미탐험지역`)
            items.facilityText.setText( `${LanguageData.getText('facility')} `  );
            this.clearTileInfoList();
        }
        
    }
    renderResourceBar( res =null, turnEnd =false ){
        const ctn = this.resourceContainer;
        const manpower = {baby:0, child:0, adult:0, house:0 }
        ctn.manPowerText.setText( `${manpower.adult}/${manpower.house}`);

        const data = GameData.saveData;
        const metaMap = this.scene.get('metaMap');
        metaMap.calculateResource(false);
        //인벤토리 구현 및 아이템 sum 후 수치표현
        ctn.manPowerText.setText(`${data.manPower}/${data.house}`);
        ctn.ammoText.setText(`${data.ammo}/1000`);
        ctn.foodText.setText(`${data.food}/1000`);
        ctn.miscText.setText(`${data.misc}/1000`);
        ctn.fuelText.setText(`${data.fuel}/1000`);

        if(res !=null){
            if(turnEnd){
                this.turn.week++;
                if(this.turn.week>52) {
                    this.turn.week =1;
                    this.turn.year++
                }
            }
            
            
            Object.keys(res[1]).forEach((item) => {
               // console.log(`${item}:${res[1][item]}`)
                if(ctn[item] !=null){
                    if(res[1][item]!=0){
                        this.createFloatingText( ctn[item].x, ctn[item].y+30, '', `${(res[1][item]>0 ? '+': '' )}${res[1][item]}`);
                    }
                    
                }
                
            })
            
        }
        ctn.turnText.setText( `Year ${this.turn.year}, week ${this.turn.week}`);
    }
    make_resourceBar(){
        this.resourceContainer = this.add.container(0, 0).setDepth(2);
        const fontStyle ={
            fontFamily:'Arial',
            fontSize: '24px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 }
        }
        const startX = 450;
        const startY = 32;
        const menuBg = this.add.rectangle(0,0,this.scale.width,60,0x000000,0.9).setStrokeStyle(2,0xffffff).setOrigin(0)
        .setInteractive(); // 뒤쪽 인게임 클릭 차단;

        const pauseBtn =  this.makeButton(50,30,80,50, 'MENU');
        pauseBtn.on('pointerdown', () => {
            // GameScene의 pauseGame 메서드 직접 호출 또는 이벤트 발송
            const gameScene = this.scene.get('GameScene');
            gameScene.pauseGame();
        });

        const turnTxt = this.add.text(210, startY, `Year ${this.turn.year}, week ${this.turn.week}`,fontStyle).setOrigin(0.5)

        const padding = 180;
        const manPower = this.makeResourceButton(startX,startY,160,50, '👤',` 0/0/10`);

        const ammo = this.makeResourceButton(startX+padding*1, startY,160,50,'🔫', `0/1000`);

         
        const food = this.makeResourceButton(startX+padding*2,startY,160,50, '🥔',`0/1000`); 

        const misc = this.makeResourceButton(startX+padding*3,startY,160,50, '⚙️', `0/1000`);


        const fuel = this.makeResourceButton(startX+padding*4,startY,160,50, '⛽',`0/1000`); //


        this.resourceContainer.add([menuBg, pauseBtn, turnTxt, manPower, ammo , food, misc, fuel ])
        this.resourceContainer.manPowerText = manPower.nameTxt;
        this.resourceContainer.ammoText = ammo.nameTxt;
        this.resourceContainer.foodText = food.nameTxt;
        this.resourceContainer.miscText = misc.nameTxt;
        this.resourceContainer.fuelText = fuel.nameTxt;
        this.resourceContainer.manPower = manPower;
        this.resourceContainer.ammo = ammo;
        this.resourceContainer.food = food;
        this.resourceContainer.misc = misc;
        this.resourceContainer.fuel = fuel;

        this.resourceContainer.turnText = turnTxt;
        this.renderResourceBar();
    }
    makeResourceButton(x,y, width,height,  icon,text, options={}){
        const container = this.add.container(x,y).setInteractive({ 
            hitArea: new Phaser.Geom.Rectangle(-width/2, -height/2,width, height), 
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            useHandCursor: true // 컨테이너에 직접 커서 설정
        });;
         const iconStyle ={
            fontFamily:'Arial',
            fontSize: '24px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 }
        }
          const fontStyle ={
            fontFamily:'Arial',
            fontSize: '24px',
            fill: '#ffffff',
            align:'right',
            padding:{ x: 2, y: 2 },
            fixedWidth:width
        }
        const color = options.color?? 0x000000;
         const bg = this.add.rectangle(0,0,width,height, color ,1).setStrokeStyle(2,0xffffff).setOrigin(0.5);
        const iconTxt = this.add.text(-width/2+10,0, icon, iconStyle).setOrigin(0,0.5);
        const nameTxt = this.add.text(width/2-10,0,text, fontStyle).setOrigin(1,0.5);

        container.add([bg, iconTxt, nameTxt]);
        container.bg = bg;
        container.nameTxt = nameTxt;
        container.icon = iconTxt;
        return container;
    }


    make_pauseManuContainer() {
        this.pauseMenuContainer = this.add.container(this.scale.width / 2, this.scale.height / 2);
        this.pauseMenuContainer.setVisible(false);
        this.pauseMenuContainer.setDepth(100);

        // 어두운 반투명 배경 레이어 (화면 전체 덮기)
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7)
        .setInteractive({ useHandCursor: true });
        overlay.on('pointerdown', () => {
            // UIScene -> GameScene으로 재개 이벤트 발송
            this.registry.events.emit(GameEvents.GAME_PAUSE,false);
            
        }); 
//            .setInteractive(); // 뒤쪽 인게임 클릭 차단

        // 팝업 박스
        const menuBg = this.add.rectangle(0, 0, 320, 240, 0x222222, 0.95)
            .setStrokeStyle(2, 0xffffff);

        const titleText = this.add.text(0, -80, LanguageData.getText('paused'), {
            fontSize: '28px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // 계속하기 (Resume) 버튼
        const resumeBtn = this.add.text(0, -10, LanguageData.getText('resume'), {
            fontSize: '20px',
            fill: '#00ff00'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        resumeBtn.on('pointerdown', () => {
            // UIScene -> GameScene으로 재개 이벤트 발송
            this.registry.events.emit(GameEvents.GAME_PAUSE,false);
        });

        // 메인 메뉴로 이동 버튼
        const mainBtn = this.makeButton(0,40,160,40,'main_menu');
        mainBtn.on('pointerdown', () => {
            // GameScene과 UIScene을 모두 멈추고 MainMenuScene으로 이동
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');
            this.scene.stop('metaMap');
            
            this.scene.start('MainMenuScene');
        });
        const seedNameText = this.add.text(0, 90, `Seed: ${this.seedName}` , {
            fontSize: '16px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        // 컨테이너에 요소 추가
        this.pauseMenuContainer.add([overlay, menuBg, titleText, resumeBtn, mainBtn,seedNameText]);
    }

    createFloatingText(startX, startY, textureKey, message) {
        // 1. 이미지와 텍스트를 하나로 묶을 컨테이너 생성
        const container = this.add.container(startX, startY).setDepth(20);

        // 2. 이미지 생성 (컨테이너 내부 좌표 0, 0 기준)
        const img = this.add.image(-50, 0, textureKey);
        
        // 3. 텍스트 생성 (이미지 오른쪽에 배치하거나 알맞게 정렬)
        // 원하시는 정렬 방식에 따라 x, y 값을 조절하세요.
        const txt = this.add.text(-30, 0, message, {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 3,
            fontWeight: 'bold'
        }).setOrigin(0, 0.5); // 세로 정렬 중심을 맞춤

        // 4. 컨테이너에 이미지와 텍스트 담기
        container.add([img, txt]);

        // 5. 2초 동안 위로 올라가며 서서히 사라지는 트윈(Tween) 효과 적용
        this.tweens.add({
            targets: container,
            y: startY - 50,       // 2초 동안 위로 50px 만큼 이동
            alpha: 1,             // 투명도를 0으로 만들어 서서히 사라지게 함
            duration: 2000,       // 2000ms = 2초
            ease: 'Linear',       // 일정한 속도로 이동
            onComplete: () => {
                container.destroy(); // 연출이 끝나면 메모리에서 완전히 삭제 (중요)
            }
        });
    }
    
    makeButton(x,y, width,height, text, options={}){
        const container = this.add.container(x,y).setInteractive({ 
            hitArea: new Phaser.Geom.Rectangle(-width/2, -height/2,width, height), 
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            useHandCursor: true // 컨테이너에 직접 커서 설정
        });
         const fontStyle ={
            fontFamily:'Arial',
            fontSize: '16px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 }
        }
        const color = options.color?? 0x000000;
         const bg = this.add.rectangle(0,0,width,height, color ,1).setStrokeStyle(2,0xffffff).setOrigin(0.5);
         
        const nameTxt = this.add.text(0,0, LanguageData.getText(text), fontStyle).setOrigin(0.5);

        container.add([bg, nameTxt]);
        container.bg = bg;
        container.nameTxt = nameTxt;
        return container;
    }
}