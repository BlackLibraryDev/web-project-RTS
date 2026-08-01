import Squad from './Squad.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        // 1. 전체 맵 월드 크기 정의 (가로 3000px, 세로 600px)
        const minHeight = 200;
        const worldWidth = 2000;
        const worldHeight = 600;
        // ★ 전장의 안개 시스템 초기화
         this.initFogOfWar(0 , 200, worldWidth, worldHeight );

        this.playerTeam = 1;
        this.registry.set('playerTeam', this.playerTeam);

        this.resources = {
            team1: {
                manpower: 110,
                ammo: 2000,
                fuel: 200
            },
            team2: {
                manpower: 100,
                ammo: 2000,
                fuel: 200
            }
        };
        this.registry.set('resources', this.resources);
        
        this.physics.world.setBounds(-100, minHeight-100, worldWidth+100, worldHeight+100);
        const worldBounds = {
            width: worldWidth+2000,
            height: worldHeight,
            minHeight: minHeight,
            team1posX : -100,
            team2posX : worldWidth+100,
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

        //기본유닛 소환
        //this.gameStart();
        // ==========================================
        // 4. 글로벌 멀티 스쿼드 이벤트 리스너
        // ==========================================
        this.game.events.on('gameStart',()=>{
            this.gameStart();
        })

        this.game.events.on('command-squad-action', (data) => {
            //UIScene에서 버튼 클릭 시 전달받은 명령어를 처리
            
             this.squads.forEach(squad => {
                if (squad.isSelected) {
                    //선택된 스쿼드의 경우에만
                    console.log(`명령어 수신: ${data.command}`);    
                    switch (data.command) {
                        case 'Stop':
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
                            this.playerSquad=null;
                            this.cameras.main.stopFollow();
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
                    this.cameras.main.stopFollow();
                }
            }
        });
    }
    gameStart(){
        //시간, 점수 등 시작
        
        const commandVan = this.spawnNewSquad(200, 500, 'unit_commandVan', 1, 2);
        this.playerSquad = commandVan;
        this.cameras.main.startFollow(this.playerSquad.units[0], true, 0.05, 0.05);
        this.gameStatus = 'running';
        //테스트
        //7초마다 생산
        this.time.addEvent({
            delay: 7000,
            callback: () => {
                const enemySquads = this.squads.filter(squad => squad.team !== this.playerTeam);
                if (enemySquads.length >=2) {
                    enemySquads.forEach(squad => {
                        squad.moveTo(Phaser.Math.Between(300, 500), Phaser.Math.Between(200, 500));
                    });
                }

                this.spawnNewSquad(200, 500, 'unit_archer', 2);
            },
            loop: true
        });
    }
    checkGameOver(){
        this.squads = this.squads.filter(squad => squad.units.length > 0);
        const playerSquads = this.squads.filter(squad => squad.team === this.playerTeam);
        this.registry.set('squads', this.squads);
        this.UIScene.initMultiSquadHUD();
        this.UIScene.renderCommanderButtons();

        if (playerSquads.length <= 0 && this.gameStatus != 'gameover') {
            this.gameStatus = 'gameover';
            console.log("모든 아군 스쿼드가 제거되었습니다.");
            //1초 뒤 게임오버
            this.time.delayedCall(1000, () => {
                console.log("게임 오버!");
                this.scene.pause();
            });
            //this.scene.launch('GameOverScene', { message: "게임 오버! 모든 아군 스쿼드가 제거되었습니다." });
        }
    }

    spawnNewSquad(x, y, unitKey, team = 1, type=1) {
        const newSquad = new Squad(this, x, y, unitKey, team, type);
        this.squads.push(newSquad);
        this.registry.set('squads', this.squads); // 레지스트리에 최신 스쿼드 배열 저장
        this.UIScene.initMultiSquadHUD();
        return newSquad;
    }
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
        if(squad.team != this.playerTeam) return 
        if(squad.isMovable === false) return; // 이동 불가 차량은 선 그리지 않음
        if(this.FxGraphics === undefined) {
            this.FxGraphics = {};
        }
        if( this.FxGraphics[squad.id]) {
            this.FxGraphics[squad.id].clear();
            this.FxGraphics[squad.id].destroy();
        }
        
        const fxGraphics = this.add.graphics();

        squad.units.forEach(unit => {
            const finalX = unit.squadOffsetX;
            const finalY = unit.squadOffsetY;
            

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
    /**
     * 전장의 안개(Fog of War) RenderTexture 및 마스크 브러시 초기화
     */
    initFogOfWar(startX, startY, width, height) {
        this.fogStartX = startX;
        this.fogStartY = startY;

        // 1. startX, startY 위치에 RenderTexture 생성 후 setOrigin(0, 0) 필수 적용
        this.fogRT = this.add.renderTexture(startX, startY, width, height);
        this.fogRT.setOrigin(0, 0); // ★ 핵심: 기본 중심점(0.5, 0.5)으로 인한 위치 틀어짐 방지
        this.fogRT.setDepth(50);

        // 2. 시야 구멍을 뚫을 원형 브러시 Graphics 생성
        this.fogBrush = this.make.graphics({ x: 0, y: 0 }, false);

        // 3. 성능 최적화를 위한 타이머 설정
        this.lastFogUpdateTime = 0;
        this.fogUpdateInterval = 100;
    }
    /**
     * 안개 지우기 및 시야 밖 적 유닛 숨김/표시 연산
     */
    updateFogAndVisibility() {
        if (!this.fogRT || !this.squads) return;

        // 1. 안개 레이어를 검은색(0.85 투명도)으로 리셋
        this.fogRT.clear();
        this.fogRT.fill(0x000000, 0.85);

        // 2. 살아있는 아군(team === 1) 유닛들만 수집
        const playerUnits = [];
        this.squads.forEach(squad => {
            if (squad.team === 1) {
                squad.units.forEach(unit => {
                    if (unit.active && !unit.isDead) {
                        playerUnits.push(unit);
                    }
                });
            }
        });

        // 3. 아군 유닛 주변 안개 지우기 (Erase)
        playerUnits.forEach(unit => {
            const range = unit.visionRange || 350;
            
            this.fogBrush.clear();
            this.fogBrush.fillStyle(0xffffff, 1);
            this.fogBrush.fillCircle(unit.x, unit.y-128, range);

            // erase 모드로 안개 레이어에 구멍을 뚫음
            this.fogRT.erase(this.fogBrush);
        });

        // 4. 적 유닛(team !== 1)들의 시야 노출 여부 판단
        this.squads.forEach(squad => {
            if (squad.team !== 1) {
                squad.units.forEach(enemyUnit => {
                    if (!enemyUnit.active || enemyUnit.isDead) return;

                    // 아군 유닛 중 하나라도 이 적 유닛과의 거리가 visionRange 이하인지 검사
                    const isVisible = playerUnits.some(pUnit => {
                        const dist = Phaser.Math.Distance.Between(pUnit.x, pUnit.y, enemyUnit.x, enemyUnit.y);
                        return dist <= (pUnit.visionRange || 350);
                    });

                    // 시야 안이면 표시, 밖이면 숨김
                    enemyUnit.setUnitVisibility(isVisible);
                });
            }
        });
    }
    update(time,delta) {
        this.squads.forEach(squad => {
            squad.update(time,delta);
        });
        // ★ 0.1초 간격으로 안개 및 적 유닛 노출 상태 갱신
        if (time > this.lastFogUpdateTime + this.fogUpdateInterval) {
            this.lastFogUpdateTime = time;
            this.updateFogAndVisibility();

            //게임오버 처리
            this.checkGameOver();
        }
    }
}