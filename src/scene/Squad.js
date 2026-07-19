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
        
        this.speed = 150;
        this.hp = 100;      // 현재 체력
        this.maxHp = 100;   // 최대 체력
        this.ammo = 30;     // 현재 탄약
        this.maxAmmo = 30;  // 최대 탄약
        this.memberCount = 4; // 분대원 수


        this.isSelected = false;
        const spacing = 45; // 간격 조정
        
        for (let i = 0; i < 4; i++) {
            const yOffset = (i - 1.5) * spacing;
            const xOffset = Phaser.Math.Between(-10, 10); 

            // 변경된 Unit 클래스 생성자에 키 전달
            const unit = new Unit(scene, -200 + xOffset, y + yOffset, unitKey);
            
            unit.squadOffsetX = xOffset;
            unit.squadOffsetY = yOffset;
            
            this.units.push(unit);
        }
        this.selectSquad(false); // 초기 선택 상태는 false

        //시작하자마자 이동 시작 
        this.moveTo(x, y);

        this.uiScene = this.scene.scene.get('UIScene');
        this.uiScene.drawIndividualUnitGuides(this);
    }

    // ... selectSquad, moveTo 메서드는 동일 ...
    selectSquad(isSelected) {
        this.isSelected = isSelected;
        this.units.forEach(unit => unit.setSelected(isSelected));
    }

    moveTo(targetX, targetY) {
        
        this.targetX = targetX;
        this.targetY = targetY;
        this.units.forEach((unit, i) => {
            unit.squadOffsetY = (i - 1.5) * 45;
            unit.squadOffsetX = Phaser.Math.Between(-10, 10);
        });
    }

    update() {
        this.units.forEach(unit => {
            // [제거됨] unit.updateRing()은 Unit.preUpdate로 이동했습니다.
            // [제거됨] unit.updateAnimation()은 Unit.preUpdate로 이동했습니다.

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
                unit.setVelocity(0, 0);
            }
        });
    }
}