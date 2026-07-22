export default class Unit extends Phaser.Physics.Arcade.Sprite {
    
    constructor(scene, x, y, texture, id, team) {
        super(scene, x, y, texture);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);

        // --- [핵심 1] 기준점(Origin)을 발밑 중앙으로 변경 ---
        // 기본값은 (0.5, 0.5) 센터입니다. (0.5, 1)로 설정하면
        // (x, y) 좌표가 스프라이트의 맨 아래 가운데가 됩니다.
        this.setOrigin(0.5, 0.9);

        this.id = id;
        this.team = team;
        this.targetEnemy = null; // Squad에서 지정해준 타겟 유닛

        // 전투 스탯
        this.hp = 100;
        this.attackPower = 15;
        //this.attackRange = 250;   // 사격 사거리
        this.attackCooldown = 1200; // 사격 주기 (1.2초)
        this.lastAttackTime = 0;
        this.isDead = false;

        this.isSelected = false;
        this.selectionRing = scene.add.graphics();

            // Unit.js 생성자 내부
    this.lastAttackTime = 0;
    this.attackCooldown = 1500; // 공격 속도: 1.5초당 1회

        
        const idleKey = `${texture}_idle`;
        const walkKey = `${texture}_walk`;
        // 초기 애니메이션 설정
        if (scene.anims.exists(idleKey)) {
            this.anims.play(idleKey);
        } else {
            // 혹시라도 개별 애니메이션을 못 찾았을 때 팅기지 않도록 기본 'idle' 백업 처리
            console.warn(`애니메이션을 찾을 수 없습니다: ${idleKey}. 기본 idle을 재생합니다.`);
            if (scene.anims.exists('idle')) {
                this.anims.play('idle');
            }
        }
    }

    setSelected(isSelected) {
        this.isSelected = isSelected;
        if (!this.isSelected) {
            this.selectionRing.clear();
        }
    }

    // --- [핵심 2] 이동 상태에 따른 애니메이션 제어 함수 ---
    updateAnimation() {
        // 1. 물리 엔진의 현재 속도를 확인하여 이동 중인지 판단
        const speed = this.body.speed;
        
        // 2. 현재 내 유닛의 고유 텍스처 키를 가져와 동적 애니메이션 키 이름 생성
        // 예: 'unit_archer' -> 'unit_archer_walk' / 'unit_archer_idle'
        const walkKey = `${this.texture.key}_walk`;
        const idleKey = `${this.texture.key}_idle`;
        
        // 3. 약간의 오차를 두고 속도가 5보다 크면 걷기, 아니면 idle
        if (speed > 5) {
            // 현재 재생 중인 애니메이션 키가 내 유닛의 walkKey와 다를 때만 새롭게 재생합니다 (중복 재생 방지)
            if (this.anims.currentAnim?.key !== walkKey) {
                // scene.anims.exists로 애니메이션이 등록되어 있는지 안전 검사 후 실행하면 더 좋습니다.
                if (this.scene.anims.exists(walkKey)) {
                    this.anims.play(walkKey, true);
                }
            }
        } else {
            // 현재 재생 중인 애니메이션 키가 내 유닛의 idleKey와 다를 때만 재생
            if (this.anims.currentAnim?.key !== idleKey) {
                if (this.scene.anims.exists(idleKey)) {
                    this.anims.play(idleKey, true);
                }
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
    // Squad가 타겟을 쥐어줄 때 호출
    setTarget(enemyUnit) {
        this.targetEnemy = enemyUnit;
    }
    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        // 발밑 링 업데이트
        this.updateRing();

        // 1. 유닛 사망 상태면 추가 연산 중단
        if (!this.active || this.isDead) return;

        // 2. 애니메이션 상태 갱신 (속도에 따른 walk/idle)
        this.updateAnimation();
        // 2. 사격 로직 실행
        this.handleShooting(time);

    }
    handleShooting(time) {
        // 타겟이 없거나 이미 죽었으면 사격 취소
        if (!this.targetEnemy || !this.targetEnemy.active || this.targetEnemy.isDead) {
            this.targetEnemy = null;
            return;
        }

        // 타겟과의 실제 거리 계산
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);

        // 사거리 내에 들어왔을 때 사격
       // if (dist <= this.attackRange) {
            // 적을 향해 좌우 반전(Flip)
            this.setFlipX(this.targetEnemy.x < this.x);

            // 쿨타임 체크 후 사격
            if (time > this.lastAttackTime + this.attackCooldown) {
                this.lastAttackTime = time;
                this.fireBullet(this.targetEnemy);
            }
       // }
    }

    fireBullet(target) {
        // 1. 공격 애니메이션 재생 (예: 'unit_archer_attack')
        const attackKey = `${this.texture.key}_attack`;
        if (this.scene.anims.exists(attackKey)) {
            this.anims.play(attackKey, true);
        }

        // 2. 즉발 데미지 적용 (또는 여기에 투사체/총알 Sprite 소환 로직 추가)
        console.log(`[사격!] ${this.texture.key} -> ${target.texture.key} 에게 ${this.attackPower} 데미지!`);
        target.takeDamage(this.attackPower);
    }

    takeDamage(amount) {
        this.hp -= amount;
        
        // 피격 피드백 (붉은색으로 잠시 깜빡임)
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => this.clearTint());

        if (this.hp <= 0 && !this.isDead) {
            this.isDead = true;
            //this.setActive(false);
            //this.setVisible(false);
            if (this.body) this.body.enable = false;
            this.destroy(this.scene);
        }
    }
    destroy(fromScene) {
    if (this.selectionRing) this.selectionRing.destroy();

    // 1. destroy 되기 전에 안전하게 씬과 이벤트 버스를 미리 변수에 담아둡니다.
    const scene = this.scene;
    const events = scene?.game?.events;
    const unitId = this.id; // 필요하다면 id도 미리 캡처

    if (scene && events) {
        scene.time.delayedCall(50, () => {
            // 미리 캡처해 둔 events 객체를 사용하므로 this.scene이 null이 되어도 에러가 나지 않습니다.
            events.emit('update-squads', { id: unitId });
        });
    }
    // 2. 부모 destroy 실행 (이제 this.scene이 null이 됩니다)
    super.destroy(fromScene);
}
}