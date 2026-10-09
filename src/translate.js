// src/translate.js
export const LanguageData = {
    currentLang: 'ko',
    dictionary: {},

    // TSV 텍스트 데이터를 받아 딕셔너리로 파싱
    initFromTSV(tsvText) {
        this.dictionary = {};
        
        // 줄바꿈으로 행 분리 (\r\n 및 \n 모두 대응)
        const lines = tsvText.split(/\r?\n/);
        if (lines.length === 0) return;

        // 첫 번째 행은 헤더 (key, ko, en...)
        const headers = lines[0].split('\t').map(h => h.trim());

        // 각 언어 코드별 객체 생성
        for (let i = 1; i < headers.length; i++) {
            const langCode = headers[i];
            if (langCode) {
                this.dictionary[langCode] = {};
            }
        }

        // 데이터 행 처리
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // 빈 줄 무시

            const cols = line.split('\t');
            const key = cols[0]?.trim();

            if (!key) continue;

            // 각 언어별로 키-값 매핑
            for (let j = 1; j < headers.length; j++) {
                const langCode = headers[j];
                const textValue = cols[j] || key; // 값 없으면 key 출력
                if (this.dictionary[langCode]) {
                    this.dictionary[langCode][key] = textValue;
                }
            }
        }

        console.log('번역 데이터 파싱 완료:', this.dictionary);
    },

    setLanguage(lang) {
        if (this.dictionary[lang]) {
            this.currentLang = lang;
            localStorage.setItem('game_language', lang);
        }
    },

    getText(key) {
        return this.dictionary[this.currentLang]?.[key] || key;
    }
};