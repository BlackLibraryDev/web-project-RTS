// src/preload.js
import { GameData } from './data.js';
import { LanguageData } from '../translate.js';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // 1. TSV 파일을 텍스트 형식으로 로드 (경로는 assets에 두는 것 권장)
        this.load.text('translations', 'assets/data/translations.tsv');


        this.load.spritesheet('unit_commandVan', 'assets/commandVan.png', { frameWidth: 256 , frameHeight: 256 });
        GameData.load();
        // 에셋 로드 코드...
    }

    create() {
        // 2. 로드된 TSV 텍스트 가져오기
        const tsvData = this.cache.text.get('translations');

        // 3. 번역 데이터 파싱 및 초기화
        LanguageData.initFromTSV(tsvData);

        // 4. 저장된 기존 언어 설정 복원 (기본값: ko)
        const savedLang = localStorage.getItem('game_language') || 'ko';
        LanguageData.setLanguage(savedLang);

        this.anims.create({
            key: 'unit_commandVan_idle',
            frames: this.anims.generateFrameNumbers('unit_commandVan', { start: 0, end: 3 }),
            frameRate: 6,
            repeat:-1
        });

        this.scene.start('MainMenuScene');
    }
}