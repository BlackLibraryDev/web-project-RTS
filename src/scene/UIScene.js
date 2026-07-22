import Squad from './Squad.js';

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
        this.gameScene = this.scene.get('GameScene'); // GameScene의 gameObjects 참조
        
        // 여러 스쿼드 HUD 구성요소들을 ID별로 저장할 컨테이너 객체
        this.squadsHUD = {}; 
        this.initMultiSquadHUD();
        // 초기 스쿼드들 HUD 배치 생성
        

        // 2. 전체 화면 터치 존 (모든 HUD 영역 클릭 방어 적용)
        const touchZone = this.add.zone(width / 2, height / 2, width, height).setInteractive();
        touchZone.on('pointerdown', (pointer) => {
            // [방어 코드] 마우스 포인터가 HUD들이 배치된 전체 가로/세로 영역 안에 있다면 이동 명령 무시
            if (pointer.y > this.hudY && 
                pointer.x > this.totalHudStartX && 
                pointer.x < this.totalHudEndX) {
                return; 
            }
            const worldBounds = this.registry.get('worldBounds');
            if( pointer.y > worldBounds.height + worldBounds.minHeight || pointer.y < worldBounds.minHeight) {
                return; 
            }
            const squads = this.registry.get('squads') || [];
            squads.forEach(squad => {
                if (squad.isSelected) {
                    this.game.events.emit('command-squad-move', { x: pointer.x, y: pointer.y }, squad);
                    //this.drawIndividualUnitGuides(squad);
                   // this.deselectAllSquads(); //이동명령 시 모두 선택 해제
                }
            });
        });

        //버튼
        // 0번째 칸에 아처 생산 버튼
        this.createSpawnButton(0, 'unit_archer', 'Archer',2); //테스트, 팀2
        this.createSpawnButton(1, 'unit_rifleman', 'Rifleman');
        this.createSpawnButton(2, 'unit_sniper', 'Sniper');

        // [우측 하단] 명령어 버튼들 (0번부터 왼쪽으로 배치)
        // index 0: 맨 우측 끝 버튼
        this.createCommandButton(0, 'Retreat', 0x992222, '‼');   // 정지 (붉은빛)
        this.createCommandButton(1, 'Reinforce', 0x222299, '✚');   // 위치 사수 (푸른빛)
        //this.createCommandButton(2, 'ATTACK', 0x229922, '⚔'); // 공격 이동 (초록빛)
        //this.createCommandButton(3, 'Reinforce', 0x22eeff, '✚'); // 충원
        

        // ==========================================
        // 4. 글로벌 멀티 스쿼드 이벤트 리스너
        // ==========================================
        
        // 특정 스쿼드의 정보(체력, 탄약, 생존인원) 업데이트 이벤트
        // 예: this.game.events.emit('update-squad-hud', { id: 'squad_1', hpRatio: 0.8, ammoRatio: 0.5, count: 3 });
        this.game.events.on('update-squads', (data) => {
        
           this.initMultiSquadHUD();
        });

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
     * 우측 하단에 분대 제어용 명령어 버튼을 생성하는 함수
     * @param {number} index - 우측 끝에서부터의 순번 (0: 맨 우측, 1: 그 왼쪽...)
     * @param {string} commandType - 명령 종류 (예: 'STOP', 'HOLD', 'ATTACK')
     * @param {number} colorHex - 버튼 사각형에 입힐 고유 색상 (예: 0xaa3333)
     */
    createCommandButton(index, commandType, colorHex = 0x444444, icon ='') {
        // 1. 우측 하단 기준 좌표 계산 (화면 가로 크기를 800px이라고 가정)
        // 화면 크기에 맞게 800 부분을 수정하거나 `this.scale.width`를 사용하세요.
        const screenWidth = this.scale.width; 
        const buttonSpacing = 112; // 버튼 크기 96px + 여백 16px
        
        // 오른쪽 끝 여백(64px)에서 시작해 왼쪽(- 방향)으로 나열됩니다.
        const startX = screenWidth - 64 - 96 - (index * buttonSpacing);

        // 2. 명령어 배경 사각형 그리기
        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(colorHex, 1);
        buttonBg.fillRoundedRect(startX, this.hudY, 96, 96, 8);
        //buttonBg.setStrokeStyle(2, 0xffffff);

        // 3. 명령어 텍스트 얹기
        const txt = icon.length > 0 ? icon : commandType;
        const commandText = this.add.text(startX + 48, this.hudY + 48, txt, {
            fontSize: txt.length>2 ? '18px' : '48px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5); // 텍스트 중앙 정렬

        // 레이어 깊이 보장
        buttonBg.setDepth(1);
        commandText.setDepth(2);

        // 4. 그래픽 객체에 인터랙션 활성화
        buttonBg.setInteractive(new Phaser.Geom.Rectangle(startX, this.hudY, 96, 96), Phaser.Geom.Rectangle.Contains);

        // 마우스 오버 효과 (피드백)
        buttonBg.on('pointerover', () => buttonBg.setAlpha(0.8));
        buttonBg.on('pointerout', () => buttonBg.setAlpha(1.0));

        // 5. 클릭 시 GameScene의 선택된 분대들에게 명령 하달
        buttonBg.on('pointerdown', () => {
           // console.log(`[UI] ${commandType} 명령 버튼 클릭됨`);
            
            // GameScene에 전역 이벤트를 쏘아 현재 선택된 모든 분대에게 명령을 내립니다.
            this.game.events.emit('command-squad-action', {
                command: commandType
            });

            // 클릭 연출 (살짝 밟히는 느낌)
            this.tweens.add({
                targets: commandText,
                scale: 0.85,
                duration: 50,
                yoyo: true,
                onComplete: () => commandText.setScale(1)
            });
        });
    }


    
    /**
     * 지정된 유닛의 동적 증원(생산) 버튼을 생성하는 함수
     * @param {number} index - 버튼의 순번 (0부터 시작, 가로 배치 자동 정렬용)
     * @param {string} unitKey - Phaser에 등록된 유닛의 이미지/스프라이트 키 (예: 'unit_archer')
     * @param {string} squadName - 새 분대에 부여할 화면 표시 이름 (예: '궁수대')
     * @param {number} team - 분대가 속할 팀 번호
     */
    createSpawnButton(index, unitKey, squadName, team = 1) {
        // 1. 자동 정렬 좌표 계산 (버튼 크기 96px + 여백 16px = 간격 112px)
        const buttonSpacing = 112; 
        const startX = 64 + (index * buttonSpacing);

        // 2. 배경 카드 그리기
        const buttonBg = this.add.graphics();
        buttonBg.fillStyle(0xffffff, 1);
        buttonBg.fillRoundedRect(startX, this.hudY, 96, 96, 8);

        // 3. 유닛 초상화 이미지 얹기 (중심점 기준이므로 가로 반(48), 세로 반(48)을 더해줍니다)
        const buttonPortrait = this.add.image(startX + 48, this.hudY + 48, unitKey).setDisplaySize(96, 96);

        // 깊이(z-index) 설정: 초상화가 무조건 배경 그래픽 위에 오도록 보장
        buttonBg.setDepth(1);
        buttonPortrait.setDepth(2);

        // 4. 그래픽 객체에 히트박스 심고 인터랙션(클릭) 활성화
        buttonBg.setInteractive(new Phaser.Geom.Rectangle(startX, this.hudY, 96, 96), Phaser.Geom.Rectangle.Contains);
        
        // 마우스가 올라갔을 때 피드백 효과 (투명도 조절로 버튼 느낌 내기)
        buttonBg.on('pointerover', () => buttonPortrait.setAlpha(0.8));
        buttonBg.on('pointerout', () => buttonPortrait.setAlpha(1.0));

        // 5. 클릭 시 분대 생산 이벤트
        buttonBg.on('pointerdown', () => {
            const squads = this.registry.get('squads') || [];
            
            // [수정] 외부에서 받은 unitKey로 Squad 인스턴스 동적 소환
            // GameScene이 들고 있던 spawnNewSquad 메서드가 있다면 활용하는 것이 가장 안전합니다.
            let newSquad;
            if (typeof this.gameScene.spawnNewSquad === 'function') {
                newSquad = this.gameScene.spawnNewSquad(400, 400, unitKey, squadName);
            } else {
                // 차선책: 직접 생성하여 주입
                const nextNumber = squads.length + 1;
                newSquad = new Squad(this.gameScene, 400, 400, unitKey, team);
                squads.push(newSquad);
                this.gameScene.squads = squads;
            }

            // 레거시 호환 및 UI 동기화
            this.registry.set('squads', this.gameScene.squads || squads); 
            this.initMultiSquadHUD();
            
            // 버튼을 누를 때 팅기는 시각 피드백 추가 (살짝 깜빡임)
            this.tweens.add({
                targets: buttonPortrait,
                scale: 0.85,
                duration: 50,
                yoyo: true,
                onComplete: () => buttonPortrait.setDisplaySize(96, 96)
            });
        });
    }

    deselectAllSquads() {
        const squads = this.registry.get('squads') || [];
        squads.forEach(squad => {
            if (squad.isSelected) {
                this.game.events.emit('set-squad-selection', { id: squad.id, isSelected: false });
                squad.selectSquad(false); // 인게임 부대 선택 상태도 갱신
            }
        });
    }

    /**
     * 여러 개의 스쿼드 데이터를 받아 하단 중앙에 균등 배열 정렬 및 UI 생성
     */
    initMultiSquadHUD() {
        const allSquads = this.registry.get('squads') || [];
        const playerTeam = this.registry.get('playerTeam') || 1;
        // 팀이 playerTeam이고, 살아있는 unit이 1개 이상 남아있는 분대만 필터링
        const squads = allSquads.filter(squad => 
            squad.team === playerTeam && 
            squad.units && 
            squad.units.length > 0
        );
        const screenWidth = this.scale.width;
        const spacing = 12; // HUD 카드 간의 간격
        const totalSquads = squads.length;

        // 전체 HUD 묶음이 차지하는 총 가로 폭 계산
        const totalWidth = (this.cardWidth * totalSquads) + (spacing * (totalSquads - 1));

        // 전체 HUD 묶음의 시작 X 좌표와 끝 X 좌표 계산 (터치 방어 및 중앙 정렬용)
        this.totalHudStartX = (screenWidth / 2) - (totalWidth / 2);
        this.totalHudEndX = this.totalHudStartX + totalWidth;

        //그래픽 초기화
        Object.values(this.squadsHUD).forEach(hud => {
            hud.bg.destroy();
            hud.countBg.destroy();
            hud.portrait.destroy();
            hud.portraitImage.destroy();
            hud.nameText.destroy();
            hud.hpBar.destroy();
            hud.ammoBar.destroy();
            hud.countText.destroy();
        });
        this.squadsHUD = {};
        // 각 스쿼드 순회하며 UI 객체 쌍 생성
        squads.forEach((squad, index) => {
            // 각 스쿼드 카드의 고유 중심 X 좌표 계산
            const cardX = this.totalHudStartX + (index * (this.cardWidth + spacing)) + (this.cardWidth / 2);

            // 1. 배경 레이어용 Graphics 생성
            const bgGraphics = this.add.graphics();
            bgGraphics.on('pointerdown', (pointer) => {
                if(squad.isSelected) {
                    
                    this.game.events.emit('set-squad-selection', { id: squad.id, isSelected: false });
                    squad.selectSquad(false); // 인게임 부대 선택 상태도 갱신
                } else {
                    if(squad.command === 'Retreat'){
                        console.log("후퇴 중인 분대는 선택할 수 없습니다.");
                         return; // 후퇴 중인 분대는 선택 불가
                    } 
                    this.deselectAllSquads();
                    this.game.events.emit('set-squad-selection', { id: squad.id, isSelected: true });
                    squad.selectSquad(true); // 인게임 부대 선택 상태도 갱신
                }
            });
            bgGraphics.setInteractive(new Phaser.Geom.Rectangle(cardX - (this.cardWidth / 2), this.hudY, this.cardWidth, this.cardHeight), Phaser.Geom.Rectangle.Contains);

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
            const buttonPortrait = this.add.image(contentStartX + 32, contentStartY + 16, squad.unitKey).setDisplaySize(64, 64);

            // 분대 이름 텍스트 (SQ1, SQ2 등)
            const nameText = this.add.text(cardX, contentStartY + portraitSize / 2, '', {
                fontSize: '16px',
                fontWeight: 'bold',
                fill: '#00aaff'
            }).setOrigin(0.5);

            // 4. 우측 하단 분대원 수 배지
            const countBg = this.add.graphics();
            countBg.fillStyle(0x00aaff, 0);
            countBg.fillCircle(contentStartX + portraitSize - 12, contentStartY + portraitSize - 12, 18);

            const countText = this.add.text(contentStartX + portraitSize - 12, contentStartY + portraitSize - 12, squad.units.length, {
                fontSize: '36px',
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
                countBg: countBg,
                portrait: portraitBox,
                portraitImage: buttonPortrait,  
                nameText: nameText,
                hpBar: hpBarGraphics,
                ammoBar: ammoBarGraphics,
                countText: countText,
                hpBarY: hpBarY,
                ammoBarY: ammoBarY,
                contentStartX: contentStartX,
                isSelected: squad.isSelected,
                unitKey: squad.unitKey,
                id: squad.id
            };

            // 개별 초기화 렌더링
            this.drawHudBackground(squad.id, squad.isSelected);
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


   

    /**
     * 특정 좌표가 이동 가능한 그리드 영역 내부에 있는지 체크하는 헬퍼 함수
     */
    isWithinNavigableArea(x, y) {
        const b = this.navigableBounds;
        return (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY);
    }

    
}