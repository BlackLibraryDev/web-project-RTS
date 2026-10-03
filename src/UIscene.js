// src/UIscene.js
import { GameEvents } from './events.js';

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

        // --------------------------------------------------
        // 3. GameScene 이벤트 수신
        // --------------------------------------------------
        gameScene.events.on(GameEvents.TOGGLE_PAUSE, (isPaused) => {
            this.pauseMenuContainer.setVisible(isPaused);
        }, this);

        // 화면 크기 변경 시 팝업 위치 재조정
        this.scale.on('resize', (gameSize) => {
            this.pauseMenuContainer.setPosition(gameSize.width / 2, gameSize.height / 2);
            overlay.setSize(gameSize.width, gameSize.height);
        });
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

        const titleText = this.add.text(0, -80, 'PAUSED', {
            fontSize: '28px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // 계속하기 (Resume) 버튼
        const resumeBtn = this.add.text(0, -10, '[ 계속하기 ]', {
            fontSize: '20px',
            fill: '#00ff00'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        resumeBtn.on('pointerdown', () => {
            // UIScene -> GameScene으로 재개 이벤트 발송
            this.events.emit(GameEvents.GAME_RESUMED);
        });

        // 메인 메뉴로 이동 버튼
        const mainBtn = this.add.text(0, 40, '[ 메인 메뉴로 ]', {
            fontSize: '20px',
            fill: '#ff4444'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        mainBtn.on('pointerdown', () => {
            // GameScene과 UIScene을 모두 멈추고 MainMenuScene으로 이동
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');
            this.scene.start('MainMenuScene');
        });

        // 컨테이너에 요소 추가
        this.pauseMenuContainer.add([overlay, menuBg, titleText, resumeBtn, mainBtn]);
    }
}