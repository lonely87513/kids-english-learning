/**
 * 小小英語樂園 - 單字遊戲邏輯
 * 處理聽寫模式和發音模式的遊戲流程
 */

// ===== 遊戲配置 =====
const GameConfig = {
    questionsPerGame: 0, // 0 = use all words in the unit
    hintPenalty: true, // 使用提示是否扣分
    showAnswerOnWrong: true, // 錯誤時是否顯示正確答案
    
    // 答對既Emoji
    correctEmojis: ['💩', '🤩', '😎', '🤑', '🎉', '🥳', '🤗', '😻'],
    
    // 答錯既Emoji
    wrongEmojis: ['🤮', '😈', '👿', '💀', '🙈', '😱', '😵', '🤢'],
    
    // 隨機獲取答對Emoji
    getCorrectEmoji() {
        return this.correctEmojis[Math.floor(Math.random() * this.correctEmojis.length)];
    },
    
    // 隨機獲取答錯Emoji
    getWrongEmoji() {
        return this.wrongEmojis[Math.floor(Math.random() * this.wrongEmojis.length)];
    },
    
    // 答對既訊息
    correctMessages: [
        '💩 答對！送你大便！',
        '🤩 勁呀！食咩大架？',
        '😎 nice嘢！',
        '🤑 咁難你都識？',
        '🎉 太強啦！係咪第一名？',
        '🥳 果然係最靚既仔！',
        '🤗 你勁到飛起！',
        '😻 叻曬你！',
        '🦄 神童現世！',
        '🌟 你係MVP！',
        '💪 勁到痺！',
        '🏆 冠軍就係你！',
        '✨ 閃到你眼都花！',
        '🥇 金牌有你份！',
        '🤩 完美過跳水選手！'
    ],
    
    // 隨機獲取答對訊息
    getCorrectMessage() {
        return this.correctMessages[Math.floor(Math.random() * this.correctMessages.length)];
    }
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
    allWords: [],
    answers: [], // 記錄每題答案
    
    // 開始遊戲
    start() {
        this.reset();
        AppState.currentMode = 'dictation';
        
        // 獲取該Unit的全部生字並打亂
        const allWords = WordBank.getCurrentWords();
        // Fisher-Yates shuffle
        for (let i = allWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
        }
        this.allWords = allWords;
        
        // 設置題目數量為全部生字
        GameConfig.questionsPerGame = allWords.length;
        
        this.loadQuestion();
        showScreen('dictationGame');
        
        // 更新題目計數
        document.getElementById('totalQuestions').textContent = GameConfig.questionsPerGame;
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
        this.allWords = [];
        this.answers = [];
        
        // 重置顯示
        document.getElementById('score').textContent = '0';
        document.getElementById('currentQuestion').textContent = '1';
        document.getElementById('answerInput').value = '';
        document.getElementById('feedbackArea').innerHTML = '';
    },
    
    // 加載題目
    loadQuestion() {
        // 從已打亂既列表中獲取單字
        if (this.currentWordIndex >= this.allWords.length) {
            this.endGame();
            return;
        }
        
        this.currentWord = this.allWords[this.currentWordIndex];
        this.usedWords.push(this.currentWord.word);
        this.currentWordIndex++;
        
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
        
        // 記錄答案
        this.answers.push({
            word: this.currentWord.word,
            meaning: this.currentWord.meaning,
            correct: true
        });
        
        document.getElementById('score').textContent = this.score;
        
        // 顯示正確反饋
        const feedbackArea = document.getElementById('feedbackArea');
        feedbackArea.innerHTML = `
            <div class="feedback-correct">
                <div class="feedback-icon">${GameConfig.getCorrectEmoji()}</div>
                <div class="feedback-text">${GameConfig.getCorrectMessage()}</div>
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
        
        // 記錄答案
        this.answers.push({
            word: this.currentWord.word,
            meaning: this.currentWord.meaning,
            correct: false
        });
        
        // 播放錯誤音效
        SoundEffects.playError();
        
        // 顯示錯誤反饋
        const feedbackArea = document.getElementById('feedbackArea');
        let feedbackHTML = `
            <div class="feedback-wrong">
                <div class="feedback-icon">${GameConfig.getWrongEmoji()}</div>
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
        
        // 顯示拼音
        const phonetic = this.currentWord.phonetic || this.currentWord.word[0] + '...';
        
        const feedbackArea = document.getElementById('feedbackArea');
        feedbackArea.innerHTML = `
            <div class="feedback-wrong">
                <div class="feedback-icon">💡</div>
                <div class="feedback-text">拼音: <strong>${phonetic}</strong></div>
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
        
        // 記錄跳過既答案（當錯誤）
        this.answers.push({
            word: this.currentWord.word,
            meaning: this.currentWord.meaning,
            correct: false,
            skipped: true
        });
        
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
        showGameResult(this.correctCount, this.wrongCount, this.answers);
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
    allWords: [],
    answers: [], // 記錄每題答案
    
    // 開始遊戲
    start() {
        this.reset();
        AppState.currentMode = 'pronunciation';
        
        // 獲取該Unit的全部生字並打亂
        const allWords = WordBank.getCurrentWords();
        // Fisher-Yates shuffle
        for (let i = allWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
        }
        this.allWords = allWords;
        
        // 設置題目數量為全部生字
        GameConfig.questionsPerGame = allWords.length;
        
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
        this.allWords = [];
        this.answers = [];
        
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
        // 從已打亂既列表中獲取單字
        if (this.currentWordIndex >= this.allWords.length) {
            this.endGame();
            return;
        }
        
        this.currentWord = this.allWords[this.currentWordIndex];
        this.usedWords.push(this.currentWord.word);
        this.currentWordIndex++;
        
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
        // 檢查是否支持
        if (!SpeechRecognition.isSupported()) {
            alert('iOS Chrome不支持語音識別，請使用Safari或電腦瀏覽器');
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
            
            // 更具體既錯誤提示
            if (err.message && err.message.includes('permission')) {
                alert('需要麥克風權限！\n\n請喺瀏覽器設置度允許訪問麥克風，然後再試一次。');
            } else if (err.message && err.message.includes('no-speech')) {
                alert('聽唔到聲音，請再試一次！');
            } else {
                alert('錄音失敗，請確保已授予麥克風權限，並使用HTTPS連接');
            }
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
        
        // 記錄呢題既答案
        this.answers.push({
            word: this.currentWord.word,
            meaning: this.currentWord.meaning,
            correct: result.isCorrect
        });
        
        // 顯示結果
        const feedbackArea = document.getElementById('pronFeedbackArea');
        
        if (result.isCorrect) {
            this.correctCount++;
            this.score += 10;
            document.getElementById('pronScore').textContent = this.score;
            
            feedbackArea.innerHTML = `
                <div class="feedback-correct">
                    <div class="feedback-icon">${GameConfig.getCorrectEmoji()}</div>
                    <div class="feedback-text">${result.feedback} 你說的是: "${transcript}"</div>
                </div>
            `;
            
            SoundEffects.playSuccess();
        } else {
            this.wrongCount++;
            
            feedbackArea.innerHTML = `
                <div class="feedback-wrong">
                    <div class="feedback-icon">${GameConfig.getWrongEmoji()}</div>
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
        
        // 顯示中文意思
        const meaning = this.currentWord.meaning || '無';
        
        document.getElementById('phoneticText').textContent = meaning;
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
        showGameResult(this.correctCount, this.wrongCount, this.answers);
    }
};

// ===== 句子讀默遊戲 =====
const SentenceGame = {
    currentUnit: 1,
    repeatCount: 3,
    pauseSeconds: 3,
    sentences: [],
    currentSentenceIndex: 0,
    currentRepeat: 0,
    isRecording: false,
    isPaused: false,
    
    // 句子題庫（之後會從JSON load）
    sentenceBanks: {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: []
    },
    
    // 初始化
    init(unit, repeat, pause, speed) {
        this.currentUnit = unit;
        this.repeatCount = parseInt(repeat);
        this.pauseSeconds = parseInt(pause);
        this.speed = parseFloat(speed) || 0.6;
        this.currentSentenceIndex = 0;
        this.currentRepeat = 0;
        this.isRecording = false;
        this.isPaused = false;
        
        // 呢度load句子題庫（暫時用範例，等Nathan提供真正題庫）
        this.loadSentences();
    },
    
    // Load句子（之後會改為從JSON讀取）
    loadSentences() {
        // 範例題庫 - 之後會替換為真正既文章
        const sampleSentences = [
            { text: "Hello, how are you?", meaning: "你好，你好嗎？" },
            { text: "I am a student.", meaning: "我是一個學生。" },
            { text: "She likes to read books.", meaning: "她喜歡看書。" },
            { text: "They are playing in the park.", meaning: "他們在公園玩耍。" },
            { text: "What time is it now?", meaning: "現在幾點？" },
            { text: "I want to eat some ice cream.", meaning: "我想食雪糕。" },
            { text: "The cat is sleeping on the bed.", meaning: "隻貓係張床上面訓覺。" },
            { text: "Can you help me, please?", meaning: "請問你可以幫我吗？" },
            { text: "Today is a sunny day.", meaning: "今日係晴天。" },
            { text: "I have three apples.", meaning: "我有三個蘋果。" }
        ];
        
        this.sentences = sampleSentences;
    },
    
    // 開始遊戲
    start() {
        AppState.currentMode = 'sentence';
        this.updateDisplay();
        showScreen('sentenceGame');
        
        // 倒數5秒 - 先確保元素存在
        const sentText = document.getElementById('sentText');
        if (sentText) {
            this.showCountdown(5);
        }
    },
    
    // 顯示倒數
    showCountdown(count) {
        const sentText = document.getElementById('sentText');
        
        if (count > 0) {
            sentText.textContent = count.toString();
            sentText.style.display = 'block';
            sentText.style.fontSize = '4rem';
            sentText.style.fontWeight = 'bold';
            setTimeout(() => this.showCountdown(count - 1), 1000);
        } else {
            sentText.textContent = '開始！';
            sentText.style.display = 'block';
            sentText.style.fontSize = '4rem';
            sentText.style.fontWeight = 'bold';
            setTimeout(() => {
                sentText.style.display = 'none';
                sentText.style.fontSize = '';
                sentText.style.fontWeight = '';
                this.playCurrentSentence();
            }, 800);
        }
    },
    
    // 播放當前句子
    playCurrentSentence() {
        if (this.currentSentenceIndex >= this.sentences.length) {
            this.endGame();
            return;
        }
        
        const sentence = this.sentences[this.currentSentenceIndex];
        
        // 朗讀句子（包括標點符號停頓）
        SpeechSynthesis.speakWithPunctuation(sentence.text, this.speed).then(() => {
            // 朗讀完成後，等 pauseSeconds 秒再讀多次
            if (this.currentRepeat < this.repeatCount - 1) {
                this.currentRepeat++;
                this.updateDisplay();
                setTimeout(() => this.playCurrentSentence(), this.pauseSeconds * 1000);
            } else {
                // 完成呢句既所有次數，去下一句
                this.currentRepeat = 0;
                this.currentSentenceIndex++;
                
                if (this.currentSentenceIndex >= this.sentences.length) {
                    this.endGame();
                } else {
                    // 自動播放下一句
                    setTimeout(() => this.playCurrentSentence(), 1000);
                }
            }
        });
        
        // 更新顯示
        document.getElementById('sentText').textContent = sentence.text;
        this.updateDisplay();
    },
    
    // 跳到下一題（用戶自己撳）
    nextSentence() {
        window.speechSynthesis.cancel();
        
        this.currentRepeat++;
        
        if (this.currentRepeat >= this.repeatCount) {
            this.currentRepeat = 0;
            this.currentSentenceIndex++;
        }
        
        if (this.currentSentenceIndex >= this.sentences.length) {
            this.endGame();
        } else {
            const sentence = this.sentences[this.currentSentenceIndex];
            document.getElementById('sentText').textContent = sentence.text;
            this.updateDisplay();
            document.getElementById('sentFeedbackArea').innerHTML = '';
        }
    },
    
    // 朗讀完或暫停後開始錄音
    startRecordingAfterPause() {
        if (this.isPaused) return;
        
        this.isRecording = true;
        document.getElementById('sentRecordBtn').classList.add('recording');
        
        SpeechRecognition.start({
            continuous: true,
            interimResults: false
        });
    },
    
    // 處理錄音結果
    handleRecording(transcript) {
        const sentence = this.sentences[this.currentSentenceIndex];
        const target = sentence.text.toLowerCase().replace(/[.,?!]/g, '').trim();
        const spoken = transcript.toLowerCase().replace(/[.,?!]/g, '').trim();
        
        // 簡單既比較（可以改進）
        const isCorrect = this.calculateSimilarity(target, spoken) >= 0.7;
        
        const feedbackArea = document.getElementById('sentFeedbackArea');
        
        if (isCorrect) {
            this.currentRepeat++;
            
            feedbackArea.innerHTML = `
                <div class="feedback-correct">
                    <div class="feedback-icon">${GameConfig.getCorrectEmoji()}</div>
                    <div class="feedback-text">${GameConfig.getCorrectMessage()} 你讀既: "${transcript}"</div>
                </div>
            `;
            
            SoundEffects.playSuccess();
            
            if (this.currentRepeat >= this.repeatCount) {
                // 完成呢句，去下一句
                this.currentRepeat = 0;
                this.currentSentenceIndex++;
                
                if (this.currentSentenceIndex >= this.sentences.length) {
                    setTimeout(() => this.endGame(), 1500);
                } else {
                    setTimeout(() => this.playCurrentSentence(), 1500);
                }
            } else {
                // 繼續讀多次
                setTimeout(() => this.playCurrentSentence(), this.pauseSeconds * 1000);
            }
        } else {
            feedbackArea.innerHTML = `
                <div class="feedback-wrong">
                    <div class="feedback-icon">${GameConfig.getWrongEmoji()}</div>
                    <div class="feedback-text">再試一次！你讀既: "${transcript}"</div>
                </div>
            `;
            
            SoundEffects.playError();
            
            // 繼續讀多次
            setTimeout(() => this.playCurrentSentence(), this.pauseSeconds * 1000);
        }
        
        this.updateDisplay();
    },
    
    // 計算相似度
    calculateSimilarity(str1, str2) {
        const words1 = str1.split(' ');
        const words2 = str2.split(' ');
        
        let match = 0;
        words1.forEach(w => {
            if (words2.includes(w)) match++;
        });
        
        return match / Math.max(words1.length, words2.length);
    },
    
    // 更新顯示
    updateDisplay() {
        document.getElementById('sentCurrent').textContent = this.currentSentenceIndex + 1;
        document.getElementById('sentTotal').textContent = this.sentences.length;
        document.getElementById('sentRepeat').textContent = this.currentRepeat + 1;
        document.getElementById('sentRepeatTotal').textContent = this.repeatCount;
        
        // 更新進度條
        const progress = ((this.currentSentenceIndex * this.repeatCount + this.currentRepeat) / 
                        (this.sentences.length * this.repeatCount)) * 100;
        document.getElementById('sentProgressBar').style.width = progress + '%';
    },
    
    // 結束遊戲
    endGame() {
        showGameResult(0, 0, []);
    },
    
    // 重置
    reset() {
        this.currentSentenceIndex = 0;
        this.currentRepeat = 0;
        this.isRecording = false;
        this.isPaused = false;
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
            const response = await fetch('data/words.json');
            if (response.ok) {
                const data = await response.json();
                this.units = data.units || [];
                this.loaded = true;
                console.log('題庫已從JSON載入:', this.units.length, '個Unit');
                return;
            }
        } catch (e) {
            console.log('無法載入JSON，使用內置題庫');
        }
        
        // 內置題庫（後備）
        this.units = this.getDefaultUnits();
        this.loaded = true;
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

// 下一題
function nextQuestion() {
    if (AppState.currentMode === 'dictation') {
        DictationGame.nextQuestion();
    } else if (AppState.currentMode === 'pronunciation') {
        PronunciationGame.nextQuestion();
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
