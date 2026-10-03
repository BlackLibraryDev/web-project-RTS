// src/main.js
import PreloadScene from './preload.js';
import MainMenuScene from './mainMenu.js';
import GameScene from './gameScene.js';
import UIScene from './UIscene.js';

// src/main.js
const config = {
    type: Phaser.AUTO,
    width: 1280,   // 기준 가상 해상도 가로
    height: 720,   // 기준 가상 해상도 세로
    scale: {
        mode: Phaser.Scale.FIT,               // 비율을 유지하며 화면에 맞춤 (여백 자동 처리)
        autoCenter: Phaser.Scale.CENTER_BOTH, // 화면 중앙 자동 정렬
        parent: 'game-container'              // HTML 내의 특정 div 지정 권장
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: [PreloadScene, MainMenuScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);