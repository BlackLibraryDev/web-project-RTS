// src/data.js
export const GameData = {
    // 1. 구글 스프레드시트(TSV)에서 불러온 정적 설정 데이터 보관소
    facilities: {},
    terrains: {},
    units: {},
    // ⭕ [필수 추가] preload.js에서 호출하고 있는 init 메서드 정의
    init(facilities = {}, terrains = {}, units = {}) {
        this.facilities = facilities;
        this.terrains = terrains;
        this.units = units;
    },

    saveData: {
        house:0,
        manPower:10,
        ammo:100,
        food:120,
        fuel:20,
        misc:500,
        mapDatas:[]
    },
    save() {
        localStorage.setItem('projectRTS_game_data', JSON.stringify(this.saveData));
        console.log('게임 데이터 저장 완료');
    },

    load() {
        const data = localStorage.getItem('projectRTS_game_data');
        if (data) {
            this.saveData = JSON.parse(data);
            console.log('게임 데이터 불러오기 완료');
        }else{
            console.log('저장된 게임 데이터가 없습니다. 기본값 사용');
        }
    }
};
/**
 * 범용 TSV 텍스트 파서 함수
 * @param {string} tsvText - load.text로 불러온 TSV 원본 문자열
 * @param {string} keyField - 객체의 룩업 키로 사용할 컬럼명 (기본값: 'name' 또는 'id')
 * @returns {Object} 파싱된 데이터 맵 객체
 */
export function parseTSVToMap(tsvText, keyField = 'tag') {
    const lines = tsvText.trim().split('\n');
    if (lines.length === 0) return {};

    // 1. 첫 번째 줄(헤더) 분리
    const headers = lines[0].split('\t').map(h => h.trim());
    const dataMap = {};

    // 2. 두 번째 줄부터 데이터 행 순회
    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (!currentLine) continue;

        const values = currentLine.split('\t').map(v => v.trim());
        const itemObj = {};

        headers.forEach((header, index) => {
            let val = values[index];

            // 1. 빈 값이거나 존재하지 않는 셀인 경우 null 처리
            if (val === undefined || val === '') {
                itemObj[header] = null;
            } 
            // 2. Boolean 변환
            else if (val === 'TRUE' || val === 'true') {
                itemObj[header] = true;
            } else if (val === 'FALSE' || val === 'false') {
                itemObj[header] = false;
            } 
            // 3. Number 변환
            else if (!isNaN(val)) {
                itemObj[header] = Number(val);
            } 
            // 4. 일반 문자열
            else {
                itemObj[header] = val;
            }
        });

        // 지정한 keyField 값을 키로 사용하여 매핑
        const mapKey = itemObj[keyField];
        if (mapKey !== undefined) {
            dataMap[mapKey] = itemObj;
        }
    }

    return dataMap;
}

/**
 * 지정한 시설 키(Key)의 데이터 복사본 객체를 반환하는 팩토리 함수
 * @param {string} facilityKey - 예: 'GasTank', 'JunkMine' 등
 * @returns {Object|null} 독립된 속성을 가진 시설 데이터 객체
 */
export function createFacilityData(facilityKey) {
    //console.log(GameData.facilities.gasTank.amount); // 500
    const template = GameData.facilities[facilityKey];
    if (!template) {
        console.warn(`[Facility] 존재하지 않는 시설 타입입니다: ${facilityKey}`);
        return null;
    }
    //특정 랜덤값 계산
    const data = { ...template };
    if(data.type =='house'){
        //집 공간 랜덤값
        if(data.maxAmount !=null){
            data.amount = Phaser.Math.Between( 0, data.maxAmount);
        }
    }
    if(data.type=='mine'){
        //광산 자원 랜덤값
        data.amount = Phaser.Math.Between( 0, data.maxAmount);
    }
    if(data.spentResource!=null){
        const spentResource = data.spentResource.split(';');
        let spent ={};
        for(let i =0 ; i< spentResource.length ; i++){
            if(spentResource[i].length>0){
                const value = spentResource[i].split(':');
                spent[value[0]] = Number(value[1])
            }
            
        }
        data.spentResource = spent;
    }
    

    // 전개 연산자(...)를 사용해 원본과 참조가 끊긴 새로운 객체(복사본) 반환
    return data
}
