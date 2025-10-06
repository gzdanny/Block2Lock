import { levels } from './levels.js';

// --- DOM Elements ---
const boardEl = document.getElementById('board');
const gameContainerEl = document.getElementById('game-container');
const levelDisplayEl = document.getElementById('level-display');
const movesDisplayEl = document.getElementById('moves-display');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const resetBtn = document.getElementById('reset-btn');
const undoBtn = document.getElementById('undo-btn'); // 新增：撤销按钮
const replayBtn = document.getElementById('replay-btn'); // 新增：回放按钮
const winModalEl = document.getElementById('win-modal');
const winMovesEl = document.getElementById('win-moves');
const winMessageEl = document.getElementById('win-message');
const winBestScoreEl = document.getElementById('win-best-score');
const winBestScoreValueEl = document.getElementById('win-best-score-value');
const modalNextBtn = document.getElementById('modal-next-btn');
const levelSelectBtn = document.getElementById('level-select-btn');
const levelSelectModalEl = document.getElementById('level-select-modal');
const levelGridEl = document.getElementById('level-grid');
const closeLevelSelectBtn = document.getElementById('close-level-select-btn');
const bestScoreDisplayEl = document.getElementById('best-score-display');
const themeToggleBtn = document.getElementById('theme-toggle');

let currentTheme = 'dark';

// --- Game State ---
let gameState = {
    levelIndex: 0,
    moves: 0,
    vehicles: [],
    gameWon: false,
    cellSize: 0,
    highestUnlockedLevel: 0,
    bestScores: [],
    bestMoveHistories: [], // 新增：存储每个关卡的最佳移动历史
    moveHistory: [], // 新增：存储当前关卡的移动历史
    isNewBest: false,
};

// --- Small helpers for null/number checks ---
function isNullish(v) {
    return v === undefined || v === null;
}
function isNumber(v) {
    return typeof v === 'number' && !Number.isNaN(v);
}

// --- Helper Functions (defined early to avoid ReferenceError) ---
function updateButtonStates() {
    const isFirstLevel = gameState.levelIndex === 0;
    const isLastLevel = gameState.levelIndex >= levels.length - 1;
    const isHighestUnlocked = gameState.levelIndex >= gameState.highestUnlockedLevel;

    prevBtn.disabled = isFirstLevel;
    nextBtn.disabled = isLastLevel || isHighestUnlocked;
    resetBtn.disabled = gameState.moves === 0;
    undoBtn.disabled = gameState.moves === 0;
    replayBtn.disabled = !gameState.bestMoveHistories[gameState.levelIndex];
    levelSelectBtn.disabled = false;
    modalNextBtn.disabled = false; // Always enabled for seamless loop
}

function disableAllControls() {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    resetBtn.disabled = true;
    undoBtn.disabled = true;
    replayBtn.disabled = true;
    levelSelectBtn.disabled = true;
}

// --- Drag State ---
let dragState = {
    isDragging: false,
    vehicleIndex: -1,
    dragStartPos: { x: 0, y: 0 },
    vehicleEl: null,
    bounds: { min: 0, max: 0 },
};

// --- Theme Management ---
function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light');
    } else {
        document.body.classList.remove('light');
    }
    currentTheme = theme;
    try {
        localStorage.setItem('block2lock_theme', theme);
    } catch (e) {
        console.error('Failed to save theme to localStorage:', e);
    }
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// --- Persistence ---
function saveCurrentLevel() {
    try {
        localStorage.setItem('block2lock_currentLevel', gameState.levelIndex.toString());
    } catch (e) { console.error(e); }
}

function saveHighestUnlockedLevel() {
    try {
        localStorage.setItem('block2lock_highestUnlockedLevel', gameState.highestUnlockedLevel.toString());
    } catch (e) { console.error(e); }
}

function saveBestScores() {
    // Clean up any null/undefined values before saving (replace with undefined to avoid persistence issues)
    const cleanScores = gameState.bestScores.map(score => isNullish(score) ? undefined : score);
    try {
        localStorage.setItem('block2lock_bestScores', JSON.stringify(cleanScores));
    } catch (e) { console.error(e); }
}

function saveBestMoveHistories() {
    try {
        // 清理空值以避免存储问题
        const cleanHistories = gameState.bestMoveHistories.map(h => Array.isArray(h) ? h : undefined);
        localStorage.setItem('block2lock_bestMoveHistories', JSON.stringify(cleanHistories));
    } catch (e) { console.error(e); }
}

function loadLevel(index) {
    if (index < 0 || index >= levels.length) return;
    if (index > gameState.highestUnlockedLevel) return;

    // 恢复：重新加载记录，以确保在关卡切换时数据是最新的
    // 这是必要的，因为此函数可能在任何时候被调用，需要确保gameState是最新的
    try {
        const savedScores = JSON.parse(localStorage.getItem('block2lock_bestScores') || '[]');
        const savedHistories = JSON.parse(localStorage.getItem('block2lock_bestMoveHistories') || '[]');
        gameState.bestScores = savedScores.map(score => isNullish(score) ? undefined : score);
        gameState.bestMoveHistories = savedHistories.map(h => Array.isArray(h) ? h : undefined);
    } catch (e) { console.error("Couldn't re-load saved histories during level load.", e); }

    gameState.levelIndex = index;
    gameState.moves = 0;
    gameState.moveHistory = []; // 重置移动历史
    gameState.vehicles = JSON.parse(JSON.stringify(levels[index]));
    gameState.gameWon = false;

    render();
    updateButtonStates();
    saveCurrentLevel();
}

/**
 * Updates the DOM position of a single vehicle.
 * @param {number} vehicleIndex The index of the vehicle to update.
 */
function updateVehiclePosition(vehicleIndex) {
    const vehicle = gameState.vehicles[vehicleIndex];
    const vehicleEl = document.getElementById(`vehicle-${vehicleIndex}`);
    if (vehicleEl) {
        const halfGap = '0.125rem';
        vehicleEl.style.top = `calc(100%/6 * ${vehicle.y} + ${halfGap})`;
        vehicleEl.style.left = `calc(100%/6 * ${vehicle.x} + ${halfGap})`;
    }
}

function render() {
    if (!boardEl) return;
    boardEl.innerHTML = '';

    // Use relative units for gaps to ensure proportional scaling.
    // These values correspond to Tailwind's `gap-1` and `p-1`.
    const gap = '0.25rem';
    const halfGap = '0.125rem';

    gameState.vehicles.forEach((v, i) => {
        const vehicleEl = document.createElement('div');
        vehicleEl.id = `vehicle-${i}`;
        const isPlayer = i === 0;

        let extraClasses = 'vehicle-block';
        if (isPlayer) {
            extraClasses += ' player-car-pattern player-car-shadow';
        }

        const colorIndex = isPlayer ? 0 : ((i - 1) % 11) + 1; // 11 is the number of block colors defined in CSS

        vehicleEl.className = `absolute rounded-md flex items-center justify-center font-bold text-white/50 cursor-grab vehicle-block-${colorIndex} ${extraClasses}`;

        vehicleEl.style.width = v.hz ? `calc(100%/6 * ${v.length} - ${gap})` : `calc(100%/6 - ${gap})`;
        vehicleEl.style.height = v.hz ? `calc(100%/6 - ${gap})` : `calc(100%/6 * ${v.length} - ${gap})`;
        vehicleEl.style.top = `calc(100%/6 * ${v.y} + ${halfGap})`;
        vehicleEl.style.left = `calc(100%/6 * ${v.x} + ${halfGap})`;
        vehicleEl.style.transition = 'top 0.2s ease, left 0.2s ease';
        vehicleEl.style.zIndex = '5'; // 确保车辆在 EXIT 文本之上
        vehicleEl.addEventListener('mousedown', (e) => handleInteractionStart(e, i));
        vehicleEl.addEventListener('touchstart', (e) => handleInteractionStart(e, i), { passive: false });

        boardEl.appendChild(vehicleEl);
    });

    // Add new, simpler EXIT text indicator
    const exitTextEl = document.createElement('div');
    exitTextEl.className = 'absolute flex items-center justify-center text-center font-bold text-secondary text-sm';
    exitTextEl.textContent = 'EXIT →';
    exitTextEl.style.width = 'calc(100%/6)';
    exitTextEl.style.height = 'calc(100%/6)';
    // Position in 3rd row (y=2), 6th column (x=5)
    exitTextEl.style.top = 'calc(100%/6 * 2)';
    exitTextEl.style.left = 'calc(100%/6 * 5)';
    exitTextEl.style.zIndex = '1'; // Low z-index to be behind blocks
    boardEl.appendChild(exitTextEl);


    levelDisplayEl.textContent = gameState.levelIndex + 1;
    movesDisplayEl.textContent = gameState.moves;

    // 更新并显示最佳分数和回放按钮（如果存在）
    const bestScore = gameState.bestScores[gameState.levelIndex];
    if (isNumber(bestScore)) {
        bestScoreDisplayEl.textContent = bestScore;
    } else {
        bestScoreDisplayEl.textContent = '--';
    }

    // cleanup any visualViewport handlers and inline sizing
    try {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    } catch (e) { }
    winModalEl.classList.remove('flex');
    winModalEl.classList.add('hidden');
}

function createCollisionGrid(excludeIndex = -1) {
    const grid = Array(6).fill(null).map(() => Array(6).fill(false));
    gameState.vehicles.forEach((v, i) => {
        if (i === excludeIndex) return;
        for (let j = 0; j < v.length; j++) {
            if (v.hz) {
                if (v.y >= 0 && v.y < 6 && v.x + j >= 0 && v.x + j < 6)
                    grid[v.y][v.x + j] = true;
            } else {
                if (v.y + j >= 0 && v.y + j < 6 && v.x >= 0 && v.x < 6)
                    grid[v.y + j][v.x] = true;
            }
        }
    });
    return grid;
}

function getEventPosition(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

function handleInteractionStart(e, vehicleIndex) {
    if (gameState.gameWon) return;
    e.preventDefault();

    const vehicle = gameState.vehicles[vehicleIndex];
    const vehicleEl = document.getElementById(`vehicle-${vehicleIndex}`);
    if (!vehicleEl) return;

    dragState.isDragging = true;
    dragState.vehicleIndex = vehicleIndex;
    dragState.vehicleEl = vehicleEl;
    dragState.dragStartPos = getEventPosition(e);

    vehicleEl.style.transition = 'none';
    vehicleEl.style.zIndex = '10';

    const grid = createCollisionGrid(vehicleIndex);

    if (vehicle.hz) {
        let minX = vehicle.x;
        while (minX > 0 && !grid[vehicle.y][minX - 1]) {
            minX--;
        }
        let maxX = vehicle.x;
        while (maxX < (6 - vehicle.length) && !grid[vehicle.y][maxX + vehicle.length]) {
            maxX++;
        }
        dragState.bounds.min = (minX - vehicle.x) * gameState.cellSize;
        dragState.bounds.max = (maxX - vehicle.x) * gameState.cellSize;
    } else {
        let minY = vehicle.y;
        while (minY > 0 && !grid[minY - 1][vehicle.x]) {
            minY--;
        }
        let maxY = vehicle.y;
        while (maxY < (6 - vehicle.length) && !grid[maxY + vehicle.length][vehicle.x]) {
            maxY++;
        }
        dragState.bounds.min = (minY - vehicle.y) * gameState.cellSize;
        dragState.bounds.max = (maxY - vehicle.y) * gameState.cellSize;
    }

    document.addEventListener('mousemove', handleInteractionMove);
    document.addEventListener('mouseup', handleInteractionEnd);
    document.addEventListener('touchmove', handleInteractionMove, { passive: false });
    document.addEventListener('touchend', handleInteractionEnd);
}

function handleInteractionMove(e) {
    if (!dragState.isDragging) return;
    e.preventDefault();

    const currentPos = getEventPosition(e);
    const vehicle = gameState.vehicles[dragState.vehicleIndex];
    let delta;

    if (vehicle.hz) {
        delta = currentPos.x - dragState.dragStartPos.x;
        delta = Math.max(dragState.bounds.min, Math.min(delta, dragState.bounds.max));
        dragState.vehicleEl.style.transform = `translateX(${delta}px)`;
    } else {
        delta = currentPos.y - dragState.dragStartPos.y;
        delta = Math.max(dragState.bounds.min, Math.min(delta, dragState.bounds.max));
        dragState.vehicleEl.style.transform = `translateY(${delta}px)`;
    }
}

function handleInteractionEnd(e) {
    if (!dragState.isDragging) return;

    document.removeEventListener('mousemove', handleInteractionMove);
    document.removeEventListener('mouseup', handleInteractionEnd);
    document.removeEventListener('touchmove', handleInteractionMove);
    document.removeEventListener('touchend', handleInteractionEnd);

    const vehicle = gameState.vehicles[dragState.vehicleIndex];
    const vehicleEl = dragState.vehicleEl;
    let delta = 0;

    const transform = vehicleEl.style.transform;
    if (transform) {
        const match = transform.match(/-?[\d.]+/);
        if (match) delta = parseFloat(match[0]);
    }

    const cellsMoved = Math.round(delta / gameState.cellSize);

    // Instantly move to the final position without animation to prevent "bounce"
    vehicleEl.style.transition = 'none';
    vehicleEl.style.transform = 'none';

    if (cellsMoved !== 0) {
        if (vehicle.hz) {
            vehicle.x += cellsMoved;
        } else {
            vehicle.y += cellsMoved;
        }
        gameState.moves++;
        movesDisplayEl.textContent = gameState.moves;

        gameState.moveHistory.push({
            vehicleIndex: dragState.vehicleIndex,
            cellsMoved: cellsMoved
        });

        updateButtonStates();
    }

    // Apply the final snapped position
    const halfGap = '0.125rem';
    vehicleEl.style.top = `calc(100%/6 * ${vehicle.y} + ${halfGap})`;
    vehicleEl.style.left = `calc(100%/6 * ${vehicle.x} + ${halfGap})`;

    // Force a reflow to ensure the styles are applied before re-enabling transition
    vehicleEl.offsetHeight;

    // Re-enable transitions for future animations
    vehicleEl.style.transition = 'top 0.2s ease, left 0.2s ease';
    vehicleEl.style.zIndex = '5'; // Return to normal z-index

    // 检查获胜条件
    if (cellsMoved !== 0) {
        checkWinCondition();
    }
    // 拖拽状态在 checkWinCondition 中处理，这里不需要重置
}

function checkWinCondition() {
    const playerVehicle = gameState.vehicles[0];

    // 守卫条件：如果移动的不是玩家车辆，或者玩家车辆未到达出口，则不是获胜条件。
    if (dragState.vehicleIndex !== 0 || playerVehicle.x + playerVehicle.length < 6) {
        // Not a winning move, so we can safely reset drag state here
        // 非获胜移动，重置拖拽状态
        dragState.isDragging = false;
        dragState.vehicleIndex = -1;
        dragState.vehicleEl = null;
        return;
    }

    // --- 获胜逻辑 ---
    gameState.gameWon = true;
    disableAllControls(); // 禁用所有背景按钮，因为游戏已获胜
    const vehicleEl = document.getElementById('vehicle-0');
    //飞出去动画
    if (vehicleEl) {
        vehicleEl.classList.add('animate-win');
    }

    const oldBest = gameState.bestScores[gameState.levelIndex];
    // 在首次完成或平/破纪录时，都视为新纪录，以便保存通关过程
    gameState.isNewBest = (isNullish(oldBest) || gameState.moves <= oldBest);

    if (gameState.isNewBest) {
        // 如果是新纪录，同时保存最佳步数和移动历史
        gameState.bestScores[gameState.levelIndex] = gameState.moves;
        if (gameState.moveHistory.length > 0) {
            gameState.bestMoveHistories[gameState.levelIndex] = [...gameState.moveHistory];
        }
        saveBestScores();
        saveBestMoveHistories();
    }

    if (gameState.levelIndex === gameState.highestUnlockedLevel && gameState.highestUnlockedLevel < levels.length - 1) {
        gameState.highestUnlockedLevel++;
        saveHighestUnlockedLevel();
    }

    setTimeout(showWinModal, 400);
}

function handleUndo() {
    if (gameState.moves === 0 || gameState.gameWon) return;

    const lastMove = gameState.moveHistory.pop();
    if (!lastMove) return;

    const { vehicleIndex, cellsMoved } = lastMove;
    const vehicle = gameState.vehicles[vehicleIndex];

    // 执行反向移动
    if (vehicle.hz) {
        vehicle.x -= cellsMoved;
    } else {
        vehicle.y -= cellsMoved;
    }

    gameState.moves--;
    movesDisplayEl.textContent = gameState.moves;

    // 直接更新DOM元素以实现动画，而不是重新渲染
    updateVehiclePosition(vehicleIndex);
    updateButtonStates();
}

async function handleReplay() {
    const bestHistory = gameState.bestMoveHistories[gameState.levelIndex];
    if (!bestHistory || bestHistory.length === 0) return;

    // 重置关卡到初始状态
    loadLevel(gameState.levelIndex);
    disableAllControls(); // 确保在动画播放期间所有按钮都保持禁用

    // 等待初始渲染完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 播放除了最后一步之外的所有步骤
    for (let i = 0; i < bestHistory.length - 1; i++) {
        const move = bestHistory[i];
        const { vehicleIndex, cellsMoved } = move;
        const vehicle = gameState.vehicles[vehicleIndex];

        vehicle.hz ? (vehicle.x += cellsMoved) : (vehicle.y += cellsMoved);

        updateVehiclePosition(vehicleIndex);

        gameState.moves++;
        movesDisplayEl.textContent = gameState.moves;

        await new Promise(resolve => setTimeout(resolve, 400)); // 每步之间的延迟
    }

    // 直接触发获胜动画
    const playerVehicleEl = document.getElementById('vehicle-0');
    if (playerVehicleEl) {
        playerVehicleEl.classList.add('animate-win'); // 现在动画会从正确的位置开始
    }
    gameState.moves++;
    movesDisplayEl.textContent = gameState.moves;
    // 回放结束后，重新加载关卡以恢复交互性
    await new Promise(resolve => setTimeout(resolve, 800)); // 等待动画播放
    loadLevel(gameState.levelIndex); // 恢复交互, loadLevel内部会调用render和updateButtonStates
}

let hiddenSwitchTextEl = null; // Now get from DOM by ID
let hiddenSwitchClickCount = 0;
let hiddenSwitchTimeout = null;
let currentModalClickHandler = null;

function hideWinModal() {
    if (currentModalClickHandler) {
        winModalEl.removeEventListener('click', currentModalClickHandler);
        currentModalClickHandler = null;
    }
    try {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    } catch (e) { }
    winModalEl.classList.remove('flex');
    winModalEl.classList.add('hidden');
}

function showWinModal() {
    winMovesEl.textContent = gameState.moves;
    const bestScore = gameState.bestScores[gameState.levelIndex];
    // Handle null/undefined: default to 0 if no score yet
    const displayBest = isNumber(bestScore) ? bestScore : 0;
    winBestScoreValueEl.textContent = displayBest;

    // Simplified logic: show "New Best Score!" only on first completion or strictly better score
    if (gameState.isNewBest) {
        winMessageEl.textContent = "New Best Score!";
        winBestScoreEl.classList.add('text-yellow-300');
    } else {
        winMessageEl.textContent = "Level Complete!";
        winBestScoreEl.classList.remove('text-yellow-300');
    }

    // Buttons are disabled by disableAllControls() upon win. No need to update here.

    // Prevent background from scrolling while modal is open
    try {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    } catch (e) { }

    hiddenSwitchClickCount = 0;
    const handleModalClick = (e) => {
        if (e.target.closest('#win-modal')) {
            // Only trigger on clicks to the 'You Win!' title (h2)
            if (e.target.matches('h2') || e.target.closest('h2')) {
                if (hiddenSwitchTimeout) {
                    clearTimeout(hiddenSwitchTimeout);
                    hiddenSwitchTimeout = null;
                }
                hiddenSwitchClickCount++;

                if (hiddenSwitchClickCount >= 3) {
                    if (gameState.highestUnlockedLevel === levels.length - 1) {
                        // Reset records
                        gameState.highestUnlockedLevel = gameState.levelIndex + 1 < levels.length ? gameState.levelIndex + 1 : 0;
                        saveHighestUnlockedLevel();
                        if (hiddenSwitchTextEl) hiddenSwitchTextEl.classList.remove('visible'); // hide
                    } else {
                        // Unlock all levels and immediately go to next level for feedback
                        gameState.highestUnlockedLevel = levels.length - 1;
                        saveHighestUnlockedLevel();
                        if (hiddenSwitchTextEl) hiddenSwitchTextEl.classList.add('visible'); // show faint
                    }
                    updateButtonStates();
                    modalNextBtn.click(); // Use existing button logic to go to next level
                    hiddenSwitchClickCount = 0;
                    return;
                }

                // Reset count if not consecutive (1s window)
                hiddenSwitchTimeout = setTimeout(() => {
                    hiddenSwitchClickCount = 0;
                }, 1000);
            }
        }
    };
    currentModalClickHandler = handleModalClick;
    winModalEl.addEventListener('click', handleModalClick);

    winModalEl.classList.remove('hidden');
    winModalEl.classList.add('flex');

    // Reset the flag after modal shows
    gameState.isNewBest = false;
}

function populateLevelSelectModal() {
    levelGridEl.innerHTML = '';
    for (let i = 0; i < levels.length; i++) {
        const button = document.createElement('button');
        const isUnlocked = i <= gameState.highestUnlockedLevel;

        if (isUnlocked) {
            button.className = 'aspect-square flex items-center justify-center rounded-md transition-colors text-lg relative font-semibold';
            button.innerHTML = `<span>${i + 1}</span>`;
            button.addEventListener('click', () => {
                loadLevel(i);
                closeLevelSelectModal();
            });
            const bestScore = gameState.bestScores[i];
            // Enhanced check: ensure it's a valid number, not null/undefined
            if (isNumber(bestScore)) {
                const scoreDisplay = document.createElement('span');
                scoreDisplay.className = 'best-score-display';
                scoreDisplay.textContent = `★${bestScore}`;
                button.appendChild(scoreDisplay);
            }
        } else {
            button.className = 'aspect-square flex items-center justify-center rounded-md cursor-not-allowed level-button-locked relative';
            button.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>${i + 1}</span>`;
        }
        levelGridEl.appendChild(button);
    }
}

function openLevelSelectModal() {
    populateLevelSelectModal();
    levelSelectModalEl.classList.remove('hidden');
    levelSelectModalEl.classList.add('flex');
}

function closeLevelSelectModal() {
    levelSelectModalEl.classList.remove('flex');
    levelSelectModalEl.classList.add('hidden');
}

function loadPersistentData() {
    try {
        const savedLevel = parseInt(localStorage.getItem('block2lock_currentLevel'), 10);
        const savedUnlocked = parseInt(localStorage.getItem('block2lock_highestUnlockedLevel'), 10);
        const savedScores = JSON.parse(localStorage.getItem('block2lock_bestScores') || '[]');
        const savedHistories = JSON.parse(localStorage.getItem('block2lock_bestMoveHistories') || '[]');

        if (!isNaN(savedLevel) && savedLevel < levels.length) gameState.levelIndex = savedLevel;
        if (!isNaN(savedUnlocked)) gameState.highestUnlockedLevel = savedUnlocked;
        if (Array.isArray(savedScores)) {
            // Clean up any null/undefined values during load (replace with undefined)
            gameState.bestScores = savedScores.map(score => isNullish(score) ? undefined : score);
        }
        if (Array.isArray(savedHistories)) {
            gameState.bestMoveHistories = savedHistories.map(h => Array.isArray(h) ? h : undefined);
        }
    } catch (e) {
        console.error("Couldn't load saved data.", e);
    }

    try {
        const savedTheme = localStorage.getItem('block2lock_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
            setTheme(savedTheme);
        } else {
            setTheme('dark');
        }
    } catch (e) {
        console.error('Failed to load theme from localStorage:', e);
        setTheme('dark');
    }
}

function registerEventListeners() {
    prevBtn.addEventListener('click', () => loadLevel(gameState.levelIndex - 1));
    nextBtn.addEventListener('click', () => loadLevel(gameState.levelIndex + 1));
    resetBtn.addEventListener('click', () => loadLevel(gameState.levelIndex));
    undoBtn.addEventListener('click', handleUndo);
    replayBtn.addEventListener('click', handleReplay);
    modalNextBtn.addEventListener('click', () => {
        const nextLevel = gameState.levelIndex < levels.length - 1 ? gameState.levelIndex + 1 : 0;
        loadLevel(nextLevel); // This will also call updateButtonStates
        hideWinModal();
    });

    levelSelectBtn.addEventListener('click', openLevelSelectModal);
    closeLevelSelectBtn.addEventListener('click', closeLevelSelectModal);
    themeToggleBtn.addEventListener('click', toggleTheme);

    window.addEventListener('resize', updateCellSize);
}

function updateCellSize() {
    if (boardEl) {
        gameState.cellSize = boardEl.clientWidth / 6;
    }
}

// In init(), create the Greek text element (initially hidden, appended to button row)
function init() {
    loadPersistentData();
    registerEventListeners();
    updateCellSize();

    // Get the hidden switch text element from DOM (static in HTML)
    hiddenSwitchTextEl = document.getElementById('hidden-switch-text');
    if (hiddenSwitchTextEl) {
        hiddenSwitchTextEl.classList.remove('visible'); // Ensure initial hidden
    }

    loadLevel(gameState.levelIndex);
}

init();