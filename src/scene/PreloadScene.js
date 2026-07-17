export default class PreloadScene extends Phaser.Scene {
    constructor() {
        // 이 씬의 고유 식별자(키)를 설정합니다.
        super('PreloadScene');
    }

    preload() {
        // 1. 화면 중앙에 로딩 중 텍스트 표시 (선택 사항)
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const loadingText = this.add.text(width / 2, height / 2, 'Loading...', {
            font: '20px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5, 0.5);

        // 2. 게임에 필요한 모든 리소스 로드
        // (여기서 로드한 자원은 다른 씬에서도 공유됩니다)

        // 1. TSV 파일을 일반 텍스트로 로드
        this.load.text('itemTable', 'assets/data/items.tsv');


       //this.load.spritesheet('playerSkin', 'assets/player.png', { frameWidth: 128 , frameHeight: 128 });

        
        // 조이스틱 플러그인 로드
        //this.load.plugin('rexvirtualjoystickplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js', true);

        // 로딩 진행 상황을 콘솔이나 텍스트로 확인하고 싶을 때 사용
        this.load.on('progress', (value) => {
            loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
        });
    }

    create() {

        // 2. 로드된 텍스트 데이터를 가져옴
        const tsvData = this.cache.text.get('itemTable');

        // 3. TSV를 자바스크립트 객체(DB)로 변환
        const itemDatabase = this.parseTSV(tsvData);

        // 4. 변환된 전역 DB를 레지스트리에 등록하여 모든 씬에서 사용 가능하게 만듦
        this.registry.set('ITEM_DATABASE', itemDatabase);


/*
        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('tailer', { start: 0, end: 1}),
            frameRate: 8,
            repeat: 0
        });
        this.anims.create({
            key: 'walk',
            frames: this.anims.generateFrameNumbers('tailer', { start: 1, end: 6 }),
            frameRate: 8,
            repeat: -1
        });
*/
        // 모든 리소스 로드가 완료되면 곧바로 'GameScene'을 시작합니다.
        this.scene.start('GameScene');
    }
    // ─── TSV 파싱 유틸리티 함수 ───
    parseTSV(text) {
        const lines = text.split('\n');
        const database = {};

        // 첫 번째 줄(헤더) 분석: ['id', 'name', 'type', ...]
        const headers = lines[0].replace('\r', '').split('\t');

        // 두 번째 줄부터 데이터 처리
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue; // 빈 줄은 건너뜀

            const cols = lines[i].replace('\r', '').split('\t');
            const item = {};
            
            // 헤더 매핑
            headers.forEach((header, index) => {
                let value = cols[index];
                
                // 숫자로 변환할 수 있는 데이터는 숫자로 변환 (price, atk 등)
                if (!isNaN(value) && value !== '') {
                    value = Number(value);
                }
                item[header] = value;
            });

            // 구조 정리: 기존 설계처럼 baseStats 구조로 묶어주기
            if (item.type === 'EQUIPMENT') {
                item.baseStats = { atk: item.atk || 0 };
                delete item.atk; // 최상위 atk 속성은 제거
            }

            // id를 Key값으로 해서 데이터베이스에 저장
            database[item.id] = item;
        }

        return database;
    }
}