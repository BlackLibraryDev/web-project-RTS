// src/mainMenu.js
import { LanguageData } from './translate.js';
import { GameOptions } from './core/option.js';
import { GameData } from './core/data.js';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        const titleText = this.add.text(400, 200, LanguageData.getText('game_title'), { fontSize: '48px', fill: '#fff' ,padding:{ x: 2, y: 2 }})
            .setOrigin(0.5);

        const startButton = this.add.text(400, 300, LanguageData.getText('btn_start'), { fontSize: '32px', fill: '#0f0' ,padding:{ x: 2, y: 2 } })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        startButton.on('pointerdown', () => {
            GameData.load();
            this.scene.start('GameScene');
        });
        
        //빌드
        const build = `build: ${window.GAME_VERSION}`
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const buildText = this.add.text(10, height-10, build,{fontSize:'16px'}).setOrigin(0,1);

        GameData.reset();
        GameOptions.loadOptions();
    }
}