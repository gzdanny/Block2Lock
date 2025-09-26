
import React, { useState, useEffect, useCallback } from 'react';
import { levels } from './levels';
import { Board } from './Board';
import type { Vehicle } from './types';

const vehicleColors = [
  'bg-red-600', // Player's car
  'bg-cyan-600',
  'bg-sky-700',
  'bg-cyan-800',
  'bg-sky-600',
  'bg-cyan-700',
  'bg-sky-800',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-slate-500',
];

const Controls = ({ onReset, onPrev, onNext, levelIndex, maxLevel }) => (
    <div className="flex justify-center items-center gap-4 mt-6">
        <button onClick={onPrev} disabled={levelIndex === 0} className="px-4 py-2 bg-slate-700 rounded-md disabled:opacity-50 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500">Prev</button>
        <button onClick={onReset} className="px-4 py-2 bg-slate-700 rounded-md hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500">Reset</button>
        <button onClick={onNext} disabled={levelIndex === maxLevel - 1} className="px-4 py-2 bg-slate-700 rounded-md disabled:opacity-50 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500">Next</button>
    </div>
);

const WinModal = ({ isOpen, moves, onNextLevel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50" role="dialog" aria-modal="true">
            <div className="bg-slate-800 p-8 rounded-lg text-center shadow-2xl animate-fade-in">
                <h2 className="text-4xl font-bold text-green-400 mb-4">You Win!</h2>
                <p className="text-lg mb-6">You solved the puzzle in {moves} moves.</p>
                <button onClick={onNextLevel} className="px-6 py-3 bg-green-600 rounded-md text-white font-semibold hover:bg-green-500 transition-colors focus:outline-none focus:ring-2 focus:ring-green-400">Next Level</button>
            </div>
            <style>{`
              @keyframes fade-in {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
              }
              .animate-fade-in { animation: fade-in 0.3s ease-out; }
            `}</style>
        </div>
    );
};

export default function App() {
    const [levelIndex, setLevelIndex] = useState(() => {
        const savedLevel = localStorage.getItem('rushHourLevel');
        return savedLevel ? parseInt(savedLevel, 10) : 0;
    });
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [moves, setMoves] = useState(0);
    const [isWon, setIsWon] = useState(false);

    const loadLevel = useCallback((index: number) => {
        const levelData = JSON.parse(JSON.stringify(levels[index % levels.length]));
        setVehicles(levelData);
        setMoves(0);
        setIsWon(false);
    }, []);

    useEffect(() => {
        loadLevel(levelIndex);
    }, [levelIndex, loadLevel]);

    useEffect(() => {
        localStorage.setItem('rushHourLevel', levelIndex.toString());
    }, [levelIndex]);

    const handleReset = useCallback(() => {
        loadLevel(levelIndex);
    }, [levelIndex, loadLevel]);

    const handleNextLevel = useCallback(() => {
        if (levelIndex < levels.length - 1) {
            setLevelIndex(prev => prev + 1);
        }
    }, [levelIndex]);
    
    const handlePrevLevel = useCallback(() => {
        if (levelIndex > 0) {
            setLevelIndex(prev => prev - 1);
        }
    }, [levelIndex]);

    const checkWinCondition = useCallback((updatedVehicles: Vehicle[]) => {
        const redCar = updatedVehicles[0];
        // The win condition is met if the red car's rightmost edge has reached or passed column 6.
        if (redCar.hz && redCar.x + redCar.length >= 6) {
            setIsWon(true);
        }
    }, []);

    const handleMove = useCallback((vehicleIndex: number, newX: number, newY: number) => {
        const currentVehicle = vehicles[vehicleIndex];
        
        if(isWon || (currentVehicle.x === newX && currentVehicle.y === newY)) return;

        // Boundary checks
        if (currentVehicle.hz) {
            if (newX < 0 || newX > 6 - currentVehicle.length) return;
        } else {
            if (newY < 0 || newY > 6 - currentVehicle.length) return;
        }

        const grid = Array(6).fill(null).map(() => Array(6).fill(false));
        
        vehicles.forEach((v, i) => {
            if (i === vehicleIndex) return;
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

        let isValidMove = true;
        if (currentVehicle.hz) {
            const y = currentVehicle.y;
            const startX = Math.min(currentVehicle.x, newX);
            const endX = Math.max(currentVehicle.x, newX);
            // Check all cells the vehicle will pass through
            for (let x = startX; x <= endX + currentVehicle.length - 1; x++) {
                 // Skip the cells the vehicle currently occupies
                if (x >= currentVehicle.x && x < currentVehicle.x + currentVehicle.length) continue;
                if (y < 0 || y >= 6 || x < 0 || x >= 6) continue; // Boundary check
                if (grid[y][x]) {
                    isValidMove = false;
                    break;
                }
            }
        } else {
            const x = currentVehicle.x;
            const startY = Math.min(currentVehicle.y, newY);
            const endY = Math.max(currentVehicle.y, newY);
            for (let y = startY; y <= endY + currentVehicle.length - 1; y++) {
                if (y >= currentVehicle.y && y < currentVehicle.y + currentVehicle.length) continue;
                if (y < 0 || y >= 6 || x < 0 || x >= 6) continue; // Boundary check
                if (grid[y][x]) {
                    isValidMove = false;
                    break;
                }
            }
        }

        if (isValidMove) {
            const newVehicles = vehicles.map((v, i) => 
                i === vehicleIndex ? { ...v, x: newX, y: newY } : v
            );
            setVehicles(newVehicles);
            setMoves(m => m + 1);
            checkWinCondition(newVehicles);
        }
    }, [vehicles, isWon, checkWinCondition]);

    return (
        <>
            <main className="min-h-screen flex flex-col items-center justify-center p-4 font-sans">
                <div className="w-full max-w-lg md:max-w-xl lg:max-w-2xl">
                    <header className="text-center mb-4">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-200">Rush Hour</h1>
                        <div className="flex justify-between items-center mt-4 text-lg text-slate-400 px-2">
                            <span>Level: {levelIndex + 1}</span>
                            <span>Moves: {moves}</span>
                        </div>
                    </header>
                    <Board 
                        levelIndex={levelIndex}
                        vehicles={vehicles} 
                        onMove={handleMove} 
                        vehicleColors={vehicleColors}
                    />
                    <Controls 
                        onReset={handleReset} 
                        onPrev={handlePrevLevel} 
                        onNext={handleNextLevel} 
                        levelIndex={levelIndex} 
                        maxLevel={levels.length} 
                    />
                </div>
                <WinModal isOpen={isWon} moves={moves} onNextLevel={handleNextLevel} />
            </main>
            <style>{`
                .player-car-pattern {
                    background-image: linear-gradient(45deg, rgba(0, 0, 0, 0.15) 25%, transparent 25%, transparent 50%, rgba(0, 0, 0, 0.15) 50%, rgba(0, 0, 0, 0.15) 75%, transparent 75%, transparent);
                    background-size: 16px 16px;
                }
            `}</style>
        </>
    );
}