// src/UIscene.js
import { GameEvents } from './events.js';
import { LanguageData } from './translate.js';

export const zoomRato = {ratio:0.001, min:0.5, max:2.5};

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        const gameScene = this.scene.get('GameScene');

        // --------------------------------------------------
        // 1. 일시정지 UI 버튼 (우상단)
        // --------------------------------------------------
        const pauseBtn = this.add.text(this.scale.width - 20, 20, '⏸️ PAUSE', {
            fontSize: '18px',
            fill: '#ffffff',
            backgroundColor: '#333333',
            padding: { x: 10, y: 6 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        pauseBtn.on('pointerdown', () => {
            // GameScene의 pauseGame 메서드 직접 호출 또는 이벤트 발송
            gameScene.pauseGame();
        });

        // --------------------------------------------------
        // 2. 일시정지 팝업 메뉴 컨테이너 (초기에는 숨김)
        // --------------------------------------------------
        this.make_pauseManuContainer();

        this.make_tileInfo();

        // --------------------------------------------------
        // 3. GameScene 이벤트 수신
        // --------------------------------------------------
        gameScene.events.on(GameEvents.TOGGLE_PAUSE, (isPaused) => {
            this.pauseMenuContainer.setVisible(isPaused);
        }, this);

        
    }
    make_tileInfo(){
        this.tileInfoContainer = this.add.container(this.scale.width/2, this.scale.height/2)
        const fontStyle ={
            fontFamily:'Arial',
            fontSize: '24px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 }
        }
        const startX = 30-this.scale.width/2;
        const startY = 40-this.scale.height/2;
        const menuBg = this.add.rectangle(startX+150,0,300,this.scale.height-40,0x000000,0.7).setStrokeStyle(2,0xffffff)
        .setInteractive(); // 뒤쪽 인게임 클릭 차단;

        const titleTxt = this.add.text(startX+20,startY, 'title' ,fontStyle).setOrigin(0);

        const facilityContainer = this.add.container(startX, startY+40);
        const facilityBg = this.add.rectangle(10, 0, 280,400, 0x000000, 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
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
            startY: startY
        }
        this.tileInfoContainer.add([menuBg, titleTxt ,facilityContainer, garrisonContainer]);

       // this.tileInfoContainer.setVisible(false);//기본값 안보이게
    }
    make_tileInfoContainer(data, startX, startY, bgColor =null){
        const container = this.add.container(startX,startY);
        const fontStyle ={
            fontFamily:'Arial',
            fontSize: '16px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 }
        }
        const bgcolor = data.team? ( data.team >1 ? 0xff4f4f :  0x2cb9ff  ) : ( 0x000000 ); 
        const bg = this.add.rectangle(0,0, 270,60, (bgColor!=null? bgColor :bgcolor) , 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
        const nameTxt = this.add.text(40,5, LanguageData.getText(`${data.name}`), fontStyle).setOrigin(0).setFontSize(20);

        let text = `${data.type} ${data.resource? ': '+data.resource :''}`
        const infoTxt = this.add.text(40,25,text, fontStyle).setOrigin(0);

        const icon = this.add.image(4,12,'icon').setOrigin(0)

        container.add([bg,nameTxt,infoTxt,icon]);
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
    }
    renderTileInfoList(tileData ){
        this.clearTileInfoList();
        const items = this.tileInfoContainer.items;

       if(tileData.facility.length>=0){
            items.facilityContainer.setVisible(true);
            for(let i= 0; i<tileData.facility.length ; i++){

                const data = tileData.facility[i];

                const container = this.make_tileInfoContainer(data, items.facilityContainer.x +15 ,items.facilityContainer.y +i*70 +45);
                
                items.facilityList.push(container);
                this.tileInfoContainer.add(container);
            
            }
            if(tileData.team==1){
                 const addFacilityBt = this.make_tileInfoContainer({name:'(add Facility)', type:''}, 
                    items.facilityContainer.x+15, items.facilityContainer.y + tileData.facility.length*70 +45,
                    0x43c563);
                items.facilityList.push(addFacilityBt);
                this.tileInfoContainer.add(addFacilityBt);
            }
           
            
        }
        if(tileData.garrison.length>=0){
            items.garrisonContainer.setVisible(true);
            for(let i= 0; i<tileData.garrison.length ; i++){

                const data = tileData.garrison[i];

                const container = this.make_tileInfoContainer(data, items.garrisonContainer.x +15 ,items.garrisonContainer.y +i*70 +45);
                
                items.garrisonList.push(container);
                this.tileInfoContainer.add(container);
            
            }
            if(tileData.team==1){
                 const addGarrisonBt = this.make_tileInfoContainer({name:'(add Garrison)', type:''}, 
                    items.garrisonContainer.x+15, items.garrisonContainer.y + tileData.garrison.length*70 +45,
                    0x43c563);
                items.garrisonList.push(addGarrisonBt);
                this.tileInfoContainer.add(addGarrisonBt);
            }

        }

    }
    setTileInfo(tileData){
        this.tileInfoContainer.setVisible(true);
        const items = this.tileInfoContainer.items;
        if(tileData.explored && tileData.name != 'empty'){
            items.titleText.setText( 
                `${tileData.name} (${tileData.q},${tileData.r}) ${tileData.team>0? 'team '+tileData.team :''}` );
            this.renderTileInfoList( tileData);
        }else{
            //미탐험지역
            items.titleText.setText(`미탐험지역`)
            this.clearTileInfoList();
        }
        
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
            this.events.emit(GameEvents.GAME_RESUMED);
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
            this.events.emit(GameEvents.GAME_RESUMED);
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

        // 컨테이너에 요소 추가
        this.pauseMenuContainer.add([overlay, menuBg, titleText, resumeBtn, mainBtn]);
    }
    makeButton(x,y, width,height, text, options={}){
        const container = this.add.container(x,y).setInteractive({ 
            hitArea: new Phaser.Geom.Rectangle(-width/2, -height/2,width, height), 
            hitAreaCallback: Phaser.Geom.Rectangle.Contains,
            useHandCursor: true // 컨테이너에 직접 커서 설정!
        });;
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
        return container;
    }
}