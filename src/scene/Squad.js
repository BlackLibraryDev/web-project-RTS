import Unit from './Unit.js';

export default class Squad {
    constructor(scene, x, y, unitKey) {
        // Phaser GameObject 상속용 (만약 Group이나 Sprite 등을 상속받은 클래스라면 필요)
        // super(scene, x, y); 

        this.scene = scene;
        this.targetX = x + Phaser.Math.Between(-10, 10); // 약간의 랜덤 오프셋 추가
        this.targetY = y + Phaser.Math.Between(-10, 10);
        this.units = [];
        this.unitKey = unitKey;
        
        // [추가] 고유 이름표 부여
        this.id = Math.random().toString(36).substr(2, 9); // 임의의 고유 ID 생성  
        this.isSelected = false;
        
        this.originalSpeed = 150; // 기본 이동 속도
        this.retreatSpeed = 240; // 후퇴 시 속도 증가
        this.speed = this.originalSpeed;

        this.hp = 100;      // 현재 체력
        this.maxHp = 100;   // 최대 체력
        this.ammo = 30;     // 현재 탄약
        this.maxAmmo = 30;  // 최대 탄약
        this.memberCount = 4; // 분대원 수

        this.command ='';
        this.isSelected = false;
        const spacing = 45; // 간격 조정
        
        let count = 4; // 분대원 수
        switch (this.unitKey) {
            case 'unit_archer':
                count = 3;
                break;
            case 'unit_rifleman':
                count = 5;
                break;
            case 'unit_sniper':
                count = 1;
                break;
            default:
                count = 4; // 기본값
        }   
        this.maxCount = count; // 최대 분대원 수 저장

        //    count =1 //임시 
        for (let i = 0; i < count ; i++) {
            this.reinforceSquad(this.unitKey,false);
        }
        this.selectSquad(false); // 초기 선택 상태는 false

        //시작하자마자 이동 시작 
        this.moveTo(x, y);

        //*** 팀으로 변경 시 나중에 선 그리기 없애기
        this.scene.drawIndividualUnitGuides(this);
    }

    // ... selectSquad, moveTo 메서드는 동일 ...
    selectSquad(isSelected) {
        this.isSelected = isSelected;
        this.units.forEach(unit => unit.setSelected(isSelected));
    }
    //분대충원
    reinforceSquad(unitKey, updateUI = true) {
        if (this.units.length < this.maxCount) {
            const spacing = 45;
            const i = this.units.length; // 현재 분대원 수
            const yOffset = (i - 1.5) * spacing;
            const xOffset = Phaser.Math.Between(-10, 10);

            const unit = new Unit(this.scene, -100 + xOffset, this.targetY + yOffset, unitKey);
            unit.squadOffsetX = xOffset;
            unit.squadOffsetY = yOffset;
            unit.setSelected(this.isSelected); // 현재 분대 선택 상태에 맞춰 유닛 선택 상태 설정
            this.units.push(unit);
            if(updateUI) this.scene.game.events.emit('update-squads', { id: this.id });
        } else {
            console.log("분대가 이미 최대 인원입니다.");
        }
    }
    
    /**
     * [핵심] 장애물(엄폐물) 클릭 시 호출할 함수
     * 장애물의 위치와 유닛 배치 배열(배치법)을 받아 유닛별 오프셋을 수동 지정합니다.
     * @param {number} coverX - 장애물의 중심 X
     * @param {number} coverY - 장애물의 중심 Y
     * @param {Array} customOffsets - 각 유닛이 가야 할 [{x, y}, {x, y}...] 상대 좌표 배열
     */
    moveTo(coverX, coverY, customOffsets =null) {
        this.targetX = coverX;
        this.targetY = coverY;

        this.units.forEach((unit, i) => {
            if (customOffsets && customOffsets[i]) {
                // 장애물 모양에 맞춘 고정 오프셋 적용 (예: 엄폐물 뒤에 일렬로 서기 등)
                unit.squadOffsetX = customOffsets[i].x;
                unit.squadOffsetY = customOffsets[i].y;
            }else{
                 unit.squadOffsetY = (i - 1.5) * 45;
                unit.squadOffsetX = Phaser.Math.Between(-10, 10);
            }
        });
    }
    retreat(){
        this.command = 'Retreat';
        this.speed = this.retreatSpeed; // 후퇴 시 속도 증가
        this.moveTo(100, this.targetY); // 화면 왼쪽 밖으로 이동
        this.isSelected = false; // 분대 선택 해제
        this.units.forEach(unit => unit.setSelected(false));
        this.scene.game.events.emit('set-squad-selection', { id: this.id, isSelected: false });
    }

    update() {
        this.units.forEach(unit => {
            const unitTargetX = this.targetX + unit.squadOffsetX;
            const unitTargetY = this.targetY + unit.squadOffsetY;
            const distance = Phaser.Math.Distance.Between(unit.x, unit.y, unitTargetX, unitTargetY);
            if (distance > 5) {
                const angle = Phaser.Math.Angle.Between(unit.x, unit.y, unitTargetX, unitTargetY);
                unit.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);

                // 좌우 반전 처리 (기준점이 바뀌어도 작동합니다)
                if (Math.cos(angle) > 0) unit.setFlipX(false);
                else if (Math.cos(angle) < 0) unit.setFlipX(true);
            } else {
                // 도착 시 속도 0
                if(this.command === 'Retreat'){
                    this.speed = this.originalSpeed; // 후퇴 후 원래 속도로 복귀
                    this.command='';
                }
                unit.setVelocity(0, 0);
            }
        });
    }
}