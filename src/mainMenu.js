// src/mainMenu.js
import { LanguageData } from './translate.js';

export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        const titleText = this.add.text(400, 200, LanguageData.getText('game_title'), { fontSize: '48px', fill: '#fff' })
            .setOrigin(0.5);

        const startButton = this.add.text(400, 300, LanguageData.getText('btn_start'), { fontSize: '32px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        startButton.on('pointerdown', () => {
            this.scene.start('GameScene');
        });
        
        //빌드
        const build ='build 20261010-1'
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const buildText = this.add.text(10, height-10, build,{fontSize:'16px'}).setOrigin(0,1);
    }
}