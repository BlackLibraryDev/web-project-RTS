// src/Unit.js
import { axialToPixel } from './hexUtils.js';
import { startX, startY } from './metaMap.js';

export class Unit extends Phaser.GameObjects.Container {
    constructor(scene, object) {
        // 초기 픽셀 위치 계산
        const pos = axialToPixel(object.q, object.r);
        super(scene, pos.x, pos.y);

        this.q = object.q; // 현재 유닛의 Axial Q 좌표
        this.r = object.r; // 현재 유닛의 Axial R 좌표
        this.startX = startX;
        this.startY = startY;
        this.isMoving = false; // 이동 중 여부 체크

        // 유닛 외형 (원 형태의 플레이어 토큰)
        this.sprite = scene.add.sprite( 0,0, object.tag);
        this.sprite.setOrigin(0.5,0.7).setDepth(10).setScale(0.5);
        this.sprite.play(`${object.tag}_idle`)
        this.add(this.sprite);

        scene.add.existing(this);
    }

    // 경로(타일 배열)를 받아 순차적으로 한 칸씩 이동하는 메서드
    moveAlongPath(path, onComplete) {
        // 이미 이동 중이라면 기존 이동을 강제 중단하고 새 경로로 갱신하거나 무시할 수 있습니다.
        if (this.isMoving) {
            this.stopMovement();
        }
        
        if (path.length <= 1) return;

        this.isMoving = true;
        path.shift(); // 현재 위치 제외

        const stepNext = () => {
            // 강제 중단 등으로 플래그가 꺼졌다면 즉시 탈출
            if (!this.isMoving) return;

            if (path.length === 0) {
                this.isMoving = false;
                if (onComplete) onComplete();
                return;
            }

            const nextTileCoord = path.shift();
            this.q = nextTileCoord.q;
            this.r = nextTileCoord.r;

            const targetPos = axialToPixel(this.q, this.r, this.startX, this.startY);

            // ⭕ 현재 진행 중인 트윈 객체를 보관
            this.currentTween = this.scene.tweens.add({
                targets: this,
                x: targetPos.x,
                y: targetPos.y,
                duration: 500,
                ease: 'Linear',
                onComplete: () => {
                    this.scene.events.emit('movePoint', {r:this.r, q:this.q })
                    this.currentTween = null;
                    stepNext();
                }
            });
        };

        stepNext();
    }

    // 🛑 이동 강제 중단 메서드
    stopMovement() {
        if (!this.isMoving) return;

        // 1. 현재 실행 중인 Tween이 있다면 즉시 정지 및 제거
        if (this.currentTween) {
            this.currentTween.stop();
            this.currentTween = null;
        }

        this.isMoving = false;
        console.log(`유닛 이동 중단됨 (현재 위치: q=${this.q}, r=${this.r})`);
    }
    
}