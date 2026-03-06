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
