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
        if (this.isMoving || path.length <= 1) return;
        
        this.isMoving = true;
        
        // 첫 번째 요소는 현재 위치이므로 제외하고 다음 칸부터 순회
        path.shift(); 

        const stepNext = () => {
            if (path.length === 0) {
                this.isMoving = false;
                if (onComplete) onComplete();
                return;
            }

            const nextTileCoord = path.shift();
            this.q = nextTileCoord.q;
            this.r = nextTileCoord.r;
            
            // 다음 타일의 픽셀 좌표 계산
            const targetPos = axialToPixel(this.q, this.r, this.startX, this.startY);
            

            // Phaser Tween을 사용해 부드럽게 이동
            this.scene.tweens.add({
                targets: this,
                x: targetPos.x,
                y: targetPos.y,
                duration: 500, // 한 칸 이동하는 데 걸리는 시간 (ms)
                ease: 'Linear',
                onComplete: () => {
                    //console.log(`도착점 : ${this.r} ${this.q}`)
                    this.scene.events.emit('movePoint', {r:this.r, q:this.q })
                    stepNext(); // 다음 칸으로 재귀 호출
                }
            });
        };

        stepNext();
    }
}