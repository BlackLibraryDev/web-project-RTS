// src/HexTile.js
export const HEX_SIZE = 72; // 타일 반지름(px)

// 지형 정의 (이동 비용, 색상 등)
export const TERRAIN_TYPES = {
    FOG: {id:-1, name:'fog', slot:0, color:0x333333, moveCost:1, isWalkable: true},
    EMPTY: { id: 0, name: 'empty', slot:0, color: 0x000000, moveCost: 1 ,isWalkable: false},
    WATER: { id: 1, name: 'water', slot:1, color: 0x3388cc, moveCost: 2 ,isWalkable: false},
    REDWOOD: { id: 2, name: 'redwood', slot:1, color: 0xf3572c, moveCost: 2 ,isWalkable: true},
    GRASS: { id: 3, name: 'field', slot:2, color: 0x55aa55, moveCost: 1 ,isWalkable: true},
    MOUNTAIN: { id: 4, name: 'mountain', slot:1,  color: 0x885522, moveCost: 5 ,isWalkable: true},
    ROAD: { id: 12, name: '도로', slot:0, color: 0xddccaa, moveCost: 0.5 ,isWalkable: true},
    VIL: { id: 11, name: 'vil', slot:2, color: 0xcc3333, moveCost: 1,isWalkable: true }
};

export const Facility={
    redwood:{name:'redwood',        isDemol:false, type:'resource', resource:'wood',labor:0, maxLabor:20,  amount:1000, maxAmount:1000},
    water:{name:'water',            isDemol:false,type:'resource', resource:'water',  amount:-1, maxAmount:-1},
    WaterPump:{name:'waterPump',    isDemol:true,type:'resource', resource:'water'},
    Well:{name:'well',              isDemol:true,type:'storage', resource:'water'},
    GasStation:{name:'gasStation',  isDemol:false,type:'storage', resource:'gas',labor:0,  amount:100, maxAmount:100},
    GasTank:{name:'gasStation',     isDemol:false,type:'storage', resource:'gas',labor:0,  amount:500, maxAmount:500},
    JunkMine:{name:'junkMine',      isDemol:false,type:'mine', resource:'misc', labor:0, maxLabor:10, amount:500, maxAmount:500},
    MouseFarm:{name:'mouseFarm',    isDemol:true,type:'farm', resource:'food', labor:0, maxLabor:2, amount:100, maxAmount:100 },
    Apartment:{name:'apartment',    isDemol:false,        type:'house', amount:10 },
    BoardingHouse:{name:'boardingHouse', isDemol:true,   type:'house', amount:10 },
    BaseCamp:{name:'basecamp',      isDemol:true, type:'house',   amount:4}
}
/**
 * 지정한 시설 키(Key)의 데이터 복사본 객체를 반환하는 팩토리 함수
 * @param {string} facilityKey - 예: 'GasTank', 'JunkMine' 등
 * @returns {Object|null} 독립된 속성을 가진 시설 데이터 객체
 */
export function createFacilityData(facilityKey) {
    const template = facilityKey;
    
    if (!template) {
        console.warn(`[Facility] 존재하지 않는 시설 타입입니다: ${facilityKey}`);
        return null;
    }

    // 전개 연산자(...)를 사용해 원본과 참조가 끊긴 새로운 객체(복사본) 반환
    return { ...template };
}

export class HexTile extends Phaser.GameObjects.Container {
    constructor(scene, x, y, q, r, terrainType, team =0) {
        super(scene, x, y);

        this.q = q; // Axial 좌표 Q (열)
        this.r = r; // Axial 좌표 R (행)
        this.terrain = terrainType;
        this.isExplored = false; // 탐험 여부 (Fog of War)

        // 1. 육각형 배경 그래픽 생성
        this.teamGraphics = scene.add.graphics();

        this.bgGraphics = scene.add.graphics();
        this.drawHexagon(this.terrain, team );
        this.add([this.bgGraphics, this.teamGraphics]);

        // 2. 타일 상단 텍스트 (좌표 또는 건물/지형 이름 표시)
        this.label = scene.add.text(0, 0, `${q},${r}`, {
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.add(this.label);

        // 3. 마우스 클릭 히트 영역(Hit Area) 설정
        const points = this.getHexPoints();
        const polygon = new Phaser.Geom.Polygon(points);
        this.setInteractive(polygon, Phaser.Geom.Polygon.Contains);

        // 마우스 상호작용 이벤트
        this.on('pointerdown', () => {
            scene.events.emit('tileClicked', this);
        });

        this.on('pointerover', () => {
            this.bgGraphics.setAlpha(0.8);
        });

        this.on('pointerout', () => {
            this.bgGraphics.setAlpha(1.0);
        });

        // 씬에 Container 추가
        scene.add.existing(this);
    }

    // 육각형 꼭짓점 계산 (Pointy-Top)
    getHexPoints() {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angleDeg = 60 * i - 30;
            const angleRad = (Math.PI / 180) * angleDeg;
            points.push(new Phaser.Geom.Point(
                HEX_SIZE * Math.cos(angleRad),
                HEX_SIZE * Math.sin(angleRad)
            ));
        }
        return points;
    }

    // 육각형 그리기
    drawHexagon(terrain, team=0 ) {
        // 1. 지형 데이터에 정의된 textureKey를 사용해 스프라이트 생성
        // 만약 키가 존재하지 않으면 기본 필드 텍스처로 폴백(Fallback) 처리
        const textureToUse =`tile_${terrain.name}` ?? 'tile_field';
        this.tileSprite = this.scene.add.sprite(0, 0, textureToUse);
        
        // 2. 스프라이트 크기를 헥스 규격에 맞게 조절 (높이 기준 스케일링)
        const targetHeight = HEX_SIZE * 2;
        const scale = targetHeight / this.tileSprite.height;
        this.tileSprite.setScale(scale);

        this.add(this.tileSprite);

        const points = this.getHexPoints();
        this.bgGraphics.clear();
        this.bgGraphics.fillStyle(terrain.color, 0);
        this.bgGraphics.lineStyle(2, 0x111111, 0.8);
        this.bgGraphics.fillPoints(points, true);
        this.bgGraphics.strokePoints(points, true);
      
        if(team>0){
            this.teamGraphics.clear()
            this.teamGraphics.fillStyle((team >1 ? 0xff4f4f :  0x2fb9ff  ) , 0.5)
            //this.teamGraphics.lineStyle(2, (team >1 ? 0xff4f4f :  0x2cb9ff  ), 1);
            this.teamGraphics.fillPoints(points, true);
            this.teamGraphics.strokePoints(points, true);
        }
    }
}