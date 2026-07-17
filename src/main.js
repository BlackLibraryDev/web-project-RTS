// 외부에서 만든 씬(Scene)들을 가져옵니다.
import PreloadScene from './scene/PreloadScene.js';
import GameScene from './scene/GameScene.js';
//import UIScene from './Scene/UIScene.js';
//import TooltipScene from './Scene/TooltipScene.js';
//import InventoryScene from './Scene/InventoryScene.js';     


// 1. 게임의 환경 설정 객체 생성
const config = {
    type: Phaser.AUTO,
    // 원본 기준 해상도 설정
    width: 1920,
    height: 1080,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } },
        debug: true //
    },
    // ─── 스케일 매니저 설정 추가 ───
    scale: {
        mode: Phaser.Scale.FIT,           // 창 크기에 맞게 게임 화면을 키우되, 비율 유지
        autoCenter: Phaser.Scale.CENTER_BOTH, // 브라우저 한가운데에 게임 정렬
        width: 1920,                       // 기본 해상도 가로
        height: 1080                       // 기본 해상도 세로
    },
    input: {
        activePointers: 3
    },
    // 2. 게임에 등록할 씬들의 배열 (앞에 있는 것부터 실행됨)
    scene:[PreloadScene, GameScene ]
};

// 3. Phaser 게임 인스턴스 생성 (게임 시작!)
const game = new Phaser.Game(config);