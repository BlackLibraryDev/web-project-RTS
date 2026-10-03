// src/gameScene.js
import { GameEvents } from './events.js';
import { GameData } from './data.js';


export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        this.tileMap = new Map(); // (q, r) 키 기반 타일 인스턴스 저장소
    }

    create() {
        // UI 씬 병렬 실행
        this.scene.run('UIScene');

        // ESC 키 등록
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // --------------------------------------------------
        // Scene 라이프사이클 이벤트 및 커스텀 이벤트 처리
        // --------------------------------------------------

        // 1. UIScene에서 '재개' 요청을 보냈을 때 수신
        const uiScene = this.scene.get('UIScene');
        uiScene.events.on(GameEvents.GAME_RESUMED, this.resumeGame, this);

        // 2. GameScene 자체 일시정지 이벤트 콜백
        this.events.on('pause', () => {
            console.log('GameScene 일시 정지됨');
            // 물리 엔진 정지 (필요 시)
            this.physics.pause();
        });

        // 3. GameScene 자체 재개 이벤트 콜백
        this.events.on('resume', () => {
            console.log('GameScene 재개됨');
            // 물리 엔진 재개
            this.physics.resume();
        });

        this.events.on('tileClicked', (tile) => {

            //console.log(`(${tile.q}, ${tile.r}) | 지형: ${tile.terrain.name}`);
            this.mapGrid[tile.r][tile.q] = tile.terrain.id; // 클릭된 타일의 지형 ID를 맵 데이터에 반영
            this.saveMapGrid(); // 타일 클릭 시마다 맵 데이터 저장
        });

        // 씬 종료 시 이벤트 해제
        this.events.once('shutdown', () => {
            uiScene.events.off(GameEvents.GAME_RESUMED, this.resumeGame, this);
        });
       
    }
    
    update() {
        // ESC 키 입력 시 일시정지 토글
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.pauseGame();
        }
    }

    pauseGame() {
        if (!this.scene.isPaused('GameScene')) {
            // 1. GameScene 일시정지 (update, physics, tweens 동작 멈춤)
            this.scene.pause('GameScene');

            // 2. UIScene에 일시정지 상태 전달 (메뉴 팝업 띄우기)
            this.events.emit(GameEvents.TOGGLE_PAUSE, true);
        }
    }

    resumeGame() {
        if (this.scene.isPaused('GameScene')) {
            // 1. GameScene 재개
            this.scene.resume('GameScene');

            // 2. UIScene에 재개 상태 전달 (메뉴 팝업 닫기)
            this.events.emit(GameEvents.TOGGLE_PAUSE, false);
        }
    }
}