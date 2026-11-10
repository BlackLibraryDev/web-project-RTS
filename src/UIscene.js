// src/UIscene.js
import { GameEvents } from './events.js';
import { LanguageData } from './translate.js';
import { GameData } from './core/data.js';

export const zoomRato = {ratio:0.001, min:0.5, max:2.5};

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }
    
    create() {
        const gameScene = this.scene.get('GameScene');

    
        // --------------------------------------------------
        // 2. 일시정지 팝업 메뉴 컨테이너 (초기에는 숨김)
        // --------------------------------------------------
        this.make_pauseManuContainer();

        this.make_resourceBar();
        this.make_tileInfo();
        this.registry.events.emit(GameEvents.TURN_END, false);

        this.endTurnButton = this.makeButton( this.scale.width/2, this.scale.height-60,200,60,'EndTurn');
        this.endTurnButton.on('pointerdown', () => {
            //턴 넘김
             
            this.registry.events.emit(GameEvents.TURN_END, true);
           this.forceUpdateTileInfo();

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
        });
        
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
        container.on('pointerdown', () => {
            //클릭 시 
            if(team !=1){return }
            if(data.add !=null){
                console.log(`add ${data.add}`);
                return;
            }
            const player = GameData.saveData;
          //  console.log(data.labor)
            if(data.labor!=null){
              //  console.log(player)
                if(player.manPower>0){
                    
                    player.manPower--;
                    data.labor++
                }
            }
            this.forceUpdateTileInfo();
            this.renderResourceBar();
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
        
        let name =`${ LanguageData.getText(data.name)} ${ data.labor!=null? '('+data.labor+')':''}` 
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

                const container = this.make_tileInfoContainer(tileData.team, data, items.facilityContainer.x +15 ,items.facilityContainer.y +i*70 +45);
                
                items.facilityList.push(container);
                this.tileInfoContainer.add(container);
            
            }
            if(tileData.team==1){
                 const addFacilityBt = this.make_tileInfoContainer(tileData.team,{ name:'(add Facility)', type:'', add:'facility'}, 
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

                const container = this.make_tileInfoContainer(tileData.team, data, items.garrisonContainer.x +15 ,items.garrisonContainer.y +i*70 +45);
                
                items.garrisonList.push(container);
                this.tileInfoContainer.add(container);
            
            }
            if(tileData.team==1){
                 const addGarrisonBt = this.make_tileInfoContainer(tileData.team, {name:'(add Garrison)', type:'' ,add:'garrison'}, 
                    items.garrisonContainer.x+15, items.garrisonContainer.y + tileData.garrison.length*70 +45,
                    0x43c563);
                items.garrisonList.push(addGarrisonBt);
                this.tileInfoContainer.add(addGarrisonBt);
            }

        }

    }
    forceUpdateTileInfo(){
        if(this.tileData){
            const metaMap = this.scene.get('metaMap');
            metaMap.events.emit(GameEvents.TILE_CLICKED, {r:this.tileData.r, q:this.tileData.q} );
        }
    }
    setTileInfo(tileData){
        if(!this.tileInfoContainer) return
        this.tileInfoContainer.setVisible(true);
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
    renderResourceBar( res =null ){
        const ctn = this.resourceContainer;
        const manpower = {baby:0, child:0, adult:0, house:0 }
        ctn.manPowerText.setText( `${manpower.adult}/${manpower.house}`);

        const data = GameData.saveData;
        //인벤토리 구현 및 아이템 sum 후 수치표현
        ctn.manPowerText.setText(`${data.manPower}/${data.house}`);
        ctn.ammoText.setText(`${data.ammo}/1000`);
        ctn.foodText.setText(`${data.food}/1000`);
        ctn.miscText.setText(`${data.misc}/1000`);
        ctn.fuelText.setText(`${data.fuel}/1000`);

        if(res !=null){
            Object.keys(res[1]).forEach((item) => {
               // console.log(`${item}:${res[1][item]}`)
                if(ctn[item] !=null){
                    if(res[1][item]!=0){
                        this.createFloatingText( ctn[item].x, ctn[item].y+30, '', res[1][item]);
                    }
                    
                }
                
            })
            
        }
        
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

        const padding = 180;
        const manPower = this.makeResourceButton(startX,startY,160,50, '👤',` 0/0/10`);

        const ammo = this.makeResourceButton(startX+padding*1, startY,160,50,'🔫', `0/1000`);

         
        const food = this.makeResourceButton(startX+padding*2,startY,160,50, '🥔',`0/1000`); 

        const misc = this.makeResourceButton(startX+padding*3,startY,160,50, '⚙️', `0/1000`);


        const fuel = this.makeResourceButton(startX+padding*4,startY,160,50, '⛽',`0/1000`); //


        this.resourceContainer.add([menuBg, pauseBtn, manPower, ammo , food, misc, fuel ])
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