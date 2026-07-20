// 외부에서 만든 씬(Scene)들을 가져옵니다.
import PreloadScene from './scene/PreloadScene.js';
import GameScene from './scene/GameScene.js';
import UIScene from './scene/UIScene.js';
//import TooltipScene from './Scene/TooltipScene.js';
//import InventoryScene from './Scene/InventoryScene.js';     


// 1. 기준이 될 높이를 지정합니다. (예: 1080px 또는 720px 등 타겟 해상도 설정)
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;

// 2. 현재 유저의 실제 휴대폰 브라우저 창의 가로세로 비율(Aspect Ratio)을 계산합니다.
const windowRatio = window.innerWidth / window.innerHeight;

// 3. 세로 높이는 고정한 상태에서, 실제 화면 비율을 곱해 유연한 가로 크기를 계산합니다.
// 예시: 폰 비율이 2:1 이라면 가로는 1080 * 2 = 2160px이 됩니다.
const calculatedWidth = TARGET_HEIGHT * windowRatio;
const config = {
    type: Phaser.AUTO,
    width: calculatedWidth<=TARGET_WIDTH ? TARGET_WIDTH : calculatedWidth, // 기기 비율에 맞춰 유동적으로 늘어난 가로 크기
    height: TARGET_HEIGHT,  // 세로는 항상 1080으로 고정
    scale: {
        // RESIZE 모드를 쓰거나 혹은 계산된 해상도를 기기 창 크기에 딱 맞춤(FIT) 처리
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    input: {
        activePointers: 3
    },
    // 2. 게임에 등록할 씬들의 배열 (앞에 있는 것부터 실행됨)
    scene:[PreloadScene, GameScene, UIScene ]
};

// 3. Phaser 게임 인스턴스 생성 (게임 시작!)
const game = new Phaser.Game(config);