export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        const width = this.scale.width;   
        const height = this.scale.height; 

        // 각 스쿼드 HUD 카드의 개별 규격
        this.cardWidth = 94;        
        this.cardHeight = 120;      
        this.hudY = height - 140; // 하단 Y 위치 고정

        // 여러 스쿼드 HUD 구성요소들을 ID별로 저장할 컨테이너 객체
        this.squadsHUD = {}; 

        // [샘플 데이터] 테스트를 위해 3개의 분대를 기본 등록합니다.
        // 실제 게임에서는 GameScene에서 생성 이벤트를 받아 동적으로 추가할 수도 있습니다.
        const initialSquads = [
            { id: 'squad_1', name: 'SQ1' },
            { id: 'squad_2', name: 'SQ2' },
            { id: 'squad_3', name: 'SQ3' }
        ];

        // 초기 스쿼드들 HUD 배치 생성
        this.initMultiSquadHUD(initialSquads);

        // 2. 전체 화면 터치 존 (모든 HUD 영역 클릭 방어 적용)
        const touchZone = this.add.zone(width / 2, height / 2, width, height).setInteractive();
        touchZone.on('pointerdown', (pointer) => {
            // [방어 코드] 마우스 포인터가 HUD들이 배치된 전체 가로/세로 영역 안에 있다면 이동 명령 무시
            if (pointer.y > this.hudY && 
                pointer.x > this.totalHudStartX && 
                pointer.x < this.totalHudEndX) {
                return; 
            }
            this.game.events.emit('command-squad-move', { x: pointer.x, y: pointer.y });
        });

        // ==========================================
        // 4. 글로벌 멀티 스쿼드 이벤트 리스너
        // ==========================================
        
        // 특정 스쿼드의 정보(체력, 탄약, 생존인원) 업데이트 이벤트
        // 예: this.game.events.emit('update-squad-hud', { id: 'squad_1', hpRatio: 0.8, ammoRatio: 0.5, count: 3 });
        this.game.events.on('update-squad-hud', (data) => {
            const hud = this.squadsHUD[data.id];
            if (!hud) return;

            if (data.count !== undefined) hud.countText.setText(data.count);
            this.updateBars(data.id, data.hpRatio, data.ammoRatio);
        });

        // 특정 스쿼드의 선택 상태 변경 이벤트
        // 예: this.game.events.emit('set-squad-selection', { id: 'squad_1', isSelected: true });
        this.game.events.on('set-squad-selection', (data) => {
            const hud = this.squadsHUD[data.id];
            if (!hud) return;

            if (hud.isSelected !== data.isSelected) {
                hud.isSelected = data.isSelected;
                this.drawHudBackground(data.id, hud.isSelected);
            }
        });
    }

    /**
     * 여러 개의 스쿼드 데이터를 받아 하단 중앙에 균등 배열 정렬 및 UI 생성
     */
    initMultiSquadHUD(squads) {
        const screenWidth = this.scale.width;
        const spacing = 12; // HUD 카드 간의 간격
        const totalSquads = squads.length;

        // 전체 HUD 묶음이 차지하는 총 가로 폭 계산
        const totalWidth = (this.cardWidth * totalSquads) + (spacing * (totalSquads - 1));

        // 전체 HUD 묶음의 시작 X 좌표와 끝 X 좌표 계산 (터치 방어 및 중앙 정렬용)
        this.totalHudStartX = (screenWidth / 2) - (totalWidth / 2);
        this.totalHudEndX = this.totalHudStartX + totalWidth;

        // 각 스쿼드 순회하며 UI 객체 쌍 생성
        squads.forEach((squad, index) => {
            // 각 스쿼드 카드의 고유 중심 X 좌표 계산
            const cardX = this.totalHudStartX + (index * (this.cardWidth + spacing)) + (this.cardWidth / 2);

            // 1. 배경 레이어용 Graphics 생성
            const bgGraphics = this.add.graphics();

            // 2. 내부 콘텐츠 시작점 계산
            const contentStartX = cardX - 32;
            const contentStartY = this.hudY + 14;

            // 3. 초상화 (64x64)
            const portraitSize = 64;
            const portraitBox = this.add.graphics();
            portraitBox.fillStyle(0x223344, 0.9);
            portraitBox.fillRect(contentStartX, contentStartY, portraitSize, portraitSize);
            portraitBox.lineStyle(2, 0x00aaff, 0.8);
            portraitBox.strokeRect(contentStartX, contentStartY, portraitSize, portraitSize);

            // 분대 이름 텍스트 (SQ1, SQ2 등)
            const nameText = this.add.text(cardX, contentStartY + portraitSize / 2, squad.name, {
                fontSize: '16px',
                fontWeight: 'bold',
                fill: '#00aaff'
            }).setOrigin(0.5);

            // 4. 우측 하단 분대원 수 배지
            const countBg = this.add.graphics();
            countBg.fillStyle(0x00aaff, 1);
            countBg.fillCircle(contentStartX + portraitSize - 4, contentStartY + portraitSize - 4, 11);

            const countText = this.add.text(contentStartX + portraitSize - 4, contentStartY + portraitSize - 4, '4', {
                fontSize: '13px',
                fontWeight: 'bold',
                fill: '#ffffff'
            }).setOrigin(0.5);

            // 5. 체력바 & 탄약바 개별 생성용 Graphics
            const hpBarY = contentStartY + portraitSize + 6;
            const ammoBarY = hpBarY + 10 + 4;

            const hpBarGraphics = this.add.graphics();
            const ammoBarGraphics = this.add.graphics();

            // 생성된 컴포넌트들을 ID를 키값으로 딕셔너리에 매핑 저장
            this.squadsHUD[squad.id] = {
                cardX: cardX,
                bg: bgGraphics,
                hpBar: hpBarGraphics,
                ammoBar: ammoBarGraphics,
                countText: countText,
                hpBarY: hpBarY,
                ammoBarY: ammoBarY,
                contentStartX: contentStartX,
                isSelected: false
            };

            // 개별 초기화 렌더링
            this.drawHudBackground(squad.id, false);
            this.updateBars(squad.id, 1.0, 1.0);
        });
    }

    /**
     * [멀티대응] 특정 스쿼드 ID의 배경 레이어를 다시 그려주는 함수
     */
    drawHudBackground(squadId, isSelected) {
        const hud = this.squadsHUD[squadId];
        if (!hud) return;

        hud.bg.clear();
        const startX = hud.cardX - (this.cardWidth / 2);

        if (isSelected) {
            // 선택된 스쿼드: 사이버 블루 강조 테두리
            hud.bg.fillStyle(0x001122, 0.75);
            hud.bg.fillRoundedRect(startX, this.hudY, this.cardWidth, this.cardHeight, 8);
            hud.bg.lineStyle(2, 0x00aaff, 1);
            hud.bg.strokeRoundedRect(startX, this.hudY, this.cardWidth, this.cardHeight, 8);
        } else {
            // 일반 스쿼드: 반투명 블랙
            hud.bg.fillStyle(0x000000, 0.6);
            hud.bg.fillRoundedRect(startX, this.hudY, this.cardWidth, this.cardHeight, 8);
            hud.bg.lineStyle(1, 0xffffff, 0.2);
            hud.bg.strokeRoundedRect(startX, this.hudY, this.cardWidth, this.cardHeight, 8);
        }
    }

    /**
     * [멀티대응] 특정 스쿼드 ID의 체력바와 탄약바를 실시간 갱신 함수
     */
    updateBars(squadId, hpRatio, ammoRatio) {
        const hud = this.squadsHUD[squadId];
        if (!hud) return;

        const barWidth = 64;
        const barHeight = 10;

        // --- 체력바(HP) ---
        hud.hpBar.clear();
        hud.hpBar.fillStyle(0x333333, 1);
        hud.hpBar.fillRect(hud.contentStartX, hud.hpBarY, barWidth, barHeight);
        hud.hpBar.fillStyle(0x22cc22, 1);
        hud.hpBar.fillRect(hud.contentStartX, hud.hpBarY, barWidth * Phaser.Math.Clamp(hpRatio, 0, 1), barHeight);

        // --- 탄약바(AMMO) ---
        hud.ammoBar.clear();
        hud.ammoBar.fillStyle(0x333333, 1);
        hud.ammoBar.fillRect(hud.contentStartX, hud.ammoBarY, barWidth, barHeight);
        hud.ammoBar.fillStyle(0xffee11, 1);
        hud.ammoBar.fillRect(hud.contentStartX, hud.ammoBarY, barWidth * Phaser.Math.Clamp(ammoRatio, 0, 1), barHeight);
    }
}