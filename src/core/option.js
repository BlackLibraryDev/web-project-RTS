// src/option.js
export const GameOptions = {
    // 기본 설정값
    config: {
        width: 1280,          // 가상 해상도 가로
        height: 720,          // 가상 해상도 세로
        debugMode: true,     // 디버그 여부
        bgmVolume: 0.7,       // 배경음악 볼륨 (0.0 ~ 1.0)
        sfxVolume: 1.0,        // 효과음 볼륨 (0.0 ~ 1.0)
        zoomRatio:{min:0.5,max:2.5, ratio:0.002}
    },

    // 로컬 스토리지에서 사용자 설정 불러오기
    loadOptions() {
        return;
        const saved = localStorage.getItem('projectRTS_options');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // 기존 config에 덮어쓰기
                this.config = { ...this.config, ...parsed };
                console.log('게임 옵션 불러오기 성공');
            } catch (e) {
                console.error('옵션 파싱 실패:', e);
            }
        }else{
             this.saveOptions();
        }
    },

    // 사용자 설정 저장하기
    saveOptions() {
        localStorage.setItem('projectRTS_options', JSON.stringify(this.config));
        console.log('게임 옵션 저장 완료');
    },

    // 특정 옵션 값 변경 및 저장
    setOption(key, value) {
        if (this.config.hasOwnProperty(key)) {
            this.config[key] = value;
            this.saveOptions();
        }
    }
};