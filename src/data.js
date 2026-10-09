// src/data.js
export const GameData = {
    saveData: {
        gold: 10,
        score: 0,
        level: 1,
        playerHealth: 100,
        mapGrid : []
    },

    save() {
        localStorage.setItem('my_game_data', JSON.stringify(this.saveData));
        console.log('게임 데이터 저장 완료');
    },

    load() {
        const data = localStorage.getItem('my_game_data');
        if (data) {
            this.saveData = JSON.parse(data);
            console.log('게임 데이터 불러오기 완료');
        }else{
            console.log('저장된 게임 데이터가 없습니다. 기본값 사용');
        }
    }
};