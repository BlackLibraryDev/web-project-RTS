// src/UIscene.js
import { GameEvents } from './events.js';
import { LanguageData } from './translate.js';

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
        const facilityBg = this.add.rectangle(startX+10, startY+40, 280,400, 0x000000, 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
        const facilityTxt = this.add.text(startX+30, -270, LanguageData.getText('facility') ,fontStyle).setOrigin(0);

        const garrisonBg = this.add.rectangle(startX+10,startY+450,280,200, 0x000000, 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
         const garrisonTxt = this.add.text(startX+30, 140, LanguageData.getText('garrison') ,fontStyle).setOrigin(0);

         const facilityList = [];
         const garrisonList = [];
        this.tileInfoContainer.items ={
            titleText :titleTxt,
            facilityList: facilityList,
            garrisonList: garrisonList,
            startX: startX,
            startY: startY
        }
        this.tileInfoContainer.add([menuBg, titleTxt ,facilityBg, facilityTxt, garrisonBg , garrisonTxt]);

       // this.tileInfoContainer.setVisible(false);//기본값 안보이게
    }
    make_tileInfoContainer(data, startX, startY){
        const container = this.add.container(startX,startY);
        const fontStyle ={
            fontFamily:'Arial',
            fontSize: '16px',
            fill: '#ffffff',
            padding:{ x: 2, y: 2 }
        }
            
        const bg = this.add.rectangle(0,0, 270,60, 0x000000, 0.7).setStrokeStyle(2,0xffffff).setOrigin(0);
        const nameTxt = this.add.text(40,5, LanguageData.getText(`${data.name}`), fontStyle).setOrigin(0).setFontSize(20);

        let text = `${data.type} ${data.resource? ': '+data.resource :''}`
        const infoTxt = this.add.text(40,25,text, fontStyle).setOrigin(0);

        const icon = this.add.image(4,12,'icon').setOrigin(0)
        container.add([bg,nameTxt,infoTxt,icon]);
        return container;
    }


    make_tileInfoList(tileData ){
        const items = this.tileInfoContainer.items;
        for(let i = 0; i<items.facilityList.length; i++){
            this.tileInfoContainer.remove( items.facilityList[i], true);
            items.facilityList[i].destroy();
        }
        items.facilityList = [];
        
        for(let i= 0; i<tileData.facility.length ; i++){

            const data = tileData.facility[i];

            const container = this.make_tileInfoContainer(data, items.startX +15 ,items.startY +i*70 +85);
            
            items.facilityList.push(container);
            this.tileInfoContainer.add(container);
        
        }
        const addFacilityBt = this.make_tileInfoContainer({name:'(add Facility)', type:''}, items.startX+15, items.startY + tileData.facility.length*70 +85);
        items.facilityList.push(addFacilityBt);
        this.tileInfoContainer.add(addFacilityBt);
        


    }
    setTileInfo(tileData){
        this.tileInfoContainer.setVisible(true);
        const items = this.tileInfoContainer.items;
        if(tileData.explored){
            items.titleText.setText( `${tileData.name} (${tileData.q},${tileData.r})` );
            this.make_tileInfoList( tileData);
        }else{
            //미탐험지역
            items.titleText.setText(`미탐험지역`)
        }
        
    }

    make_pauseManuContainer() {
         this.pauseMenuContainer = this.add.container(this.scale.width / 2, this.scale.height / 2);
        this.pauseMenuContainer.setVisible(false);

        // 어두운 반투명 배경 레이어 (화면 전체 덮기)
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7)
            .setInteractive(); // 뒤쪽 인게임 클릭 차단

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
        const mainBtn = this.add.text(0, 40, LanguageData.getText('main_menu'), {
            fontSize: '20px',
            fill: '#ff4444'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

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
}