import React, { useRef, useState, useEffect } from 'react';
import type { Vehicle } from './types';
import { VehicleComponent } from './Vehicle';

export const Board = ({ levelIndex, vehicles, onMove, vehicleColors }) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [cellSize, setCellSize] = useState(50);
    const [boardReady, setBoardReady] = useState(false);

    useEffect(() => {
        const updateCellSize = () => {
            if (boardRef.current) {
                setCellSize(boardRef.current.offsetWidth / 6);
                setBoardReady(true);
            }
        };
        
        updateCellSize();
        const resizeObserver = new ResizeObserver(updateCellSize);
        if (boardRef.current) {
            resizeObserver.observe(boardRef.current);
        }

        return () => {
            if (boardRef.current) {
                resizeObserver.unobserve(boardRef.current);
            }
        };
    }, []);

    return (
        <div className="aspect-square w-full bg-slate-800 rounded-lg p-1 relative shadow-inner overflow-hidden" ref={boardRef}>
            {/* Grid background */}
            <div className="grid grid-cols-6 grid-rows-6 w-full h-full gap-1">
                {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="bg-slate-700/50 rounded-sm"></div>
                ))}
            </div>
            
            {/* Exit Path */}
            <div className="absolute right-0 h-[calc(100%/6-4px)] w-2 bg-green-500/50" style={{ top: `calc(100%/6*2+2px)` }} />


            {boardReady && vehicles.map((vehicle, index) => (
                <VehicleComponent 
                    key={`${levelIndex}-${index}`}
                    vehicle={vehicle}
                    index={index}
                    onMove={onMove}
                    cellSize={cellSize}
                    color={vehicleColors[index % vehicleColors.length]}
                    allVehicles={vehicles}
                 />
            ))}
        </div>
    );
};