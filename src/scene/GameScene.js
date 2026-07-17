import Squad from './Squad.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // 1. 전체 맵 월드 크기 정의 (가로 3000px, 세로 600px)
        const worldWidth = 3000;
        const worldHeight = 600;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        // 2. [핵심] 유닛들이 이동 가능한 Y축 범위 정의 (예: 화면 하단 바닥 레이어 쪽 350px ~ 550px 영역)
        this.navigableBounds = {
            minX: 0,
            maxX: worldWidth,
            minY: 350,
            maxY: 550
        };

        // 3. 이동 가능 범위를 보여주는 배경 그래픽 그리기
        this.drawNavigableAreaVisual();

        this.playerSquad = new Squad(this, 200, 400, 'squad_1');

        this.cameras.main.setBounds(0, 0, 3000, 600);
        this.cameras.main.startFollow(this.playerSquad.units[0], true, 0.05, 0.05);

        this.scene.launch('UIScene');

        // 명령 수신
        this.game.events.on('command-squad-move', (data) => {
            const worldX = data.x + this.cameras.main.scrollX;
            const worldY = data.y + this.cameras.main.scrollY;

            // [수정] 스쿼드가 선택되었는지 변수를 곧바로 확인합니다.
            if (this.playerSquad.isSelected) {
                this.drawIndividualUnitGuides(worldX, worldY);
                this.playerSquad.moveTo(worldX, worldY);
            }
        });

        // [키보드 입력 테스트] 스페이스바를 누르면 스쿼드 선택 상태가 토글됩니다.
        this.input.keyboard.on('keydown-SPACE', () => {
            // 스쿼드 자체의 boolean 값을 가져와 반전시킵니다.
            const nextStatus = !this.playerSquad.isSelected;
            this.playerSquad.selectSquad(nextStatus);
            console.log(`스쿼드 선택 상태: ${nextStatus}`);
        });
        this.game.events.on('squad-clicked-toggle', (data) => {
        // 만약 선택 해제한 게 아니라 '새롭게 선택(true)' 한 상황이라면
        if (data.isSelected) {
            // 다른 모든 분대 ID를 순회하며 UI를 강제로 꺼줍니다.
            this.allSquadList.forEach(squad => {
                if (squad.id !== data.id) {
                    this.game.events.emit('set-squad-selection', { id: squad.id, isSelected: false });
                    squad.setIsSelected(false); // 인게임 부대 선택도 해제
                }
            });
        }
    });
    }
    /**
     * 이동 가능한 범위를 반투명한 다른 색상 그리드로 바닥에 깔아주는 함수
     */
    drawNavigableAreaVisual() {
        const bounds = this.navigableBounds;
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;

        const navGraphics = this.add.graphics();

        // [스타일 설정] 채우기 색상: 옅은 진청색/슬레이트 계열 (0x1e293b), 알파값 0.35
        navGraphics.fillStyle(0xffffff, 0.35);
        
        // 이동 가능 영역 사각형 그리기
        navGraphics.fillRect(bounds.minX, bounds.minY, width, height);

        // 상하단 경계선 가이드라인 추가 (세련미를 더하기 위해 상단과 하단에 연한 선 배치)
        navGraphics.lineStyle(2, 0x00aaff, 0.4); // 연한 하늘색 선
        navGraphics.lineBetween(bounds.minX, bounds.minY, bounds.maxX, bounds.minY); // 상단 경계선
        navGraphics.lineBetween(bounds.minX, bounds.maxY, bounds.maxX, bounds.maxY); // 하단 경계선
        
        // 유닛들 뒤쪽 배경으로 들어가도록 depth를 낮게 설정 (-1)
        navGraphics.setDepth(-1);
    }

    /**
     * 특정 좌표가 이동 가능한 그리드 영역 내부에 있는지 체크하는 헬퍼 함수
     */
    isWithinNavigableArea(x, y) {
        const b = this.navigableBounds;
        return (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY);
    }

    drawIndividualUnitGuides(targetX, targetY) {
        const fxGraphics = this.add.graphics();

        this.playerSquad.units.forEach(unit => {
            const finalX = targetX + unit.squadOffsetX;
            const finalY = targetY + unit.squadOffsetY;

            fxGraphics.lineStyle(1, 0x00aaff, 0.6);
            fxGraphics.lineBetween(unit.x, unit.y, finalX, finalY);

            fxGraphics.fillStyle(0x00aaff, 0.8);
            fxGraphics.fillCircle(finalX, finalY, 3);
        });

        fxGraphics.lineStyle(2, 0xffffff, 0.4);
        fxGraphics.strokeCircle(targetX, targetY, 15);

        this.tweens.add({
            targets: fxGraphics,
            alpha: 0,
            delay: 1500,
            duration: 500,
            onComplete: () => {
                fxGraphics.destroy();
            }
        });
    }

    update() {
        if (this.playerSquad) {
            this.playerSquad.update();
        }
    }
}