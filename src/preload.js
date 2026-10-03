// src/preload.js
import { GameData } from './data.js';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        GameData.load();
        // 에셋 로드 코드...
    }

    create() {
        this.scene.start('MainMenuScene');
    }
}