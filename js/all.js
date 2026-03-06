/**
 * 小小英語樂園 - 語音功能
 * 處理 TTS 文字轉語音和語音識別
 */

// ===== 語音合成 (TTS) =====
const SpeechSynthesis = {
    voices: [],
    voicesLoaded: false,
    
    // 初始化聲音
    init() {
        if (this.voicesLoaded) return Promise.resolve();
        
        return new Promise((resolve) => {
            const loadVoices = () => {
                this.voices = window.speechSynthesis.getVoices();
                this.voicesLoaded = true;
                console.log('Voices loaded:', this.voices.length);
                resolve();
            };
            
            // 有時 voices 需要時間加載
            if (this.voices.length > 0) {
                loadVoices();
            } else {
                window.speechSynthesis.onvoiceschanged = loadVoices;
                //  超時後就算
                setTimeout(() => {
                    if (!this.voicesLoaded) {
                        this.voices = window.speechSynthesis.getVoices();
                        this.voicesLoaded = true;
                        resolve();
                    }
                }, 1000);
            }
        });
    },
    
    // 檢查瀏覽器支持
    isSupported() {
        return 'speechSynthesis' in window;
    },
    
    // 獲取可用聲音
    getVoices() {
        return this.voices;
    },
    
    // 獲取英語聲音
    getEnglishVoice() {
        const voices = this.getVoices();
        if (voices.length === 0) {
            console.warn('No voices available');
            return null;
        }
        // 優先選擇美國英語女性聲音
        let voice = voices.find(v => v.lang === 'en-US' && v.name.includes('Female'));
        if (!voice) voice = voices.find(v => v.lang.startsWith('en-') && v.name.includes('Female'));
        if (!voice) voice = voices.find(v => v.lang.startsWith('en-'));
        if (!voice) voice = voices.find(v => v.lang === 'en-US');
        if (!voice) voice = voices[0];
        console.log('Selected voice:', voice?.name, voice?.lang);
        return voice;
    },
    
    // 朗讀文本
    async speak(text, options = {}) {
        // 确保voices已加载
        await this.init();
        
        return new Promise((resolve, reject) => {
            if (!this.isSupported()) {
                reject(new Error('瀏覽器不支持語音合成'));
                return;
            }
            
            // 停止當前朗讀
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // 設置聲音
            if (options.voice) {
                utterance.voice = options.voice;
            } else {
                utterance.voice = this.getEnglishVoice();
            }
            
            // 設置參數
            utterance.rate = options.rate || 0.9; // 速度稍慢，適合小朋友
            utterance.pitch = options.pitch || 1;
            utterance.volume = options.volume || 1;
            
            // 事件處理
            utterance.onend = () => resolve();
            utterance.onerror = (e) => reject(e);
            
            window.speechSynthesis.speak(utterance);
        });
    },
    
    // 朗讀單字（更適合學習）
    speakWord(word) {
        return this.speak(word, {
            rate: 0.8,
            pitch: 1
        });
    },
    
    // 朗讀句子
    speakSentence(sentence) {
        return this.speak(sentence, {
            rate: 0.85,
            pitch: 1
        });
    },
    
    // 停止朗讀
    stop() {
        window.speechSynthesis.cancel();
    }
};

// ===== 語音識別 (STT) =====
const SpeechRecognition = {
    recognition: null,
    isListening: false,
    
    // 檢查瀏覽器支持
    isSupported() {
        return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    },
    
    // 初始化識別器
    init() {
        if (!this.isSupported()) {
            console.warn('瀏覽器不支持語音識別');
            return false;
        }
        
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognitionAPI();
        
        // 設置識別器參數
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        return true;
    },
    
    // 開始識別
    start(options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.recognition && !this.init()) {
                reject(new Error('無法初始化語音識別'));
                return;
            }
            
            if (this.isListening) {
                reject(new Error('正在識別中'));
                return;
            }
            
            // 設置語言
            if (options.lang) {
                this.recognition.lang = options.lang;
            }
            
            // 結果處理
            this.recognition.onresult = (event) => {
                const results = event.results;
                const lastResult = results[results.length - 1];
                const transcript = lastResult[0].transcript;
                const isFinal = lastResult.isFinal;
                
                if (options.onResult) {
                    options.onResult(transcript, isFinal);
                }
                
                if (isFinal) {
                    resolve(transcript);
                    this.isListening = false;
                }
            };
            
            // 錯誤處理
            this.recognition.onerror = (event) => {
                this.isListening = false;
                reject(new Error(event.error));
            };
            
            // 結束處理
            this.recognition.onend = () => {
                this.isListening = false;
            };
            
            // 開始識別
            this.isListening = true;
            this.recognition.start();
        });
    },
    
    // 停止識別
    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
    },
    
    // 比較發音（簡單版本）
    comparePronunciation(spoken, target) {
        // 轉為小寫並去除標點
        const normalize = (text) => {
            return text.toLowerCase()
                .replace(/[.,!?]/g, '')
                .replace(/\s+/g, '')
                .trim();
        };
        
        const spokenNorm = normalize(spoken);
        const targetNorm = normalize(target);
        
        if (spokenNorm === targetNorm) {
            return { isCorrect: true, score: 100 };
        }
        
        // 計算相似度（Levenshtein距離）
        const distance = this.levenshteinDistance(spokenNorm, targetNorm);
        const maxLength = Math.max(spokenNorm.length, targetNorm.length);
        const similarity = Math.max(0, (1 - distance / maxLength) * 100);
        
        // 根據相似度判斷
        let isCorrect = false;
        let feedback = '';
        
        if (similarity >= 90) {
            isCorrect = true;
            feedback = '非常棒！';
        } else if (similarity >= 70) {
            isCorrect = false;
            feedback = '很不錯！再試一次！';
        } else if (similarity >= 50) {
            isCorrect = false;
            feedback = '有點接近了喔！';
        } else {
            isCorrect = false;
            feedback = '再聽聽看正確的發音吧！';
        }
        
        return { isCorrect, score: Math.round(similarity), feedback };
    },
    
    // 計算Levenshtein距離
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,     // 刪除
                        dp[i][j - 1] + 1,     // 插入
                        dp[i - 1][j - 1] + 1  // 替換
                    );
                }
            }
        }
        
        return dp[m][n];
    }
};

// ===== 音效播放 =====
const SoundEffects = {
    audioContext: null,
    
    // 初始化 AudioContext
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    },
    
    // 播放音調
    playTone(frequency, duration, type = 'sine') {
        const ctx = this.init();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    },
    
    // 播放成功音效
    playSuccess() {
        // 播放歡快的音階
        const notes = [523, 659, 784]; // C5, E5, G5
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.3), i * 150);
        });
    },
    
    // 播放錯誤音效
    playError() {
        // 播放低沉的音調
        this.playTone(200, 0.3, 'sawtooth');
        setTimeout(() => this.playTone(150, 0.3, 'sawtooth'), 200);
    },
    
    // 播放按鈕點擊音效
    playClick() {
        this.playTone(800, 0.1);
    },
    
    // 播放獎勵音效
    playReward() {
        // 播放勝利的音階
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((note, i) => {
            setTimeout(() => this.playTone(note, 0.2), i * 100);
        });
    },
    
    // 播放錄音中音效
    playRecording() {
        this.playTone(440, 0.1);
    }
};

// ===== 導出模組=====
window.SpeechSynthesis = SpeechSynthesis;
window.SpeechRecognition = SpeechRecognition;
window.SoundEffects = SoundEffects;

/**
 * 小小英語樂園 - 單字遊戲邏輯
 * 處理聽寫模式和發音模式的遊戲流程
 */

// ===== 遊戲配置 =====
const GameConfig = {
    questionsPerGame: 10,
    hintPenalty: true, // 使用提示是否扣分
    showAnswerOnWrong: true // 錯誤時是否顯示正確答案
};

// ===== 聽寫模式遊戲 =====
const DictationGame = {
    currentWordIndex: 0,
    currentWord: null,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    usedWords: [],
    questionCount: 0,
    
    // 開始遊戲
    start() {
        this.reset();
        AppState.currentMode = 'dictation';
        this.loadQuestion();
        showScreen('dictationGame');
        
        // 更新題目計數
        document.getElementById('totalQuestions').textContent = GameConfig.questionsPerGame;
        
        // 自動播放第一個單字的讀音
        setTimeout(() => this.playCurrentWord(), 500);
    },
    
    // 重置遊戲狀態
    reset() {
        this.currentWordIndex = 0;
        this.currentWord = null;
        this.score = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.usedWords = [];
        this.questionCount = 0;
        
        // 重置顯示
        document.getElementById('score').textContent = '0';
        document.getElementById('currentQuestion').textContent = '1';
        document.getElementById('answerInput').value = '';
        document.getElementById('feedbackArea').innerHTML = '';
    },
    
    // 加載題目
    loadQuestion() {
        // 獲取隨機單字
        this.currentWord = WordBank.getRandomWord(this.usedWords);
        this.usedWords.push(this.currentWord.word);
        
        this.questionCount++;
        document.getElementById('currentQuestion').textContent = this.questionCount;
        document.getElementById('answerInput').value = '';
        document.getElementById('answerInput').focus();
        document.getElementById('feedbackArea').innerHTML = '';
        
        // 清空提示狀態
        this.hintShown = false;
    },
    
    // 播放當前單字讀音
    playCurrentWord() {
        if (this.currentWord) {
            SpeechSynthesis.speakWord(this.currentWord.word)
                .catch(err => console.error('播放失敗:', err));
        }
    },
    
    // 提交答案
    submitAnswer() {
        const input = document.getElementById('answerInput');
        const answer = input.value.trim().toLowerCase();
        
        if (!answer || !this.currentWord) return;
        
        const isCorrect = answer === this.currentWord.word.toLowerCase();
        
        // 記錄答案
        recordAnswer(this.currentWord.word, isCorrect);
        
        if (isCorrect) {
            this.handleCorrect();
        } else {
            this.handleWrong(answer);
        }
    },
    
    // 處理正確答案
    handleCorrect() {
        this.correctCount++;
        this.score += 10;
        
        document.getElementById('score').textContent = this.score;
        
        // 顯示正確反饋
        const feedbackArea = document.getElementById('feedbackArea');
        feedbackArea.innerHTML = `
            <div class="feedback-correct">
                <div class="feedback-icon">🎉</div>
                <div class="feedback-text">太棒了！</div>
            </div>
        `;
        
        // 播放成功音效
        SoundEffects.playSuccess();
        
        // 延遲進入下一題
        setTimeout(() => this.nextQuestion(), 1500);
    },
    
    // 處理錯誤答案
    handleWrong(userAnswer) {
        this.wrongCount++;
        
        // 播放錯誤音效
        SoundEffects.playError();
        
        // 顯示錯誤反饋
        const feedbackArea = document.getElementById('feedbackArea');
        let feedbackHTML = `
            <div class="feedback-wrong">
                <div class="feedback-icon">😅</div>
                <div class="feedback-text">
        `;
        
        if (GameConfig.showAnswerOnWrong) {
            feedbackHTML += `正確答案是: <strong>${this.currentWord.word}</strong>`;
        } else {
            feedbackHTML += `再試一次！`;
        }
        
        feedbackHTML += `</div></div>`;
        feedbackArea.innerHTML = feedbackHTML;
        
        // 朗讀正確答案
        setTimeout(() => {
            SpeechSynthesis.speakWord(this.currentWord.word);
        }, 500);
        
        // 延遲進入下一題
        setTimeout(() => this.nextQuestion(), 2500);
    },
    
    // 顯示提示
    showHint() {
        if (this.hintShown) return;
        
        this.hintShown = true;
        
        // 顯示單字的第一個字母
        const hint = this.currentWord.word[0] + '...';
        
        const feedbackArea = document.getElementById('feedbackArea');
        feedbackArea.innerHTML = `
            <div class="feedback-wrong">
                <div class="feedback-icon">💡</div>
                <div class="feedback-text">提示: 以 <strong>${hint}</strong> 開頭</div>
            </div>
        `;
        
        // 扣分
        this.score = Math.max(0, this.score - 2);
        document.getElementById('score').textContent = this.score;
    },
    
    // 跳過單字
    skipWord() {
        this.wrongCount++;
        recordAnswer(this.currentWord.word, false);
        
        const feedbackArea = document.getElementById('feedbackArea');
        feedbackArea.innerHTML = `
            <div class="feedback-wrong">
                <div class="feedback-icon">⏭️</div>
                <div class="feedback-text">跳過了，正確答案是: <strong>${this.currentWord.word}</strong></div>
            </div>
        `;
        
        setTimeout(() => this.nextQuestion(), 1500);
    },
    
    // 進入下一題
    nextQuestion() {
        if (this.questionCount >= GameConfig.questionsPerGame) {
            this.endGame();
        } else {
            this.loadQuestion();
        }
    },
    
    // 結束遊戲
    endGame() {
        showGameResult(this.correctCount, this.wrongCount);
    }
};

// ===== 發音模式遊戲 =====
const PronunciationGame = {
    currentWordIndex: 0,
    currentWord: null,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    usedWords: [],
    questionCount: 0,
    isRecording: false,
    phoneticShown: false,
    
    // 開始遊戲
    start() {
        this.reset();
        AppState.currentMode = 'pronunciation';
        this.loadQuestion();
        showScreen('pronunciationGame');
        
        // 更新題目計數
        document.getElementById('pronTotalQuestions').textContent = GameConfig.questionsPerGame;
        
        // 自動播放第一個單字的讀音
        setTimeout(() => this.playPronunciation(), 500);
    },
    
    // 重置遊戲狀態
    reset() {
        this.currentWordIndex = 0;
        this.currentWord = null;
        this.score = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.usedWords = [];
        this.questionCount = 0;
        this.isRecording = false;
        this.phoneticShown = false;
        
        // 重置顯示
        document.getElementById('pronScore').textContent = '0';
        document.getElementById('pronCurrentQuestion').textContent = '1';
        document.getElementById('pronFeedbackArea').innerHTML = '';
        document.getElementById('phoneticHint').classList.add('hidden');
        document.getElementById('recordBtn').classList.remove('recording');
        this.updateRecordButton();
    },
    
    // 加載題目
    loadQuestion() {
        // 獲取隨機單字
        this.currentWord = WordBank.getRandomWord(this.usedWords);
        this.usedWords.push(this.currentWord.word);
        
        this.questionCount++;
        this.phoneticShown = false;
        
        document.getElementById('pronCurrentQuestion').textContent = this.questionCount;
        document.getElementById('pronWordText').textContent = this.currentWord.word;
        document.getElementById('pronFeedbackArea').innerHTML = '';
        document.getElementById('phoneticHint').classList.add('hidden');
    },
    
    // 播放發音
    playPronunciation() {
        if (this.currentWord) {
            SpeechSynthesis.speakWord(this.currentWord.word)
                .catch(err => console.error('播放失敗:', err));
        }
    },
    
    // 切換錄音狀態
    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    },
    
    // 開始錄音
    startRecording() {
        if (!SpeechRecognition.isSupported()) {
            alert('抱歉，您的瀏覽器不支持語音識別功能');
            return;
        }
        
        this.isRecording = true;
        this.updateRecordButton();
        
        // 開始識別
        SpeechRecognition.start({
            onResult: (transcript, isFinal) => {
                if (isFinal) {
                    this.processRecordingResult(transcript);
                }
            }
        }).catch(err => {
            console.error('錄音失敗:', err);
            this.isRecording = false;
            this.updateRecordButton();
        });
    },
    
    // 停止錄音
    stopRecording() {
        SpeechRecognition.stop();
        this.isRecording = false;
        this.updateRecordButton();
    },
    
    // 更新錄音按鈕
    updateRecordButton() {
        const btn = document.getElementById('recordBtn');
        if (this.isRecording) {
            btn.textContent = '⏹️ 放開停止';
            btn.classList.add('recording');
        } else {
            btn.textContent = '🎤 按住錄音';
            btn.classList.remove('recording');
        }
    },
    
    // 處理錄音結果
    processRecordingResult(transcript) {
        if (!this.currentWord) return;
        
        const result = SpeechRecognition.comparePronunciation(
            transcript, 
            this.currentWord.word
        );
        
        // 記錄答案
        recordAnswer(this.currentWord.word, result.isCorrect);
        
        // 顯示結果
        const feedbackArea = document.getElementById('pronFeedbackArea');
        
        if (result.isCorrect) {
            this.correctCount++;
            this.score += 10;
            document.getElementById('pronScore').textContent = this.score;
            
            feedbackArea.innerHTML = `
                <div class="feedback-correct">
                    <div class="feedback-icon">🎉</div>
                    <div class="feedback-text">${result.feedback} 你說的是: "${transcript}"</div>
                </div>
            `;
            
            SoundEffects.playSuccess();
        } else {
            this.wrongCount++;
            
            feedbackArea.innerHTML = `
                <div class="feedback-wrong">
                    <div class="feedback-icon">😅</div>
                    <div class="feedback-text">${result.feedback} 你說的是: "${transcript}"</div>
                </div>
            `;
            
            SoundEffects.playError();
            
            // 朗讀正確答案
            setTimeout(() => {
                SpeechSynthesis.speakWord(this.currentWord.word);
            }, 1000);
        }
        
        // 延遲進入下一題
        setTimeout(() => this.nextQuestion(), 2500);
    },
    
    // 顯示拼音提示
    showPhonetic() {
        if (this.phoneticShown) return;
        
        this.phoneticShown = true;
        
        // 從單字數據獲取拼音，或使用簡單的生成邏輯
        const phonetic = this.currentWord.phonetic || this.generatePhonetic(this.currentWord.word);
        
        document.getElementById('phoneticText').textContent = phonetic;
        document.getElementById('phoneticHint').classList.remove('hidden');
    },
    
    // 簡單的拼音生成（實際應該從數據庫獲取）
    generatePhonetic(word) {
        // 這是一個簡單的實現，實際應該使用 KK 音標數據庫
        // 這裡返回一個模擬的格式
        return `/...${word.slice(0, 2)}.../`;
    },
    
    // 進入下一題
    nextQuestion() {
        if (this.questionCount >= GameConfig.questionsPerGame) {
            this.endGame();
        } else {
            this.loadQuestion();
            // 自動播放下一個單字
            setTimeout(() => this.playPronunciation(), 500);
        }
    },
    
    // 結束遊戲
    endGame() {
        showGameResult(this.correctCount, this.wrongCount);
    }
};

// ===== 單字題庫 =====
const WordBank = {
    units: [],
    currentUnit: null,
    loaded: false,
    
    // 初始化：嘗試加載JSON，失敗則使用內置數據
    async init() {
        if (this.loaded) return;
        
        try {
            console.log('正在載入題庫...');
            const response = await fetch('data/words.json');
            if (response.ok) {
                const data = await response.json();
                this.units = data.units || [];
                this.loaded = true;
                console.log('題庫已從JSON載入:', this.units.length, '個Unit');
                if (this.units.length > 0) {
                    console.log('第一個Unit:', this.units[0].name, '- 單字數:', this.units[0].words?.length || 0);
                }
                return;
            } else {
                console.log('JSON載入失敗，使用內置題庫');
            }
        } catch (e) {
            console.log('無法載入JSON，使用內置題庫', e);
        }
        
        // 內置題庫（後備）
        this.units = this.getDefaultUnits();
        this.loaded = true;
        console.log('使用內置題庫:', this.units.length, '個Unit');
    },
    
    // 內置題庫
    getDefaultUnits() {
        return [
            { id: 'p3-u1', name: '鮑小P3 下學期Unit 1', words: [] },
            { id: 'p3-u2', name: '鮑小P3 下學期Unit 2', words: [] },
            { id: 'p3-u3', name: '鮑小P3 下學期Unit 3', words: [] },
            { id: 'p3-u4', name: '鮑小P3 下學期Unit 4', words: [] },
            { id: 'p3-u5', name: '鮑小P3 下學期Unit 5', words: [] }
        ];
    },
    
    // 獲取所有Unit列表
    getUnits() {
        // 如果units為空，使用默認units
        if (!this.units || this.units.length === 0) {
            return this.getDefaultUnits();
        }
        return this.units;
    },
    
    // 設置當前Unit
    setUnit(unitId) {
        this.currentUnit = this.units.find(u => u.id === unitId);
        return this.currentUnit;
    },
    
    // 獲取當前Unit的單字
    getCurrentWords() {
        if (this.currentUnit) {
            return this.currentUnit.words || [];
        }
        return [];
    },
    
    // 獲取隨機單字
    getRandomWord(excludeWords = []) {
        let words = this.getCurrentWords();
        
        // 如果當前Unit無單字，用全部units既單字
        if (words.length === 0) {
            words = this.units.flatMap(u => u.words || []).filter(w => w.word);
        }
        
        const availableWords = words.filter(w => !excludeWords.includes(w.word));
        
        if (availableWords.length === 0) {
            return words[Math.floor(Math.random() * words.length)];
        }
        
        return availableWords[Math.floor(Math.random() * availableWords.length)];
    },
    
    // 獲取特定類別的單字
    getWordsByCategory(category) {
        const words = this.getCurrentWords();
        return words.filter(w => w.category === category);
    }
};

// ===== 全局函數 =====

// 開始聽寫遊戲
function startDictationGame() {
    DictationGame.start();
}

// 開始發音遊戲
function startPronunciationGame() {
    PronunciationGame.start();
}

// 播放當前單字
function playCurrentWord() {
    if (AppState.currentMode === 'dictation') {
        DictationGame.playCurrentWord();
    } else if (AppState.currentMode === 'pronunciation') {
        PronunciationGame.playPronunciation();
    }
}

// 提交答案
function submitAnswer() {
    if (AppState.currentMode === 'dictation') {
        DictationGame.submitAnswer();
    }
}

// 處理Enter鍵
function handleAnswerKeypress(event) {
    if (event.key === 'Enter') {
        submitAnswer();
    }
}

// 顯示提示
function showHint() {
    if (AppState.currentMode === 'dictation') {
        DictationGame.showHint();
    }
}

// 跳過
function skipWord() {
    if (AppState.currentMode === 'dictation') {
        DictationGame.skipWord();
    }
}

// 朗讀發音
function playPronunciation() {
    PronunciationGame.playPronunciation();
}

// 切換錄音
function toggleRecording() {
    PronunciationGame.toggleRecording();
}

// 顯示拼音
function showPhonetic() {
    PronunciationGame.showPhonetic();
}

// 重新開始遊戲
function restartGame() {
    if (AppState.currentMode === 'dictation') {
        DictationGame.start();
    } else if (AppState.currentMode === 'pronunciation') {
        PronunciationGame.start();
    }
}

/**
 * 小小英語樂園 - 主應用程序
 * 管理全局狀態、用戶切換、數據存儲
 */

// ===== 全局狀態 =====
const AppState = {
    currentUser: 'default',
    users: {},
    currentMode: null, // 'dictation' | 'pronunciation'
    gameState: null
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded');
    
    try {
        await WordBank.init();
    } catch(e) {
        console.error('WordBank error:', e);
    }
    
    try {
        loadUsers();
        loadCurrentUser();
        updateProgressDisplay();
    } catch(e) {
        console.error('Init error:', e);
    }
});


// ===== 用戶管理 =====
function loadUsers() {
    const savedUsers = localStorage.getItem('kidsEnglish_users');
    if (savedUsers) {
        AppState.users = JSON.parse(savedUsers);
    } else {
        // 創建默認用戶
        AppState.users = {
            default: {
                name: '小朋友',
                createdAt: new Date().toISOString(),
                progress: {
                    totalWordsLearned: 0,
                    totalPractice: 0,
                    correctCount: 0,
                    wrongCount: 0,
                    words: {} // { word: { correct: 0, wrong: 0 } }
                }
            }
        };
        saveUsers();
    }
}

function saveUsers() {
    localStorage.setItem('kidsEnglish_users', JSON.stringify(AppState.users));
}

function loadCurrentUser() {
    const savedUser = localStorage.getItem('kidsEnglish_currentUser');
    if (savedUser && AppState.users[savedUser]) {
        AppState.currentUser = savedUser;
    }
    updateUserDisplay();
}

function getCurrentUser() {
    return AppState.users[AppState.currentUser];
}

function updateUserDisplay() {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('userName').textContent = user.name;
    }
}

function showUserSelector() {
    const user = getCurrentUser();
    document.getElementById('newUserName').value = user ? user.name : '';
    document.getElementById('userSelectorModal').classList.remove('hidden');
}

function createUser() {
    const nameInput = document.getElementById('newUserName');
    const name = nameInput.value.trim() || '小朋友';
    
    // 更新當前用戶名稱
    const user = getCurrentUser();
    if (user) {
        user.name = name;
        saveUsers();
        updateUserDisplay();
    }
    
    closeModal('userSelectorModal');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ===== 進度管理 =====
function updateProgressDisplay() {
    const user = getCurrentUser();
    if (!user) return;
    
    const progress = user.progress;
    const totalAttempts = progress.correctCount + progress.wrongCount;
    const accuracy = totalAttempts > 0 
        ? Math.round((progress.correctCount / totalAttempts) * 100) 
        : 0;
    
    document.getElementById('totalWordsLearned').textContent = progress.totalWordsLearned;
    document.getElementById('accuracyRate').textContent = accuracy + '%';
    document.getElementById('totalPractice').textContent = progress.totalPractice;
}

function recordAnswer(word, isCorrect) {
    const user = getCurrentUser();
    if (!user) return;
    
    const progress = user.progress;
    
    // 初始化單字記錄
    if (!progress.words[word]) {
        progress.words[word] = { correct: 0, wrong: 0 };
    }
    
    // 更新單字記錄
    if (isCorrect) {
        progress.words[word].correct++;
        progress.correctCount++;
    } else {
        progress.words[word].wrong++;
        progress.wrongCount++;
    }
    
    // 更新總學習單字數
    progress.totalWordsLearned = Object.keys(progress.words).length;
    progress.totalPractice++;
    
    saveUsers();
    updateProgressDisplay();
}

// ===== 導出數據 =====
function exportData() {
    const user = getCurrentUser();
    if (!user) return;
    
    const data = {
        userName: user.name,
        exportDate: new Date().toISOString(),
        progress: user.progress,
        words: user.progress.words
    };
    
    // 轉換為CSV格式
    let csv = '單字,正確次數,錯誤次數,正確率\n';
    for (const [word, stats] of Object.entries(user.progress.words)) {
        const total = stats.correct + stats.wrong;
        const rate = total > 0 ? Math.round((stats.correct / total) * 100) + '%' : '0%';
        csv += `${word},${stats.correct},${stats.wrong},${rate}\n`;
    }
    
    // 下載CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `英語學習報告_${user.name}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

// ===== 背景音樂 =====
let bgMusicEnabled = false;
const bgMusic = new Audio();

function initBackgroundMusic() {
    // 可以使用免費的音樂或留空
    // bgMusic.src = 'path/to/music.mp3';
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
}

function toggleBackgroundMusic() {
    bgMusicEnabled = !bgMusicEnabled;
    
    if (bgMusicEnabled) {
        // 嘗試播放（需要用戶交互）
        bgMusic.play().catch(() => {
            alert('請點擊頁面後再嘗試播放音樂');
            bgMusicEnabled = false;
        });
    } else {
        bgMusic.pause();
    }
}

// ===== 屏幕導航 =====
function showScreen(screenId) {
    // 隱藏所有主要畫面
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('unitSelector').classList.add('hidden');
    document.getElementById('dictationGame').classList.add('hidden');
    document.getElementById('pronunciationGame').classList.add('hidden');
    document.getElementById('resultScreen').classList.add('hidden');
    
    // 顯示目標畫面
    document.getElementById(screenId).classList.remove('hidden');
}

function backToMenu() {
    showScreen('mainMenu');
    AppState.currentMode = null;
    AppState.gameState = null;
    updateProgressDisplay();
}

// ===== 遊戲結果 =====
function showGameResult(correct, wrong) {
    const total = correct + wrong;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('wrongCount').textContent = wrong;
    document.getElementById('resultAccuracy').textContent = accuracy + '%';
    
    // 根據結果顯示不同表情和訊息
    const resultEmoji = document.getElementById('resultEmoji');
    const resultMessage = document.getElementById('resultMessage');
    
    if (accuracy >= 90) {
        resultEmoji.textContent = '🏆';
        resultMessage.textContent = '太厲害了！你是英語小天才！';
    } else if (accuracy >= 70) {
        resultEmoji.textContent = '🌟';
        resultMessage.textContent = '做得好棒！繼續加油！';
    } else if (accuracy >= 50) {
        resultEmoji.textContent = '💪';
        resultMessage.textContent = '不錯喔！再試一次會更好！';
    } else {
        resultEmoji.textContent = '😊';
        resultMessage.textContent = '沒關係！我們一起學更多！';
    }
    
    showScreen('resultScreen');
    
    // 播放結果音效
    playResultSound(accuracy);
}

function playResultSound(accuracy) {
    // 這裡可以添加音效
    // 可以使用 Web Audio API 創建簡單的音效
}

// ===== 錯誤處理 =====
window.addEventListener('error', (e) => {
    console.error('錯誤:', e.message);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未處理的Promise錯誤:', e.reason);
});

// ===== Unit 選擇 =====
let selectedUnitId = null;
let currentGameMode = null; // 'dictation' | 'pronunciation'

function showUnitSelector(mode) {
    console.log('showUnitSelector called, mode:', mode);
    console.log('WordBank loaded:', WordBank.loaded);
    console.log('WordBank units:', WordBank.getUnits());
    
    currentGameMode = mode;
    selectedUnitId = null;
    
    // 設置標題
    const title = mode === 'dictation' ? '✍️ 選擇Unit - 聽寫模式' : '🎤 選擇Unit - 發音模式';
    document.getElementById('modeTitle').textContent = title;
    
    // 渲染Unit卡片
    const unitGrid = document.getElementById('unitGrid');
    const units = WordBank.getUnits();
    
    unitGrid.innerHTML = units.map((unit, index) => `
        <div class="unit-card" onclick="selectUnit('${unit.id}')" data-unit-id="${unit.id}">
            <div class="unit-card-icon">📚</div>
            <div class="unit-card-name">${unit.name}</div>
            <div class="unit-card-count">${unit.words?.length || 0} 個單字</div>
        </div>
    `).join('');
    
    // 重置按鈕
    updateStartButton();
    
    showScreen('unitSelector');
}

function selectUnit(unitId) {
    // 取消之前的選擇
    document.querySelectorAll('.unit-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // 選中新的unit
    selectedUnitId = unitId;
    document.querySelector(`[data-unit-id="${unitId}"]`).classList.add('selected');
    
    updateStartButton();
}

function updateStartButton() {
    const btn = document.getElementById('startGameBtn');
    const info = document.getElementById('selectedInfo');
    
    if (selectedUnitId) {
        const unit = WordBank.setUnit(selectedUnitId);
        btn.disabled = false;
        info.textContent = `已選擇: ${unit.name}`;
    } else {
        btn.disabled = true;
        info.textContent = '請選擇一個Unit';
    }
}

function startSelectedGame() {
    if (!selectedUnitId) return;
    
    if (currentGameMode === 'dictation') {
        DictationGame.start();
    } else if (currentGameMode === 'pronunciation') {
        PronunciationGame.start();
    }
}
