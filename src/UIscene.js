// src/UIscene.js
import { GameEvents } from './events.js';
import { LanguageData } from './translate.js';
import { GameData, createFacilityData } from './core/data.js';
import { calculateResourceData, objectCopy, returnMapData } from './core/calculateTurn.js';
import { renderSubModal } from './UIinfoModal.js';

export const zoomRato = {ratio:0.001, min:0.5, max:2.5};

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }
    
    create() {
        const gameScene = this.scene.get('GameScene');
        

        this.turn = {year:2053 , day:1,  week:1 };

        // --------------------------------------------------
        // 2. 일시정지 팝업 메뉴 컨테이너 (초기에는 숨김)
        // --------------------------------------------------
        this.make_pauseManuContainer();

        this.make_resourceBar();
        this.make_tileInfo();
        this.make_subTileInfo();
        this.make_tileDecisionInfo(LanguageData.getText('txt_welcome'), LanguageData.getText( 'txt_welcomeInfo'));

        this.subTileInfoContainerArray= [];
        //ConfirmModal( this, 0,0, LanguageData.getText( 'txt_welcomeInfo'))
        
        //this.registry.events.emit(GameEvents.TURN_END, false);

        //턴 계산
        this.calculateData();

        this.captureButton = this.makeButton( this.scale.width/2, this.scale.height-140,180,60,'captureTheSector',{color:0x2cb9ff}).setDepth(20);
        this.captureButton.setVisible(false);
        this.endTurnButton = this.makeButton( this.scale.width/2, this.scale.height-60,200,60,'EndTurn').setDepth(20);
        this.endTurnButton.on('pointerdown', () => {
            //턴 넘김
             this.turnRepeat();
             return;
            this.turnEnd();
        }); 

         // 반복 실행할 타이머 변수를 초기화합니다.
        this.repeatTimer = null;

        // 스페이스바를 누를 때마다 실행되는 이벤트
        this.input.keyboard.on('keydown-SPACE', () => {
            this.turnRepeat()
        });
        

        // 방향키(위) 또는 W키를 눌렀을 때
        this.input.keyboard.on('keydown-UP', () => { /* 위쪽 이동 */ });
        this.input.keyboard.on('keydown-W', () => { /* 위쪽 이동 */ });
        this.input.keyboard.on('keydown-ENTER', () => { /* 확인 */ });
        
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
            this.decisionContainer = null
        });
        //color data.team >1 ? 0xff4f4f :  0x2cb9ff 
    }
    turnRepeat(){
        if (this.repeatTimer) {
            // 1. 이미 타이머가 돌고 있다면 중단 및 초기화
            this.repeatTimer.remove();
            this.repeatTimer = null;
            console.log('반복 중단');
            this.endTurnButton.nameText.setText(`⏸ ${'EndTurn' }`);
        } else {
            // 2. 타이머가 없다면 0.3초(300ms)마다 반복 시작
            console.log('반복 시작');
            this.endTurnButton.nameText.setText(`▶ ${'EndTurn' }`);
            // (선택) 누르자마자 즉시 1번 실행하고 싶다면 아래 줄 주석 해제
            
            this.repeatTimer = this.time.addEvent({
                delay: 700,                // 
                callback: this.turnEnd,   // 반복 실행할 함수
                callbackScope: this,       // 함수 내부에서 this를 씬(Scene)으로 유지
                loop: true                 // 무한 반복
            });
        }
    }

    make_tileDecisionInfo(titleMessage, infoMessage, onConfirm =null , onConfirm2=null){
        const width = 400;
        const height = 280;
        const startX = -width/2;
        const startY = -100;

        this.decisionContainer = this.add.container(this.scale.width/2, this.scale.height/2).setDepth(10);
        const TitlefontStyle ={
            fontFamily:'Arial',
            fontSize: '28px',
            fill: '#ffffff',
            align: 'center',
            padding:{ x: 2, y: 2 }
        } 
         const fontStyle ={
            fontFamily:'Arial',
            fontSize: '20px',
            fill: '#ffffff',
            align: 'center',
            padding:{ x: 2, y: 2 },
            wordWrap: {
                width: width-20, // 줄바꿈이 일어날 최대 가로 너비 (픽셀)
                useAdvancedWrap: true // 한글/영문 단어 단위 줄바꿈 세부 설정 (선택 사항)
            }
        } 
        const closeModal = ()=>{
          this.decisionContainer.destroy();
          this.decisionContainer = null;  
        };

        
        const menuBg = this.add.rectangle(-width/2,-height/2 +50, width , height ,0x000000,0.7).setStrokeStyle(2,0xffffff)
        .setInteractive().setOrigin(0); // 뒤쪽 인게임 클릭 차단;
        // 어두운 반투명 배경 레이어 (화면 전체 덮기)
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
        overlay.on('pointerdown', () => {
            closeModal();
        }); 

        const titleTxt = this.add.text(0,startY+30, titleMessage ,TitlefontStyle).setOrigin(0.5,0);

        const subTxt = this.add.text(0, startY+80, infoMessage, fontStyle).setOrigin(0.5,0);
        
        const Btconfirm = this.makeButton(0, startY+height-30, 200, 40, LanguageData.getText('confirm'), {color:0x2cb9ff});
        const Bt_A = this.makeButton(-90, startY+height-30, 160, 40, LanguageData.getText('confirm'), {color:0x2cb9ff});
        const Bt_B = this.makeButton(+90, startY+height-30, 160, 40, LanguageData.getText('cancel'));

        this.decisionContainer.items={
            titleText:titleTxt,
            subText:subTxt,
            btConfirm:Btconfirm,
            btA:Bt_A,
            btB:Bt_B
        }
        
         
        Btconfirm.on('pointerdown', ()=>{
            if(onConfirm) onConfirm();
            closeModal();
        });
        Bt_A.on('pointerdown', ()=>{
            if(onConfirm) onConfirm();
            closeModal();
        });
        Bt_B.on('pointerdown', ()=>{
            if(onConfirm2) onConfirm2();
            closeModal();
        });
        if(onConfirm2 !=null){
            Btconfirm.setVisible(false);
        }else{
            Bt_A.setVisible(false);
            Bt_B.setVisible(false);
        }

        
        this.decisionContainer.add( [overlay,  menuBg , titleTxt, subTxt,  Bt_A, Bt_B, Btconfirm]);
        return this.decisionContainer;
    }
    //미사용... 
    makeSubTileInfo(titleText, resourceText, _btUp = null, _btDown= null, _btDel= null){
       
    }

    make_subTileInfo(){
        //서브 타일 항목
        this.subTileInfoContainer  = this.add.container(this.scale.width/2, this.scale.height/2).setDepth(10);
        const fontStyle ={
            fontFamily:'Arial',
            fontSize: '24px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 },
            wordWrap: {
                width: 280, // 줄바꿈이 일어날 최대 가로 너비 (픽셀)
                useAdvancedWrap: true // 한글/영문 단어 단위 줄바꿈 세부 설정 (선택 사항)
            }
        } 

        const startX = 340-this.scale.width/2;
        const startY = 150-this.scale.height/2;
        const menuBg = this.add.rectangle(startX,startY,300,400,0x000000,0.7).setStrokeStyle(2,0xffffff)
        .setInteractive().setOrigin(0); // 뒤쪽 인게임 클릭 차단;
        menuBg.on('pointerdown', () => {
            //this.subTileInfoContainer.setVisible(false);
        });
        // 어두운 반투명 배경 레이어 (화면 전체 덮기)
        const overlay = this.add.rectangle(320, 0, this.scale.width, this.scale.height, 0x000000, 0.1)
        .setInteractive({ useHandCursor: true });
        overlay.on('pointerdown', () => {
            this.subTileInfoContainer.setVisible(false);
            
        }); 
        const titleTxt = this.add.text(startX+10,startY+10, 'title' ,fontStyle).setOrigin(0);

        const infoTxt = this.add.text(startX+10, startY+ 160, 'info', fontStyle).setOrigin(0).setFontSize(20);
        
        const resourceTxt = this.add.text(startX+10,startY+50, 'Resource: ' ,fontStyle).setOrigin(0).setFontSize(16);
        const bar = this.add.graphics();
        
        const btDel = this.makeButton(startX+150, startY+360, 240,50, LanguageData.getText('demolition'));
        const btUp = this.makeButton(startX+270,startY +110, 40,40, '+');
        const btDown = this.makeButton(startX +30,startY +110, 40,40, '-');
        const laborTxt = this.add.text(startX+150, startY +110 , `${LanguageData.getText('labor')}: 0`, {
            fontFamily:'Arial',
            fontSize: '24px',
            fill: '#ffffff',
            align:'center',
            padding:{ x: 2, y: 2 }
        } ).setOrigin(0.5);

        this.subTileInfoContainer.add( [ overlay, menuBg, titleTxt, infoTxt, resourceTxt, bar , btDel, btUp, btDown, laborTxt]);
        this.subTileInfoContainer.items={
            titleText:titleTxt,
            infoText:infoTxt,
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
        if(isVisible){
             renderSubModal( this, data);
        }else{
            if(this.subTileInfoContainer) {
                this.subTileInfoContainer.destroy();
                this.subTileInfoContainer=null;
            }         
        }
        return;
        
    }

    renderPercentageBar(bar,data, startX, startY, width, height=10){
        const amount = data.status=='building'? data.buildTime : data.amount;
        const maxAmount= data.status=='building'? data.maxBuildTime : data.maxAmount;

        const percentage = amount / maxAmount ?? 0 // 비율 계산 (0 ~ 1)    
        bar.clear();        
        bar = this.add.graphics();
        bar.fillStyle(0x333333, 1); // 어두운 회색 배경
        bar.fillRect(startX, startY, width, height);
        // [잔여량 게이지 상자] 게이지가 차오르는 색상 (예: 녹색 0x00ff00)
        if (percentage > 0) {
            bar.fillStyle(0x00ff00, 1); 
            bar.fillRect(startX, startY, width * percentage, height);
        }
        return {bar:bar, amount:amount, maxAmount:maxAmount, percentage:percentage};
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
        const bar = this.add.graphics();
        const radTxt = this.add.text(startX+20, startY+60, 'Rad: ' , fontStyle).setOrigin(0).setFontSize(18);

        const facilityContainer = this.add.container(startX, startY+90);
        const facilityBg = this.add.rectangle(10, 0, 280,380, 0x000000, 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
        const facilityTxt = this.add.text(20, 10, LanguageData.getText('facility') ,fontStyle).setOrigin(0);

        const facilitySlot = this.add.text(280,10, 'slot 1/5', fontStyle).setOrigin(1,0).setAlign('right');

        

        facilityContainer.add([facilityBg,facilityTxt,facilitySlot]);

        const garrisonContainer = this.add.container(startX,startY+450);
        const garrisonBg = this.add.rectangle(10,0,280,200, 0x000000, 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
         const garrisonTxt = this.add.text(20, 10, LanguageData.getText('garrison') ,fontStyle).setOrigin(0);
        garrisonContainer.add([garrisonBg,garrisonTxt]);

         const facilityList = [];
         const garrisonList = [];
        this.tileInfoContainer.items ={
            titleText :titleTxt,
            bar:bar,
            radText:radTxt,
            facilityList: facilityList,
            garrisonList: garrisonList,
            facilityContainer: facilityContainer,
            garrisonContainer: garrisonContainer,
            slotText:facilitySlot,
            startX: startX,
            startY: startY,
            tileImage : tileImage,
            facilityText:facilityTxt,
            garrisonText:garrisonTxt
        }
        this.tileInfoContainer.add([menuBg,facilityContainer, garrisonContainer,  tileImage,bgGraphics, returnButton,titleTxt, radTxt ]);

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
        const fontStyleR ={
            fontFamily:'Arial',
            fontSize: '20px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 }
        }
        
        const bgcolor = data.team? ( data.team >1 ? 0xff4f4f :  0x2cb9ff  ) : ( 0x000000 ); 
        const bg = this.add.rectangle(0,0, width,height, (bgColor!=null? bgColor :bgcolor) , 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
        
        let num = '';
        if(data.isWorkable ) num = `(${data.labor}/${data.maxLabor})`;
        if(data.type == 'house') num = `(${data.amount}/${data.maxAmount})`;
        let name =`${ LanguageData.getText(data.tag)} ${ num }` 
        const nameTxt = this.add.text(40,5, name , fontStyle).setOrigin(0).setFontSize(18);

        let text = `${data.type} ${data.resource? ': '+data.resource :''}`;
        if(data.amount){
            text = `${data.type} ${data.amount}/${data.maxAmount} (${Math.ceil(data.amount/data.maxAmount*100)}%)`;
        }
        if(data.work){
            if(data.work.amount > data.amount){
                text =`Work: ${data.work.tag} - ${data.work.amount}/${data.work.maxAmount} (${Math.ceil(data.work.amount/data.work.maxAmount*100)}%)`;
            }else{
                text = `${data.work.tag} ${data.amount}/${data.maxAmount} (${Math.ceil(data.amount/data.maxAmount*100)}%)`;
                
            }
        }else{
            
            
        }
        const infoTxt = this.add.text(40,25,text, fontStyle).setOrigin(0);

        const slotTxt = this.add.text(width-5, 5, data.slot!=null? `slot: ${data.slot}`:'', fontStyle).setOrigin(1,0).setAlign('right').setFontSize(16);

        const icon = this.add.image(4,12,'icon').setOrigin(0);

        let bar = this.add.graphics();
        let barData = this.renderPercentageBar(bar, data.work? (data.work.amount > data.amount ? data.work : data ) : data , 0,height-10, width, 10)
        bar = barData.bar;
       

        container.add([bg,nameTxt,infoTxt,slotTxt, icon, bar]);
        container.bar = bar;
        container.itemData = data;
        container.nameText = nameTxt;
        container.infoText = infoTxt;
        container.slotText = slotTxt;
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
        this.captureButton.setVisible(false);
        const items = this.tileInfoContainer.items;

        if(tileData.rad>0){
            items.bar.clear();
            const maxRad = 10;
            const sx = items.startX+10;
            const sy =  items.startY+80;
            const percentage = tileData.rad / maxRad;        
            items.bar = this.add.graphics();
            items.bar.fillStyle(0x333333, 1); // 어두운 회색 배경
            items.bar.fillRect(sx, sy, 280, 10);

            // [잔여량 게이지 상자] 게이지가 차오르는 색상 (예: 녹색 0x00ff00)
            if (percentage > 0) {
                items.bar.fillStyle(0x00ff00, 1); 
                items.bar.fillRect(sx,sy, 280 * percentage, 10);
            }
            this.tileInfoContainer.add(items.bar);
            items.radText.setText( `Rad: ${tileData.rad}/${maxRad}(${ Math.ceil(percentage*1000)/10 }%)`)
            items.bar.setVisible(true);
        
        }

       if(tileData.facility.length>=0){
            items.facilityContainer.setVisible(true);
            for(let i= 0; i<tileData.facility.length ; i++){

                const data = tileData.facility[i];

                const container = this.make_tileInfoContainer(tileData.team, data, items.facilityContainer.x +15 ,items.facilityContainer.y +i*70 +45);
                 container.on('pointerdown', () => {
                    //서브항목 호출
                    if(tileData.team!=1) return;
                    this.calculateData();
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
                color = 0x43c563;
                //지역 점령
                 this.captureButton.setVisible(true);
                 this.captureButton.nameText.setText(LanguageData.getText('txt_capture'));
                 this.captureButton.bg.setFillStyle( color )
                 this.captureButton.off('pointerdown');
                 this.captureButton.on('pointerdown', ()=>{
                    const path = metaMap.calculatePath(tileData.q, tileData.r, true);
                    
                    const confirm2 = ()=>{ };
                    const confirm1 = ()=>{
                        //점령 확인
                        if(path.length ==0){  
                            this.captureButton.setVisible(false);
                            console.warn('no path'); 
                            return;
                        }else{
                            //연료가 소모됨
                            if(GameData.saveData.fuel - path.length>=0){
                                GameData.saveData.fuel -= path.length;
                            }else{
                                this.captureButton.setVisible(false);
                                console.warn('no fuel'); 
                                return;
                            }
                        }
                        
                        tileData.team = 1;

                        //자원통합?
                        /*
                        tileData.res = metaMap.playerTile.res;
                        tileData.res.foods = metaMap.playerTile.res.foods;
                         tileData.res.miscs = metaMap.playerTile.res.miscs;
                        */
                        GameData.saveData.fuel -= path.length;
                        metaMap.renderHexTile(tileData.r, tileData.q);
                        metaMap.hexTileFogVisible( tileData.r, tileData.q);
                        this.calculateData();
                        //metaMap.events.emit(GameEvents.RENDER_TILE, {r:this.tileData.r, q:this.tileData.q, team:1} );
                        this.forceUpdateTileInfo();
                        this.renderResourceBar();
                    }
                    this.make_tileDecisionInfo(LanguageData.getText('txt_capture'),
                        `${LanguageData.getText('txt_captureinfo')}\n\n Fuel: -${path.length}`,
                        confirm1, confirm2);

                })
            }
            else if(tileData.team>1){
                obj = { tag:'attack', type:'', conquest:true};
                color =0xff2d2a;
                this.captureButton.setVisible(true);
                this.captureButton.nameText.setText(LanguageData.getText('txt_attack'));
                 this.captureButton.bg.setFillStyle( color )
                 this.captureButton.off('pointerdown');
                 this.captureButton.on('pointerdown', ()=>{

                 
                    const path = metaMap.calculatePath(tileData.q, tileData.r, true);
                    const confirm2 = ()=>{ 
                        //수동공격
                        this.captureButton.setVisible(false);
                        //this.scene.close();
                    };
                    const confirm1 = ()=>{
                        //자동공격 (WIP)
                        //주둔군 편성 및 추가 기능을 넣어야함... 
                        this.captureButton.setVisible(false);
                        if(Math.random() < 0.4){
                            console.warn('패배했습니다')
                        }else{
                            console.warn('전투 승리, 지역을 점령합니다.')
                            tileData.team = 1;
                            GameData.saveData.fuel -= path.length;
                            if(tileData.garrison.length>0){
                                //주둔군이 있는 경우
                                for(let i = 0 ; i < tileData.garrison.length ; i++){
                                    const inf = tileData.garrison[i];
                                    inf.team = 1;

                                }
                            }
                            metaMap.renderHexTile(tileData.r, tileData.q);
                            metaMap.hexTileFogVisible( tileData.r, tileData.q);
                        }
                        //metaMap.events.emit(GameEvents.RENDER_TILE, {r:this.tileData.r, q:this.tileData.q, team:1} );
                        this.forceUpdateTileInfo();
                        this.renderResourceBar();
                        this.turnEnd();
                    }
                    const dec = this.make_tileDecisionInfo(
                        LanguageData.getText('txt_attack'),
                        `${LanguageData.getText('txt_attackinfo')}\n\n Fuel: -${path.length}` ,
                        confirm1, confirm2);
                    dec.items.btA.nameTxt.setText(LanguageData.getText('attack_auto'));
                    dec.items.btB.nameTxt.setText(LanguageData.getText('attack_manual'));
                })
            }
            else{
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
                    
                });    
                items.facilityList.push(addFacilityBt);
                this.tileInfoContainer.add(addFacilityBt);
            }
                
            
           
            
        }
        if(tileData.garrison.length>=0){
            return;
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
        //this.calculateData();
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
        //디버그
        //console.log(tileData.res);

        if(tileData.explored && tileData.tag != 'empty'){

            if(items.tileImage)  items.tileImage.setTexture(`tile_${tileData.tag}` ?? 'tile_fog');

            items.titleText.setText( 
                `${LanguageData.getText( tileData.tag)} (${tileData.q},${tileData.r}) ${tileData.team>0? 'team '+tileData.team :''}` );
            this.renderTileInfoList( tileData);
            
            let num = 0;
            for(let i = 0; i <tileData.facility.length; i++){ if(tileData.facility[i].slot!=null) num+= tileData.facility[i].slot }
            let maxNum = tileData.slot;
            items.facilityText.setText( `${LanguageData.getText('facility')}`  );
            items.slotText.setText(`slot: ${num}/${maxNum}`)
        }else{
            //미탐험지역
            this.captureButton.setVisible(false)
            items.titleText.setText(`미탐험지역`)
            items.facilityText.setText( `${LanguageData.getText('facility')} `  );
            this.clearTileInfoList();
        }
        
    }
    renderResourceBar( res =null, turnEnd =false ){
        const ctn = this.resourceContainer;
        const manpower = {baby:0, child:0, adult:0, house:0 }
        //ctn.manPowerText.setText( `${manpower.adult}/${manpower.house}`);

         const metaMap = this.scene.get('metaMap');
            const res0 = returnMapData(metaMap);
            const res1 = res0[1];
            const count = {fresh:0, perm:0, house:0, labor:0, misc:0}
           // console.log(res[1])
            for(let n =0 ; n < res1.length; n++){
                const tileRes = res1[n].res;
                count.house+= tileRes.house;
                count.labor+= tileRes.labor;
                //console.table(tileRes.foods)
                for(let i = 0 ; i<tileRes.foods.length ;i++){
                    const food = tileRes.foods[i];
                    count[food.fresh]+=food.num;
                }

                for(let i = 0 ; i<tileRes.miscs.length ;i++){
                    const item= tileRes.miscs[i];
                    count.misc +=item.num;
                }
            }
           //console.warn(`Total foods: \nfresh: ${count.fresh}/ perm: ${count.perm}`);

        const data = GameData.saveData;
        //metaMap.calculateResource(false);
        //인벤토리 구현 및 아이템 sum 후 수치표현
        //console.log(data)

        
        /*const foodType = {fresh:0, perm:0}
        for(let n = 0; n<data.foods.length ; n++){
            const item = data.foods[n];
            foodType[item.fresh]+= item.num;    
        }
        data.food = foodType.fresh + foodType.perm;
        */
        data.food = count.fresh+count.perm;
        data.misc = count.misc;

        ctn.manPowerText.setText(`${count.labor}/${data.pop.length} 🏠${count.house}`);
        ctn.ammoText.setText(`${data.ammo}`);
        ctn.foodText.setText(`${count.fresh}/${count.perm}`);
        ctn.miscText.setText(`${data.misc}`);
        ctn.fuelText.setText(`${data.fuel}`);

        if(res !=null){
            if(turnEnd){
                this.turn.day++;
                if(this.turn.day>365) {
                    this.turn.day =1;
                    this.turn.year++
                }
                //console.log(data)
                Object.keys(res[1]).forEach((item) => {
                //console.log(`${item}:${res[1][item]}`)
                    
                    if(res[1][item]!=0 && res[1][item].length ==null){
                        //배열이 아닌 경우
                        if(ctn[item] !=null){
                           // data[item] += res[1][item];
                            this.createFloatingText( ctn[item].x, ctn[item].y+30, '', `${(res[1][item]>0 ? '+': '' )}${res[1][item]}`); 
                        }
                    
                        if(item =='death'){
                            this.createFloatingText( ctn.manPower.x+40, ctn.manPower.y+30, '', 
                            `-${res[1][item]}`);
                        }
                    }
                    if(res[1].foods.length>0){
                        for(let n =0 ;n < res[1].foods.length; n++){
                            const item = res[1].foods[n];
                            //data.food += item.num;
                             this.createFloatingText( ctn.food.x, ctn.food.y+60+ n*30,
                                 ``,
                                 `${item.tag} ${(item.num>0 ? '+': '' )}${item.num}`); 
                        }
                    }
                    if(res[1].miscs.length>0){
                        for(let n =0 ;n < res[1].miscs.length; n++){
                            const item = res[1].miscs[n];
                           // data.misc += item.num;
                             this.createFloatingText( ctn.misc.x+30, ctn.misc.y+60 + n*30,
                                 ``,
                                 `${item.tag} ${(item.num>0 ? '+': '' )}${item.num}`); 
                        }
                    }
                })
            }
            
        }
        ctn.turnText.setText( `Year ${this.turn.year}, day ${this.turn.day}`);
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
        manPower.on('pointerdown', ()=>{
            /*
            const data = GameData.saveData;
            let txt = `house: ${data.house} \npopList: ${data.pop.length}\n`;
            for(let n = 0; n<data.pop.length ; n++){
                const person = data.pop[n];
            }
            console.warn(txt);
            console.table(data.pop);
            */
            const metaMap = this.scene.get('metaMap');
            const res = returnMapData(metaMap);
            const res1 = res[1];
            const count = {house:0, labor:0 }
           // console.log(res[1])
            for(let n =0 ; n < res1.length; n++){
                const tileRes = res1[n].res;
                count.house+= tileRes.house;
                count.labor+= tileRes.labor;
                for(let i = 0; i<res1[n].facility.length ; i++){
                    const facil = res1[n].facility[i];
                    if(facil.type=='house'){
                        console.table(facil.pop)
                    }
                }
            }
            console.warn(`labor:${count.labor}, house: ${count.house}`)
            
        })
        

        const ammo = this.makeResourceButton(startX+padding*1, startY,160,50,'🔫', `0/1000`);

         
        const food = this.makeResourceButton(startX+padding*2,startY,160,50, '🥔',`0/1000`); 
        food.on('pointerdown', ()=>{

            const metaMap = this.scene.get('metaMap');
            const res = returnMapData(metaMap);
            const res1 = res[1];
            const count = {fresh:0, perm:0}
           // console.log(res[1])
            for(let n =0 ; n < res1.length; n++){
                console.log( `tile ${res1[n].tag} (${res1[n].r} , ${res1[n].q})` );
                const tileRes = res1[n].res;
                console.table(tileRes.foods)
                for(let i = 0 ; i<tileRes.foods.length ;i++){
                    const food = tileRes.foods[i];
                    count[food.fresh]+=food.num;
                }
            }
           console.warn(`Total foods: \nfresh: ${count.fresh}/ perm: ${count.perm}`);
        })

        const misc = this.makeResourceButton(startX+padding*3,startY,160,50, '⚙️', `0/1000`);
         misc.on('pointerdown', ()=>{

              const metaMap = this.scene.get('metaMap');
            const res = returnMapData(metaMap);
            const res1 = res[1];
            const count = {misc:0}
             for(let n =0 ; n < res1.length; n++){
                console.log( `tile ${res1[n].tag} (${res1[n].r} , ${res1[n].q})` );
                const tileRes = res1[n].res;
                console.table(tileRes.miscs)
                for(let i = 0 ; i<tileRes.miscs.length ;i++){
                    const item = tileRes.miscs[i];
                    count.misc+=item.num;
                }
            }
            console.warn(`Total miscs: ${count.misc}`);
        })


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
    calculateData(){
        const metaMap = this.scene.get('metaMap');
        const res= calculateResourceData(metaMap);
        this.renderResourceBar( res );
    }
    turnEnd(){
        this.registry.events.emit(GameEvents.TURN_END, true);
        this.calculateData();
        this.forceUpdateTileInfo();
        //this.renderSubTileInfo(null,false);
        this.createFloatingText( this.endTurnButton.x, this.endTurnButton.y, '','endTurn');
        if(this.subTileInfoContainer!=null){
            if(this.subTileInfoContainer.func!=null) this.subTileInfoContainer.func();
        }
        for(let i = 0 ; i<this.subTileInfoContainerArray.length ; i++){
            if(this.subTileInfoContainerArray[i].func !=null) this.subTileInfoContainerArray[i].func();
        }
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
        container.nameText = nameTxt;
        return container;
    }


}