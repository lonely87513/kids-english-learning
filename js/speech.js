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
