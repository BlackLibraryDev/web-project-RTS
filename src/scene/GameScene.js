import Squad from './Squad.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // 1. 전체 맵 월드 크기 정의 (가로 3000px, 세로 600px)
        const minHeight = 200;
        const worldWidth = 5000;
        const worldHeight = 600;
        this.physics.world.setBounds(-100, minHeight-100, worldWidth+100, worldHeight+100);
        const worldBounds = {
            width: worldWidth,
            height: worldHeight,
            minHeight: minHeight
        };
        this.registry.set('worldBounds', worldBounds); // 전역 레지스트리에 저장
        // 2. [핵심] 유닛들이 이동 가능한 Y축 범위 정의 (예: 화면 하단 바닥 레이어 쪽 350px ~ 550px 영역)
        this.navigableBounds = {
            minX: 0,
            maxX: worldWidth,
            minY: minHeight,
            maxY: minHeight + worldHeight
        };

        // 3. 이동 가능 범위를 보여주는 배경 그래픽 그리기
        this.drawNavigableAreaVisual();

        // 1. 장애물 그룹 생성 및 샘플 장애물 배치
        this.obstacles = this.physics.add.staticGroup();
        
        // 예시로 500, 400 위치에 'sandbag'(모래주머니) 이미지로 장애물 배치 가정
        // (PreloadScene에서 'sandbag' 이미지를 로드했다고 가정합니다)
        const sandbag = this.obstacles.create(500, 420, 'sandbag'); 
        sandbag.coverPattern = [
            { x: -45, y: 20 },
            { x: -15, y: 20 },
            { x: 15, y: 20 },
            { x: 45, y: 20 }
        ];
        sandbag.setInteractive(); // 클릭 가능하도록 설정

        //모든 스쿼드 담기
        this.squads = [];

  
        this.playerSquad = null;

        this.cameras.main.setBounds(0, 0, 3000, 600);
        

        this.scene.launch('UIScene');
        this.UIScene = this.scene.get('UIScene');

        // ==========================================
        // 4. 글로벌 멀티 스쿼드 이벤트 리스너
        // ==========================================
        this.game.events.on('command-squad-action', (data) => {
            //UIScene에서 버튼 클릭 시 전달받은 명령어를 처리
            
             this.squads.forEach(squad => {
                if (squad.isSelected) {
                    //선택된 스쿼드의 경우에만
                    console.log(`명령어 수신: ${data.command}`);    
                    switch (data.command) {
                        case 'STOP':
                            squad.stop();
                            break;
                        case 'HOLD':
                            squad.holdPosition();
                            break;
                        case 'ATTACK':
                            squad.attackMove();
                            break;
                        case 'Reinforce':
                            squad.reinforceSquad(squad.unitKey);
                            break;
                        case 'Retreat':
                            squad.retreat();
                            break;
                        default:
                            console.warn(`알 수 없는 명령어: ${data.command}`);
                    }
                }
            });

        });
        this.game.events.on('command-squad-move', (data, squad) => {
            const worldX = data.x + this.cameras.main.scrollX;
            const worldY = data.y + this.cameras.main.scrollY;

            // 3. 에러가 났던 함수를 호출합니다!
            const clickedObstacle = this.checkObstacleAt(worldX, worldY);

            if (clickedObstacle) {
                // 모래주머니 뒤에 일렬로 옹기종기 숨는 상대 좌표(오프셋)
                console.log(clickedObstacle.coverPattern);
                squad.moveTo(clickedObstacle.x, clickedObstacle.y, clickedObstacle.coverPattern);
            } else {
                squad.moveTo(worldX, worldY);
            }

            this.drawIndividualUnitGuides(squad)
            
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
            this.squads.forEach(squad => {
                if (squad.id !== data.id) {
                    this.game.events.emit('set-squad-selection', { id: squad.id, isSelected: false });
                    squad.setIsSelected(false); // 인게임 부대 선택도 해제
                }
            });
        }
        
        });
        this.game.events.on('set-squad-selection', (data) => {
            
            if(data.isSelected){
                
                this.playerSquad = this.squads.find(squad => squad.id === data.id);
                if(this.playerSquad && this.playerSquad.units.length > 0) {
                    this.cameras.main.startFollow(this.playerSquad.units[0], true, 0.05, 0.05);
                }
            }else{
                if(this.playerSquad && this.playerSquad.id === data.id){
                    this.playerSquad = null;
                }
            }
        });
    }

    // 2. 에러를 뿜었던 함수 구현부
    checkObstacleAt(worldX, worldY) {
        let foundObstacle = null;

        // 장애물 그룹을 순회하면서 클릭한 좌표(worldX, worldY)가 장애물 범위 안에 있는지 체크
        this.obstacles.getChildren().forEach(obstacle => {
            // 장애물의 사각형 영역 획득
            const bounds = obstacle.getBounds();
            
            // 클릭한 위치가 장애물 내부인지 확인
            if (bounds.contains(worldX, worldY)) {
                foundObstacle = obstacle;
            }
        });

        return foundObstacle; // 찾으면 장애물 객체 반환, 없으면 null 반환
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

    //도착점 좌표 선
    drawIndividualUnitGuides(squad) {
        //나중에 적팀의 경우 보여지지 않게 return 처리 
        if(this.FxGraphics === undefined) {
            this.FxGraphics = {};
        }
        if( this.FxGraphics[squad.id]) {
            this.FxGraphics[squad.id].clear();
            this.FxGraphics[squad.id].destroy();
        }
        
        const fxGraphics = this.add.graphics();

        squad.units.forEach(unit => {
            const finalX = squad.targetX + unit.squadOffsetX;
            const finalY = squad.targetY + unit.squadOffsetY;
            

            fxGraphics.lineStyle(1, 0x00aaff, 0.6);
            fxGraphics.lineBetween(unit.x , unit.y , finalX , finalY );

            fxGraphics.fillStyle(0x00aaff, 0.8);
            fxGraphics.fillCircle(finalX , finalY , 3);
        });

        fxGraphics.lineStyle(2, 0xffffff, 0.4);
        //fxGraphics.strokeCircle(squad.targetX , squad.targetY , 15); //터치 원 좌표
        this.FxGraphics[squad.id] = fxGraphics;

        this.tweens.add({
            targets: fxGraphics,
            alpha: 0,
            delay: 1000,
            duration: 500,
            onComplete: () => {
                fxGraphics.destroy();
            }
        });
    }

    update() {
        this.squads.forEach(squad => {
            squad.update();
        });
    }
}