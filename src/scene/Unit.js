export default class Unit extends Phaser.Physics.Arcade.Sprite {
    
    constructor(scene, x, y, texture, parent) {
        super(scene, x, y, texture);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setCollideWorldBounds(true);

        // --- [핵심 1] 기준점(Origin)을 발밑 중앙으로 변경 ---
        // 기본값은 (0.5, 0.5) 센터입니다. (0.5, 1)로 설정하면
        // (x, y) 좌표가 스프라이트의 맨 아래 가운데가 됩니다.
        this.setOrigin(0.5, 0.9);
        
        this.parent = parent;
        this.id = parent.id;
        this.team = parent.team;
        this.weapon = structuredClone(parent.weapon);
        // 시야 범위 스탯 추가 (픽셀 단위)
        this.visionRange = parent.visionRange || this.weapon.range +100;

        this.targetEnemy = null; // Squad에서 지정해준 타겟 유닛
        // 전투 스탯
        switch (parent.unitKey) {
            case 'unit_archer':
                this.hp = 50;
                this.maxHp = 50;
                break;
            case 'unit_rifleman':
                this.hp = 80;
                this.maxHp = 80;
                break;
            case 'unit_sniper':
                this.hp = 40;
                this.maxHp = 40;
                break;
            case 'unit_commandVan':
                this.hp = 1000;
                this.maxHp = 1000;
                this.weapon = null// 차량은 사격 불가
                break;
            default:
                this.hp = 100;
                this.maxHp = 100;
        }

        //this.attackRange = 250;   // 사격 사거리
        this.attackCooldown = 3000; // 사격 주기(weapon.cooldown)
        this.lastAttackTime = 0;
        this.isDead = false;

        //원형 크기
        this.isSelected = false;
        this.selectionRing = scene.add.graphics();
        this.sizeX = parent.type>1? 144 : 36;
        this.sizeY = parent.type>1? 48 : 16;

        
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
        }else{
            //console.log('유닛 선택됨: ', this.hp, this.maxHp, this.id);
        }
    }
        /**
     * 유닛 본체 및 부속 오브젝트(선택 링, 체력바 등) 통합 시야 처리
     */
    setUnitVisibility(isVisible) {
        this.setVisible(isVisible);

        // 유닛 하단 선택 링이나 기타 부속 오브젝트가 있다면 함께 숨김/표시
        if (this.selectionRing) {
            this.selectionRing.setVisible(isVisible);
        }
        if (this.hpBar) {
            this.hpBar.setVisible(isVisible);
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
        
        this.selectionRing.strokeEllipse(this.x, footY, this.sizeX, this.sizeY);
    }
    // Squad가 타겟을 쥐어줄 때 호출
    setTarget(enemyUnit) {
        this.targetEnemy = enemyUnit;
    }
    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        // 발밑 링 업데이트
        this.updateRing();
        
        // ★ Y좌표 기준 뎁스 정렬 (아래쪽 Y값 유닛이 앞쪽에 그려짐)
        this.setDepth(this.y);

        // 1. 유닛 사망 상태면 추가 연산 중단
        if (!this.active || this.isDead) return;

        // 2. 애니메이션 상태 갱신 (속도에 따른 walk/idle)
        this.updateAnimation();
        // 2. 사격 로직 실행
        this.handleShooting(time);

    }
    handleShooting(time) {
        //탄약이 없으면 사격 취소 
        if(this.parent.ammo<=0){
            return;
        }
        // 타겟이 없거나 이미 죽었으면 사격 취소
        if (!this.targetEnemy || !this.targetEnemy.active || this.targetEnemy.isDead) {
            this.targetEnemy = null;
            return;
        }
        if( this.weapon ==null || this.weapon.range <= 0){
            return;
        }
        // 타겟과의 실제 거리 계산
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);

        // 사거리 내에 들어왔을 때 사격
       if (dist <= this.visionRange) {
            // 적을 향해 좌우 반전(Flip)
            this.setFlipX(this.targetEnemy.x < this.x);

            // 쿨타임 체크 후 사격
            if (time > this.lastAttackTime + this.attackCooldown) {
                this.lastAttackTime = time;
                this.attackCooldown = this.weapon.cooldown + Phaser.Math.Between(0,300);
                this.fireBurst(this.targetEnemy);
                
            }
       }
    }

    /**
     * 30ms 간격으로 4발 연속 발사하는 연발(Burst) 함수
     */
    fireBurst(target) {
        // 공격 모션 애니메이션 재생
        const attackKey = `${this.texture.key}_attack`;
        if (this.scene.anims.exists(attackKey)) {
            this.anims.play(attackKey, true);
        }

        // 30ms 간격으로 총 4번(repeat: 3 -> 최초 1회 + 반복 3회 = 4회) 실행
        this.scene.time.addEvent({
            delay: this.weapon.burstDelay, // ms 간격
            repeat: this.weapon.burstCount-1, // 총 4발 (0, 1, 2, 3)
            callback: () => {
                // 사격 중간에 타겟이 파괴되어도 남은 탄환은 마지막 타겟 좌표 방향으로 날아갑니다.
                if (target && this.scene !=null) {
                    this.spawnBullet(target);
                }
            },
            callbackScope: this
        });
        this.parent.useAmmo(4);
    }  

    /**
     * 물리 충돌(overlap) 대신 목표 지점에 도달했을 때 사라지는 탄환 발사 로직
     */
    spawnBullet(target) {
        if(!this.scene) return;
        const spawnX = this.x;
        const spawnY = this.y - 12;

        // 발사 시점의 타겟 위치 보관
        const targetX = target.x +Phaser.Math.Between(-30,30);
        const targetY = target.y +Phaser.Math.Between(-30,30);

        // 1. 탄환 Sprite 생성 (물리 바디 불필요하므로 scene.add.sprite 사용)
        const bullet = this.scene.add.sprite(spawnX, spawnY, 'bullet');
        bullet.setDepth(10);

        // 2. 각도 계산 및 탄환 회전
        const angle = Phaser.Math.Angle.Between(spawnX, spawnY, targetX, targetY);
        bullet.setRotation(angle);

        // 3. 거리 기반 비행 시간 계산 (탄 속도: 800 px/sec)
        const bulletSpeed = this.weapon.bulletSpeed;
        const distance = Phaser.Math.Distance.Between(spawnX, spawnY, targetX, targetY);
        const duration = (distance / bulletSpeed) * 1000;

        // 4. Tween으로 목표 위치까지 직진 이동 후 소멸 및 대미지 적용
        this.scene.tweens.add({
            targets: bullet,
            x: targetX,
            y: targetY,
            duration: Math.max(duration, 50), // 최소 50ms 보장
            ease: 'Linear',
            onComplete: () => {
                // 도착 완료 시점에 적이 살아있다면 대미지 전달
                if (target && target.active && !target.isDead) {
                    target.takeDamage(this.weapon.damage);
                }
                // 탄환 제거
                bullet.destroy();
            }
        });
    }

    takeDamage(amount) {
        
        const damage = Math.random()*100;
        if(damage < amount && this.parent.type==1){
            this.hp = 0;

        }else{
            this.hp -= amount;
        }
        
        
        
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
                super.destroy(fromScene);
            });
        }
        // 2. 부모 destroy 실행 (이제 this.scene이 null이 됩니다)
        
    }
}