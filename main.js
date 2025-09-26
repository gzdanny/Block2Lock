import { levels } from './levels.js';

const vehicleColors = [
  'bg-red-600', // Player's car
  'bg-cyan-600', 'bg-sky-700', 'bg-cyan-800', 'bg-sky-600', 'bg-cyan-700',
  'bg-sky-800', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-indigo-500', 'bg-slate-500',
];

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
const modalNextBtn = document.getElementById('modal-next-btn');

// --- Game State ---
let gameState = {
    levelIndex: 0,
    moves: 0,
    vehicles: [],
    gameWon: false,
    cellSize: 0,
};

// --- Drag State ---
let dragState = {
    isDragging: false,
    vehicleIndex: -1,
    dragStartPos: { x: 0, y: 0 },
    vehicleEl: null,
    bounds: { min: 0, max: 0 },
};

function saveLevel() {
    localStorage.setItem('block2lockLevel', gameState.levelIndex.toString());
}

function loadLevel(index) {
    if (index < 0 || index >= levels.length) return;

    gameState.levelIndex = index;
    gameState.moves = 0;
    gameState.vehicles = JSON.parse(JSON.stringify(levels[index]));
    gameState.gameWon = false;

    render();
    saveLevel();
}

function render() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-6 grid-rows-6 w-full h-full gap-1';
    for (let i = 0; i < 36; i++) {
        const cell = document.createElement('div');
        cell.className = 'bg-slate-700/50 rounded-sm';
        gridContainer.appendChild(cell);
    }
    boardEl.appendChild(gridContainer);
    
    gameState.vehicles.forEach((v, i) => {
        const vehicleEl = document.createElement('div');
        vehicleEl.id = `vehicle-${i}`;
        const isPlayer = i === 0;
        const color = isPlayer ? vehicleColors[0] : vehicleColors[i % vehicleColors.length];
        const patternClass = isPlayer ? 'player-car-pattern' : '';
        
        vehicleEl.className = `absolute rounded-md flex items-center justify-center font-bold text-white/50 shadow-lg cursor-grab ${color} ${patternClass}`;
        
        vehicleEl.style.width = v.hz ? `calc(100%/6 * ${v.length} - 4px)` : `calc(100%/6 - 4px)`;
        vehicleEl.style.height = v.hz ? `calc(100%/6 - 4px)` : `calc(100%/6 * ${v.length} - 4px)`;
        vehicleEl.style.top = `calc(100%/6 * ${v.y} + 2px)`;
        vehicleEl.style.left = `calc(100%/6 * ${v.x} + 2px)`;
        // This transition is for level changes
        vehicleEl.style.transition = 'top 0.2s ease, left 0.2s ease';
        
        vehicleEl.addEventListener('mousedown', (e) => handleInteractionStart(e, i));
        vehicleEl.addEventListener('touchstart', (e) => handleInteractionStart(e, i));
        
        boardEl.appendChild(vehicleEl);
    });

    levelDisplayEl.textContent = gameState.levelIndex + 1;
    movesDisplayEl.textContent = gameState.moves;

    prevBtn.disabled = gameState.levelIndex === 0;
    nextBtn.disabled = gameState.levelIndex >= levels.length - 1;
    
    winModalEl.classList.remove('flex');
    winModalEl.classList.add('hidden');
}

function createCollisionGrid(excludeIndex = -1) {
    const grid = Array(6).fill(null).map(() => Array(6).fill(false));
    gameState.vehicles.forEach((v, i) => {
        if (i === excludeIndex) return;
        for (let j = 0; j < v.length; j++) {
            if (v.hz) {
                if (v.y >= 0 && v.y < 6 && v.x + j >= 0 && v.x + j < 6) {
                    grid[v.y][v.x + j] = true;
                }
            } else {
                if (v.y + j >= 0 && v.y + j < 6 && v.x >= 0 && v.x < 6) {
                    grid[v.y + j][v.x] = true;
                }
            }
        }
    });
    return grid;
}

function getDragBounds(vehicleIndex) {
    const vehicle = gameState.vehicles[vehicleIndex];
    const grid = createCollisionGrid(vehicleIndex);
    const { cellSize } = gameState;

    if (vehicle.hz) {
        let minX = 0;
        for (let x = vehicle.x - 1; x >= 0; x--) {
            if (grid[vehicle.y][x]) {
                minX = x + 1;
                break;
            }
        }
        let maxX = 6 - vehicle.length;
        for (let x = vehicle.x + vehicle.length; x < 6; x++) {
             if (vehicle.y < 0 || vehicle.y >= 6 || x < 0 || x >= 6) continue;
            if (grid[vehicle.y][x]) {
                maxX = x - vehicle.length;
                break;
            }
        }
        return { min: (minX - vehicle.x) * cellSize, max: (maxX - vehicle.x) * cellSize };
    } else {
        let minY = 0;
        for (let y = vehicle.y - 1; y >= 0; y--) {
            if (y < 0 || y >= 6 || vehicle.x < 0 || vehicle.x >= 6) continue;
            if (grid[y][vehicle.x]) {
                minY = y + 1;
                break;
            }
        }
        let maxY = 6 - vehicle.length;
        for (let y = vehicle.y + vehicle.length; y < 6; y++) {
            if (y < 0 || y >= 6 || vehicle.x < 0 || vehicle.x >= 6) continue;
            if (grid[y][vehicle.x]) {
                maxY = y - vehicle.length;
                break;
            }
        }
        return { min: (minY - vehicle.y) * cellSize, max: (maxY - vehicle.y) * cellSize };
    }
}

function isMoveValid(vehicleIndex, newX, newY) {
    const vehicle = gameState.vehicles[vehicleIndex];
    const grid = createCollisionGrid(vehicleIndex);

    if (vehicle.hz) {
        if (newX < 0 || newX > 6 - vehicle.length) return false;
    } else {
        if (newY < 0 || newY > 6 - vehicle.length) return false;
    }
    
    if (vehicle.hz) {
        const y = vehicle.y;
        const startX = Math.min(vehicle.x, newX);
        const endX = Math.max(vehicle.x, newX);
        for (let x = startX; x <= endX + vehicle.length - 1; x++) {
            if (x >= vehicle.x && x < vehicle.x + vehicle.length) continue;
            if (y < 0 || y >= 6 || x < 0 || x >= 6) continue;
            if (grid[y][x]) return false;
        }
    } else {
        const x = vehicle.x;
        const startY = Math.min(vehicle.y, newY);
        const endY = Math.max(vehicle.y, newY);
        for (let y = startY; y <= endY + vehicle.length - 1; y++) {
            if (y >= vehicle.y && y < vehicle.y + vehicle.length) continue;
            if (y < 0 || y >= 6 || x < 0 || x >= 6) continue;
            if (grid[y][x]) return false;
        }
    }
    return true;
}

function handleInteractionStart(e, index) {
    if (gameState.gameWon || dragState.isDragging) return;
    
    const vehicleEl = document.getElementById(`vehicle-${index}`);
    if (!vehicleEl) return;
    
    e.preventDefault();
    
    dragState = {
        isDragging: true,
        vehicleIndex: index,
        vehicleEl: vehicleEl,
        dragStartPos: {
            x: e.touches ? e.touches[0].clientX : e.clientX,
            y: e.touches ? e.touches[0].clientY : e.clientY,
        },
        bounds: getDragBounds(index),
    };
    
    dragState.vehicleEl.style.transition = 'none';
    dragState.vehicleEl.style.zIndex = '10';
    document.body.style.cursor = 'grabbing';
}

function handleInteractionMove(e) {
    if (!dragState.isDragging) return;

    const event = e.touches ? e.touches[0] : e;
    const deltaX = event.clientX - dragState.dragStartPos.x;
    const deltaY = event.clientY - dragState.dragStartPos.y;
    const vehicle = gameState.vehicles[dragState.vehicleIndex];

    if (vehicle.hz) {
        const clampedDeltaX = Math.max(dragState.bounds.min, Math.min(deltaX, dragState.bounds.max));
        dragState.vehicleEl.style.transform = `translateX(${clampedDeltaX}px)`;
    } else {
        const clampedDeltaY = Math.max(dragState.bounds.min, Math.min(deltaY, dragState.bounds.max));
        dragState.vehicleEl.style.transform = `translateY(${clampedDeltaY}px)`;
    }
}

function handleInteractionEnd() {
    if (!dragState.isDragging) return;

    const { vehicleEl, vehicleIndex } = dragState;
    const vehicle = gameState.vehicles[vehicleIndex];

    if (!vehicleEl) {
        dragState.isDragging = false;
        return;
    }

    const transform = vehicleEl.style.transform;
    const transformValue = (transform.match(/-?\d+\.?\d*/g) || ['0'])[0];
    const delta = Number(transformValue);

    let targetX = vehicle.x;
    let targetY = vehicle.y;

    if (vehicle.hz) {
        targetX = Math.round((vehicle.x * gameState.cellSize + delta) / gameState.cellSize);
    } else {
        targetY = Math.round((vehicle.y * gameState.cellSize + delta) / gameState.cellSize);
    }

    dragState.isDragging = false;
    document.body.style.cursor = 'default';
    vehicleEl.style.zIndex = '0';

    const moved = targetX !== vehicle.x || targetY !== vehicle.y;
    const isValid = moved ? isMoveValid(vehicleIndex, targetX, targetY) : false;

    if (!isValid) {
        targetX = vehicle.x;
        targetY = vehicle.y;
    }

    vehicleEl.style.transition = 'transform 0.2s ease';
    if (vehicle.hz) {
        const finalDelta = (targetX - vehicle.x) * gameState.cellSize;
        vehicleEl.style.transform = `translateX(${finalDelta}px)`;
    } else {
        const finalDelta = (targetY - vehicle.y) * gameState.cellSize;
        vehicleEl.style.transform = `translateY(${finalDelta}px)`;
    }

    setTimeout(() => {
        if (isValid) {
            gameState.vehicles[vehicleIndex].x = targetX;
            gameState.vehicles[vehicleIndex].y = targetY;
            gameState.moves++;
            checkWinCondition();
        }
        
        if (!gameState.gameWon) {
            render();
        }

    }, 200);
}

function checkWinCondition() {
    if (gameState.gameWon) return;
    const redCar = gameState.vehicles[0];
    if (redCar.hz && redCar.x + redCar.length >= 6) {
        winGame();
    }
}

function winGame() {
    gameState.gameWon = true;
    const playerCarEl = document.getElementById('vehicle-0');
    const redCar = gameState.vehicles[0];

    if (playerCarEl) {
        // "Bake in" the transform from the snap animation into the top/left styles
        // before starting the win animation. This provides a stable starting point.
        playerCarEl.style.transition = 'none'; // Turn off transitions
        playerCarEl.style.transform = '';     // Clear the old transform
        playerCarEl.style.top = `calc(100%/6 * ${redCar.y} + 2px)`;
        playerCarEl.style.left = `calc(100%/6 * ${redCar.x} + 2px)`;

        // We need to force a reflow for the browser to register the new position
        // before applying the animation class.
        void playerCarEl.offsetWidth; 

        // Now, add the win animation class. It will start from the correct final position.
        playerCarEl.classList.add('animate-win');
    }

    setTimeout(() => {
        winMovesEl.textContent = gameState.moves;
        winModalEl.classList.remove('hidden');
        winModalEl.classList.add('flex');
    }, 500);
}

function setupEventListeners() {
    prevBtn.addEventListener('click', () => loadLevel(gameState.levelIndex - 1));
    nextBtn.addEventListener('click', () => loadLevel(gameState.levelIndex + 1));
    resetBtn.addEventListener('click', () => loadLevel(gameState.levelIndex));
    modalNextBtn.addEventListener('click', () => {
        if (gameState.levelIndex < levels.length - 1) {
            loadLevel(gameState.levelIndex + 1);
        }
    });
    
    window.addEventListener('mousemove', handleInteractionMove);
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchmove', handleInteractionMove, { passive: false });
    window.addEventListener('touchend', handleInteractionEnd);
    
    const resizeObserver = new ResizeObserver(updateCellSize);
    resizeObserver.observe(boardEl);
}

function updateCellSize() {
    if (!boardEl || !gameContainerEl) return;

    const oldCutout = gameContainerEl.querySelector('.exit-cutout');
    if (oldCutout) oldCutout.remove();
    const oldSign = gameContainerEl.querySelector('.exit-sign');
    if (oldSign) oldSign.remove();

    const boardWidth = boardEl.offsetWidth;
    gameState.cellSize = boardWidth / 6;

    if(boardWidth === 0) return;

    const actualCellSize = (boardWidth - (5 * 4) - (2 * 4)) / 6; 
    const cutoutHeight = actualCellSize * 1.4;
    const gameContainerPadding = 8;
    const boardPadding = 4;
    const gap = 4;
    
    const exitLaneCenterY = gameContainerPadding + boardPadding + (2 * (actualCellSize + gap)) + (actualCellSize / 2);
    const cutoutTop = exitLaneCenterY - (cutoutHeight / 2);
    const signHeight = actualCellSize > 4 ? actualCellSize - 4 : 0;
    const signTop = exitLaneCenterY - (signHeight / 2);
    
    const cutoutEl = document.createElement('div');
    cutoutEl.className = "exit-cutout absolute w-2 bg-slate-900";
    cutoutEl.style.right = '0';
    cutoutEl.style.height = `${cutoutHeight}px`;
    cutoutEl.style.top = `${cutoutTop}px`;

    const signEl = document.createElement('div');
    signEl.className = "exit-sign absolute flex flex-col items-center justify-center bg-green-700 text-white font-bold rounded-md px-2 py-1 shadow-lg text-xs";
    signEl.setAttribute('aria-hidden', 'true');
    signEl.style.left = '100%';
    signEl.style.marginLeft = '10px';
    signEl.style.top = `${signTop}px`;
    signEl.style.height = `${signHeight}px`;
    signEl.style.minWidth = '45px';
    signEl.innerHTML = `
        <span class="tracking-wider text-sm">EXIT</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
    `;

    gameContainerEl.appendChild(cutoutEl);
    gameContainerEl.appendChild(signEl);
}

function init() {
    const savedLevel = localStorage.getItem('block2lockLevel');
    const initialLevel = savedLevel ? parseInt(savedLevel, 10) : 0;
    
    setupEventListeners();

    // Defer initial calculation until after the first paint to ensure layout is complete
    requestAnimationFrame(() => {
        updateCellSize();
        loadLevel(initialLevel);
    });
}

// Start the game
init();