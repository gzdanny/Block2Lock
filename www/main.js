import { levels } from './levels.js';

// --- DOM Elements ---
const boardEl = document.getElementById('board');
const gameContainerEl = document.getElementById('game-container');
const levelDisplayEl = document.getElementById('level-display');
const movesDisplayEl = document.getElementById('moves-display');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const resetBtn = document.getElementById('reset-btn');
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
};

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
    } catch(e) { console.error(e); }
}

function saveHighestUnlockedLevel() {
    try {
        localStorage.setItem('block2lock_highestUnlockedLevel', gameState.highestUnlockedLevel.toString());
    } catch(e) { console.error(e); }
}

function saveBestScores() {
    try {
        localStorage.setItem('block2lock_bestScores', JSON.stringify(gameState.bestScores));
    } catch(e) { console.error(e); }
}


function loadLevel(index) {
    if (index < 0 || index >= levels.length) return;
    if (index > gameState.highestUnlockedLevel) return;

    gameState.levelIndex = index;
    gameState.moves = 0;
    gameState.vehicles = JSON.parse(JSON.stringify(levels[index]));
    gameState.gameWon = false;

    render();
    saveCurrentLevel();
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
        vehicleEl.style.zIndex = '5'; // Ensure vehicles are above the EXIT text
        
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

    prevBtn.disabled = gameState.levelIndex === 0;
    nextBtn.disabled = gameState.levelIndex >= gameState.highestUnlockedLevel || gameState.levelIndex >= levels.length - 1;
    
    winModalEl.classList.remove('flex');
    winModalEl.classList.add('hidden');
}

function createCollisionGrid(excludeIndex = -1) {
    const grid = Array(6).fill(null).map(() => Array(6).fill(false));
    gameState.vehicles.forEach((v, i) => {
        if (i === excludeIndex) return;
        for (let j = 0; j < v.length; j++) {
            if (v.hz) {
                if(v.y >= 0 && v.y < 6 && v.x + j >= 0 && v.x + j < 6)
                    grid[v.y][v.x + j] = true;
            } else {
                if(v.y + j >= 0 && v.y + j < 6 && v.x >= 0 && v.x < 6)
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

    if (cellsMoved !== 0) {
        checkWinCondition();
    }

    dragState.isDragging = false;
    dragState.vehicleIndex = -1;
    dragState.vehicleEl = null;
}

function checkWinCondition() {
    const playerVehicle = gameState.vehicles[0];
    if (playerVehicle.x + playerVehicle.length >= 6) {
        gameState.gameWon = true;
        
        const vehicleEl = document.getElementById('vehicle-0');
        if (vehicleEl) {
            vehicleEl.classList.add('animate-win');
        }
        
        const oldBest = gameState.bestScores[gameState.levelIndex];
        if (oldBest === undefined || gameState.moves < oldBest) {
            gameState.bestScores[gameState.levelIndex] = gameState.moves;
            saveBestScores();
        }

        if (gameState.levelIndex === gameState.highestUnlockedLevel && gameState.highestUnlockedLevel < levels.length - 1) {
            gameState.highestUnlockedLevel++;
            saveHighestUnlockedLevel();
        }
        
        setTimeout(showWinModal, 400);
    }
}

function showWinModal() {
    winMovesEl.textContent = gameState.moves;
    const bestScore = gameState.bestScores[gameState.levelIndex];
    winBestScoreValueEl.textContent = bestScore;
    
    if (gameState.moves === bestScore && (levels[gameState.levelIndex].length > 3)) { // Don't show for very easy levels
        winMessageEl.textContent = "New Best Score!";
        winBestScoreEl.classList.add('text-yellow-300');
    } else {
        winMessageEl.textContent = "Level Complete!";
        winBestScoreEl.classList.remove('text-yellow-300');
    }

    modalNextBtn.disabled = gameState.levelIndex >= levels.length - 1;

    winModalEl.classList.remove('hidden');
    winModalEl.classList.add('flex');
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
            if (bestScore !== undefined) {
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

function init() {
    try {
        const savedLevel = parseInt(localStorage.getItem('block2lock_currentLevel'), 10);
        const savedUnlocked = parseInt(localStorage.getItem('block2lock_highestUnlockedLevel'), 10);
        const savedScores = JSON.parse(localStorage.getItem('block2lock_bestScores'));

        if (!isNaN(savedLevel) && savedLevel < levels.length) gameState.levelIndex = savedLevel;
        if (!isNaN(savedUnlocked)) gameState.highestUnlockedLevel = savedUnlocked;
        if (Array.isArray(savedScores)) gameState.bestScores = savedScores;
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
    
    prevBtn.addEventListener('click', () => loadLevel(gameState.levelIndex - 1));
    nextBtn.addEventListener('click', () => loadLevel(gameState.levelIndex + 1));
    resetBtn.addEventListener('click', () => loadLevel(gameState.levelIndex));
    modalNextBtn.addEventListener('click', () => {
        if(gameState.levelIndex < levels.length - 1) {
            loadLevel(gameState.levelIndex + 1);
        }
        winModalEl.classList.add('hidden');
    });

    levelSelectBtn.addEventListener('click', openLevelSelectModal);
    closeLevelSelectBtn.addEventListener('click', closeLevelSelectModal);
    themeToggleBtn.addEventListener('click', toggleTheme);

    function updateCellSize() {
        if (boardEl) {
            gameState.cellSize = boardEl.clientWidth / 6;
        }
    }
    window.addEventListener('resize', updateCellSize);
    updateCellSize();

    loadLevel(gameState.levelIndex);
}

init();