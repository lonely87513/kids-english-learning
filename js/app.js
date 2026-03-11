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

// ===== 語音功能 =====
function speakText(text, callback) {
    if (typeof SpeechSynthesis !== 'undefined' && SpeechSynthesis.speak) {
        SpeechSynthesis.speak(text).then(() => {
            if (callback) callback();
        }).catch(() => {
            if (callback) callback();
        });
    } else if (callback) {
        callback();
    }
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', async () => {
    initTheme(); // 初始化主題
    await WordBank.init(); // 載入題庫
    loadUsers();
    loadCurrentUser();
    updateProgressDisplay();
    initBackgroundMusic();
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

// 重置學習進度
function resetProgress() {
    if (!confirm('確定要重置所有學習進度嗎？呢個操作唔可以復原！')) {
        return;
    }
    
    const user = getCurrentUser();
    if (user) {
        user.progress = {
            totalWordsLearned: 0,
            totalPractice: 0,
            correctCount: 0,
            wrongCount: 0,
            words: {}
        };
        saveUsers();
        updateProgressDisplay();
        alert('學習進度已重置！');
    }
}

// 顯示所有學習記錄
function showAllRecords() {
    const user = getCurrentUser();
    if (!user || !user.progress.words) {
        alert('暫時未有學習記錄');
        return;
    }
    
    const words = user.progress.words;
    const recordsList = document.getElementById('recordsList');
    
    if (Object.keys(words).length === 0) {
        recordsList.innerHTML = '<p style="text-align:center;color:#999;">暫時未有學習記錄</p>';
    } else {
        let html = '';
        // 轉為array方便sort
        const wordArray = Object.entries(words).map(([word, stats]) => ({
            word,
            ...stats
        }));
        
        // 按正確率排序（低到高）
        wordArray.sort((a, b) => {
            const rateA = a.correct / (a.correct + a.wrong) || 0;
            const rateB = b.correct / (b.correct + b.wrong) || 0;
            return rateA - rateB;
        });
        
        wordArray.forEach(item => {
            const total = item.correct + item.wrong;
            const rate = total > 0 ? Math.round((item.correct / total) * 100) : 0;
            const statusColor = rate >= 80 ? '#4CAF50' : rate >= 50 ? '#FF9800' : '#f44336';
            html += `
                <div class="records-item">
                    <div>
                        <span class="records-word">${item.word}</span>
                    </div>
                    <div class="records-stats" style="color:${statusColor}">
                        ✅${item.correct} ❌${item.wrong} (${rate}%)
                    </div>
                </div>
            `;
        });
        recordsList.innerHTML = html;
    }
    
    document.getElementById('recordsModal').classList.remove('hidden');
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

// ===== Dark Mode =====
function toggleDarkMode() {
    const html = document.documentElement;
    const btn = document.getElementById('darkModeBtn');
    
    if (html.getAttribute('data-theme') === 'dark') {
        html.setAttribute('data-theme', 'light');
        btn.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        btn.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('darkModeBtn').textContent = '☀️';
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
    document.getElementById('sentenceSettings').classList.add('hidden');
    document.getElementById('sentenceGame').classList.add('hidden');
    document.getElementById('verbTableSelector').classList.add('hidden');
    document.getElementById('verbTableDisplay').classList.add('hidden');
    document.getElementById('verbQuiz').classList.add('hidden');
    document.getElementById('verbQuizResult').classList.add('hidden');
    
    // 顯示目標畫面
    document.getElementById(screenId).classList.remove('hidden');
}

// 隱藏所有畫面
function hideAllScreens() {
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('unitSelector').classList.add('hidden');
    document.getElementById('dictationGame').classList.add('hidden');
    document.getElementById('pronunciationGame').classList.add('hidden');
    document.getElementById('resultScreen').classList.add('hidden');
    document.getElementById('sentenceSettings').classList.add('hidden');
    document.getElementById('sentenceGame').classList.add('hidden');
    document.getElementById('verbTableSelector').classList.add('hidden');
    document.getElementById('verbTableDisplay').classList.add('hidden');
    document.getElementById('verbQuiz').classList.add('hidden');
    document.getElementById('verbQuizResult').classList.add('hidden');
}

function backToMenu() {
    // Cleanup sentence game
    window.speechSynthesis.cancel();
    if (typeof SentenceGame !== 'undefined') {
        const sentText = document.getElementById('sentText');
        if (sentText) {
            sentText.textContent = '';
            sentText.classList.add('hidden');
            sentText.style.display = '';
            sentText.style.fontSize = '';
            sentText.style.fontWeight = '';
        }
    }
    
    showScreen('mainMenu');
    AppState.currentMode = null;
    AppState.gameState = null;
    updateProgressDisplay();
}

// ===== 遊戲結果 =====
function showGameResult(correct, wrong, wordList = []) {
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
    
    // 顯示詳細學習報告
    const reportList = document.getElementById('reportList');
    if (wordList.length > 0) {
        let html = '';
        wordList.forEach(item => {
            const status = item.correct ? '✅' : '❌';
            const statusClass = item.correct ? 'correct' : 'wrong';
            html += `
                <div class="report-item">
                    <div>
                        <span class="report-word">${item.word}</span>
                        <span class="report-meaning">${item.meaning || ''}</span>
                    </div>
                    <span class="report-status ${statusClass}">${status}</span>
                </div>
            `;
        });
        reportList.innerHTML = html;
    } else {
        reportList.innerHTML = '<p style="text-align:center;color:#999;">無詳細記錄</p>';
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

// ===== 句子讀默 =====

// 顯示句子設定畫面
function showSentenceSettings() {
    showScreen('sentenceSettings');
}

// 開始句子遊戲
function startSentenceGame() {
    const unit = document.getElementById('sentenceUnitSelect').value;
    const repeat = document.getElementById('repeatCount').value;
    const pause = document.getElementById('pauseSeconds').value;
    const speed = document.getElementById('sentenceSpeed').value;
    const random = document.getElementById('sentenceRandom').checked;
    const continuous = document.getElementById('sentenceContinuous').checked;
    
    SentenceGame.init(unit, repeat, pause, speed, random, continuous);
    SentenceGame.start();
}

// 播放當前句子
function playCurrentSentence() {
    // Disable button during reading
    const btn = document.getElementById('playSentBtn');
    if (btn) btn.disabled = true;
    
    SentenceGame.playCurrentSentence(true);
}

// 切換錄音（句子模式）
function toggleSentenceRecording() {
    if (SentenceGame.isRecording) {
        SpeechRecognition.stop();
        SentenceGame.isRecording = false;
        document.getElementById('sentRecordBtn').classList.remove('recording');
    } else {
        // 開始錄音
        SentenceGame.isRecording = true;
        document.getElementById('sentRecordBtn').classList.add('recording');
        
        SpeechRecognition.start({
            onResult: (transcript) => {
                SentenceGame.handleRecording(transcript);
                SentenceGame.isRecording = false;
                document.getElementById('sentRecordBtn').classList.remove('recording');
            }
        });
    }
}

// 退出句子遊戲
function exitSentenceGame() {
    // 先停止語音（多次確保停止）
    window.speechSynthesis.cancel();
    setTimeout(() => window.speechSynthesis.cancel(), 100);
    
    // 立即停止所有進行中的野
    if (typeof SentenceGame !== 'undefined') {
        SentenceGame.isExited = true;
        SentenceGame.hideReadingAnimation();
    }
    
    SpeechRecognition.stop();
    SentenceGame.reset();
    
    // Reset sentence text display
    const sentText = document.getElementById('sentText');
    if (sentText) {
        sentText.textContent = '';
        sentText.classList.add('hidden');
        sentText.style.display = '';
        sentText.style.fontSize = '';
        sentText.style.fontWeight = '';
    }
    
    backToMenu();
}

// 下一題（句子模式）
function nextSentence() {
    if (SentenceGame.isExited) return;
    SentenceGame.nextSentence();
}

// 防止滑動觸發click既問題
let touchStartY = 0;
let touchEndY = 0;
let lastTouchTime = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.changedTouches[0].screenY;
    lastTouchTime = Date.now();
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    // 手指郁動緊，記錄新既位置
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', function(e) {
    touchEndY = e.changedTouches[0].screenY;
}, { passive: true });

// 判斷係咪swipe（滑動>50px）
function isSwipe() {
    const diff = Math.abs(touchEndY - touchStartY);
    return diff > 50;
}

// 改寫game card既click handler
function handleGameCardClick(callback) {
    // 如果手指郁動超過50px，就當係swipe，唔觸發click
    if (isSwipe()) {
        // Reset for next time
        touchStartY = 0;
        touchEndY = 0;
        return; 
    }
    
    // 正常click
    touchStartY = 0;
    touchEndY = 0;
    callback();
}

// 顯示/隱藏句子
function toggleSentenceText() {
    const sentText = document.getElementById('sentText');
    const showBtn = document.getElementById('showSentBtn');
    
    if (sentText.classList.contains('hidden')) {
        sentText.classList.remove('hidden');
        showBtn.textContent = '🙈 隱藏句子';
    } else {
        sentText.classList.add('hidden');
        showBtn.textContent = '👁️ 顯示句子';
    }
}

// 重新開始句子遊戲（回到第一句）
function restartSentenceGame() {
    window.speechSynthesis.cancel();
    SentenceGame.currentSentenceIndex = 0;
    SentenceGame.currentRepeat = 0;
    SentenceGame.updateDisplay();
    document.getElementById('sentFeedbackArea').innerHTML = '';
    // 顯示第一句但唔自動播放
    if (SentenceGame.sentences.length > 0) {
        document.getElementById('sentText').textContent = SentenceGame.sentences[0].text;
    }
}

// ===== 動詞表功能 (新版) =====
let VerbTable = {
    currentTable: null,
    verbList: [],
    quizIndex: 0,
    quizScore: 0,
    quizVerbs: [],
    quizResults: [] // 記錄每次答題結果
};

// 顯示動詞表選擇畫面
function showVerbTableSelector() {
    hideAllScreens();
    document.getElementById('verbTableSelector').classList.remove('hidden');
    
    const grid = document.getElementById('verbTableGrid');
    grid.innerHTML = '';
    
    // Wait for WordBank to load if not ready
    if (!WordBank.data || !WordBank.data.verbTables) {
        console.log('Waiting for WordBank to load...');
        grid.innerHTML = '<p>載入中... 請稍候</p>';
        
        // Wait for WordBank to finish loading
        const checkAndShow = () => {
            if (WordBank.data && WordBank.data.verbTables) {
                showVerbTableSelector(); // Recursively call to show the tables
            } else {
                setTimeout(checkAndShow, 100);
            }
        };
        setTimeout(checkAndShow, 100);
        return;
    }
    
    const verbTables = WordBank.data.verbTables || [];
    
    verbTables.forEach((table, index) => {
        const card = document.createElement('div');
        card.className = 'unit-card';
        card.onclick = () => showVerbTable(table.id);
        card.innerHTML = `
            <div class="unit-icon">📋</div>
            <h3>${table.name}</h3>
            <p>${table.verbs.length} 個動詞</p>
        `;
        grid.appendChild(card);
    });
}

// 顯示動詞表內容
function showVerbTable(tableId) {
    // Wait for WordBank to load if not ready
    if (!WordBank.data || !WordBank.data.verbTables) {
        alert('題庫載入中，請稍後再試！');
        
        // Try again after a short delay
        setTimeout(() => showVerbTable(tableId), 500);
        return;
    }
    
    const table = (WordBank.data.verbTables || []).find(t => t.id === tableId);
    if (!table) {
        alert('找不到動詞表！');
        return;
    }
    
    VerbTable.currentTable = table;
    VerbTable.verbList = table.verbs;
    
    document.getElementById('verbTableTitle').textContent = `📋 ${table.name}`;
    
    const tbody = document.getElementById('verbTableBody');
    tbody.innerHTML = '';
    
    table.verbs.forEach((verb) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${verb.present}</td>
            <td>${verb.presentContinuous}</td>
            <td>${verb.past}</td>
        `;
        tbody.appendChild(row);
    });
    
    hideAllScreens();
    document.getElementById('verbTableDisplay').classList.remove('hidden');
}

// 開始動詞測驗
function startVerbQuiz() {
    console.log('Starting verb quiz...');
    console.log('VerbTable.verbList:', VerbTable.verbList.length);
    console.log('WordBank.data:', WordBank.data);
    
    if (VerbTable.verbList.length === 0) {
        // Try to get from WordBank.data
        if (WordBank.data && WordBank.data.verbTables) {
            const currentTableId = VerbTable.currentTable ? VerbTable.currentTable.id : null;
            if (currentTableId) {
                const table = WordBank.data.verbTables.find(t => t.id === currentTableId);
                if (table) {
                    VerbTable.verbList = table.verbs;
                }
            }
        }
        
        if (VerbTable.verbList.length === 0) {
            alert('請先選擇一個動詞表！');
            return;
        }
    }
    
    // 隨機打亂動詞順序
    VerbTable.quizVerbs = [...VerbTable.verbList].sort(() => Math.random() - 0.5);
    // 限制最多10題
    if (VerbTable.quizVerbs.length > 10) {
        VerbTable.quizVerbs = VerbTable.quizVerbs.slice(0, 10);
    }
    VerbTable.quizIndex = 0;
    VerbTable.quizScore = 0;
    VerbTable.quizResults = [];
    
    document.getElementById('verbQuizTotal').textContent = VerbTable.quizVerbs.length;
    showVerbQuizQuestion();
    
    hideAllScreens();
    document.getElementById('verbQuiz').classList.remove('hidden');
}

// 顯示測驗題目
function showVerbQuizQuestion() {
    if (VerbTable.quizIndex >= VerbTable.quizVerbs.length) {
        showVerbQuizResult();
        return;
    }
    
    const verb = VerbTable.quizVerbs[VerbTable.quizIndex];
    document.getElementById('verbQuizCurrent').textContent = VerbTable.quizIndex + 1;
    document.getElementById('verbQuizScore').textContent = VerbTable.quizScore;
    document.getElementById('quizMeaning').textContent = `意思: ${verb.meaning}`;
    document.getElementById('quizBase').textContent = verb.base;
    document.getElementById('verbPresentInput').value = '';
    document.getElementById('verbPresentContInput').value = '';
    document.getElementById('verbPastInput').value = '';
    document.getElementById('verbQuizFeedback').innerHTML = '';
    document.getElementById('verbPresentInput').focus();
}

// 播放當前動詞的現在式發音
function playCurrentVerb() {
    const verb = VerbTable.quizVerbs[VerbTable.quizIndex];
    if (!verb) return;
    
    // 播放現在式
    speakText(verb.base, () => {
        // 然後可以選擇是否繼續播放其他時式
    });
}

// 提交答案
function submitVerbQuizAnswer() {
    console.log('Submit button clicked');
    
    const verb = VerbTable.quizVerbs[VerbTable.quizIndex];
    if (!verb) {
        console.error('No verb found');
        return;
    }
    
    const presentInput = document.getElementById('verbPresentInput').value.trim().toLowerCase();
    const presentContInput = document.getElementById('verbPresentContInput').value.trim().toLowerCase();
    const pastInput = document.getElementById('verbPastInput').value.trim().toLowerCase();
    
    const correctPresent = (verb.present || '-').toLowerCase();
    const correctPresentCont = (verb.presentContinuous || '-').toLowerCase();
    const correctPast = (verb.past || '-').toLowerCase();
    
    // 檢查每個答案（支援多種寫法）
    const presentCorrect = normalizeAnswer(presentInput) === normalizeAnswer(correctPresent);
    const presentContCorrect = normalizeAnswer(presentContInput) === normalizeAnswer(correctPresentCont);
    const pastCorrect = normalizeAnswer(pastInput) === normalizeAnswer(correctPast);
    
    const correctCount = (presentCorrect ? 1 : 0) + (presentContCorrect ? 1 : 0) + (pastCorrect ? 1 : 0);
    
    // 記錄結果
    const result = {
        verb: verb.base,
        meaning: verb.meaning,
        userPresent: presentInput || '(無回答)',
        correctPresent: verb.present,
        presentCorrect: presentCorrect,
        userPresentCont: presentContInput || '(無回答)',
        correctPresentCont: verb.presentContinuous,
        presentContCorrect: presentContCorrect,
        userPast: pastInput || '(無回答)',
        correctPast: verb.past,
        pastCorrect: pastCorrect,
        correctCount: correctCount
    };
    VerbTable.quizResults.push(result);
    
    // 計算得分（全對3分，錯1個2分，錯2個1分，全錯0分）
    if (correctCount === 3) {
        VerbTable.quizScore += 3;
    } else if (correctCount === 2) {
        VerbTable.quizScore += 2;
    } else if (correctCount === 1) {
        VerbTable.quizScore += 1;
    }
    
    // 顯示feedback
    let feedbackHTML = '';
    if (correctCount === 3) {
        feedbackHTML = '<div class="feedback correct">✅ 全對！勁揪！</div>';
        speakText('Correct!');
    } else if (correctCount === 2) {
        feedbackHTML = '<div class="feedback partial">⚠️ 錯1個！再接再厲！</div>';
    } else if (correctCount === 1) {
        feedbackHTML = '<div class="feedback partial">⚠️ 錯2個，要加油！</div>';
    } else {
        feedbackHTML = '<div class="feedback wrong">❌ 全錯喎，等多次！</div>';
        speakText('Try again');
    }
    
    // 顯示正確答案
    feedbackHTML += '<div class="answer-reveal">';
    feedbackHTML += `<p>現在式: ${presentCorrect ? '✅' : '❌'} ${verb.present}</p>`;
    feedbackHTML += `<p>現在進行式: ${presentContCorrect ? '✅' : '❌'} ${verb.presentContinuous}</p>`;
    feedbackHTML += `<p>過去式: ${pastCorrect ? '✅' : '❌'} ${verb.past}</p>`;
    feedbackHTML += '</div>';
    
    document.getElementById('verbQuizFeedback').innerHTML = feedbackHTML;
    
    // 顯示「下一題」按鈕，讓用戶確認後才進入下一題
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary';
    nextBtn.style.marginTop = '15px';
    nextBtn.textContent = '➡️ 下一題';
    nextBtn.onclick = () => {
        VerbTable.quizIndex++;
        showVerbQuizQuestion();
    };
    document.getElementById('verbQuizFeedback').appendChild(nextBtn);
}

// 標準化答案（去除空格和常見變體）
function normalizeAnswer(input) {
    if (!input) return '';
    // 去除所有空格，轉小寫
    return input.replace(/\s+/g, '').toLowerCase();
}

// 顯示測驗結果
function showVerbQuizResult() {
    const total = VerbTable.quizVerbs.length;
    const maxScore = total * 3;
    const score = VerbTable.quizScore;
    const percentage = Math.round((score / maxScore) * 100);
    
    // 統計
    let allCorrect = 0, oneWrong = 0, allWrong = 0;
    VerbTable.quizResults.forEach(r => {
        if (r.correctCount === 3) allCorrect++;
        else if (r.correctCount === 2) oneWrong++;
        else allWrong++;
    });
    
    document.getElementById('verbAllCorrect').textContent = allCorrect;
    document.getElementById('verbOneWrong').textContent = oneWrong;
    document.getElementById('verbAllWrong').textContent = allWrong;
    
    let emoji = '🌟';
    let message = '做得好！';
    
    if (percentage >= 80) {
        emoji = '🏆';
        message = '勁揪！';
    } else if (percentage >= 60) {
        emoji = '👍';
        message = '幾好喎！';
    } else {
        emoji = '💪';
        message = '繼續努力！';
    }
    
    document.getElementById('verbResultEmoji').textContent = emoji;
    document.getElementById('verbResultMessage').textContent = message;
    
    // 顯示錯題複習
    const reviewList = document.getElementById('verbReviewList');
    reviewList.innerHTML = '';
    
    const wrongResults = VerbTable.quizResults.filter(r => r.correctCount < 3);
    
    if (wrongResults.length === 0) {
        reviewList.innerHTML = '<p style="color: var(--success-color);">🎉 全部答啱！無錯題複習～</p>';
    } else {
        wrongResults.forEach(r => {
            const item = document.createElement('div');
            item.className = 'verb-review-item';
            item.innerHTML = `
                <div class="verb-review-base">${r.verb} (${r.meaning})</div>
                ${!r.presentCorrect ? `<div class="verb-review-wrong">現在式: ${r.userPresent} → 正確: ${r.correctPresent}</div>` : ''}
                ${!r.presentContCorrect ? `<div class="verb-review-wrong">現在進行式: ${r.userPresentCont} → 正確: ${r.correctPresentCont}</div>` : ''}
                ${!r.pastCorrect ? `<div class="verb-review-wrong">過去式: ${r.userPast} → 正確: ${r.correctPast}</div>` : ''}
            `;
            reviewList.appendChild(item);
        });
    }
    
    hideAllScreens();
    document.getElementById('verbQuizResult').classList.remove('hidden');
}

// 重新開始測驗
function restartVerbQuiz() {
    startVerbQuiz();
}

// 退出測驗
function exitVerbQuiz() {
    showVerbTableSelector();
}

// 返回動詞表顯示
function backToVerbTableDisplay() {
    hideAllScreens();
    document.getElementById('verbTableDisplay').classList.remove('hidden');
}
