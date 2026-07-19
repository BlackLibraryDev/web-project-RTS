export default class Unit extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);

        // --- [핵심 1] 기준점(Origin)을 발밑 중앙으로 변경 ---
        // 기본값은 (0.5, 0.5) 센터입니다. (0.5, 1)로 설정하면
        // (x, y) 좌표가 스프라이트의 맨 아래 가운데가 됩니다.
        this.setOrigin(0.5, 0.9);

        this.isSelected = false;
        this.selectionRing = scene.add.graphics();
        
        // 초기 애니메이션 설정
        this.anims.play('idle');
    }

    setSelected(isSelected) {
        this.isSelected = isSelected;
        if (!this.isSelected) {
            this.selectionRing.clear();
        }
    }

    // --- [핵심 2] 이동 상태에 따른 애니메이션 제어 함수 ---
    updateAnimation() {
        // 물리 엔진의 현재 속도를 확인하여 이동 중인지 판단
        const speed = this.body.speed;
        
        // 약간의 오차를 두고 속도가 0보다 크면 걷기, 아니면 idle
        if (speed > 5) {
            // 이미 'walk' 애니메이션이 재생 중인지 확인 후 중복 재생 방지
            if (this.anims.currentAnim?.key !== 'walk') {
                this.anims.play('walk', true);
            }
        } else {
            if (this.anims.currentAnim?.key !== 'idle') {
                this.anims.play('idle', true);
            }
        }
    }

    updateRing() {
        if (!this.isSelected) return;
        this.selectionRing.clear();
        this.selectionRing.lineStyle(2, 0x00aaff , 0.7);

        // [수정] 기준점이 (0.5, 1)이므로, 유닛의 현재 Y 좌표가 곧 발밑입니다.
        // 약간의 여유(offset)만 줍니다.
        const footY = this.y + 2; 
        
        this.selectionRing.strokeEllipse(this.x, footY, 28, 10);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        
        // 매 프레임 애니메이션 상태 업데이트
        this.updateAnimation();
        // 발밑 링 업데이트
        this.updateRing();
    }

    destroy(fromScene) {
        if (this.selectionRing) this.selectionRing.destroy();
        super.destroy(fromScene);
    }
}