
import React, { useRef, useState, useEffect } from 'react';
import type { Vehicle } from './types';
import { VehicleComponent } from './Vehicle';

export const Board = ({ levelIndex, vehicles, onMove, vehicleColors }) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [cellSize, setCellSize] = useState(0);
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
                // eslint-disable-next-line react-hooks/exhaustive-deps
                resizeObserver.unobserve(boardRef.current);
            }
        };
    }, []);

    // This cellSize from state is slightly larger than the actual grid cell width
    // because it's based on the container's full width, which includes padding and gaps.
    // Let's calculate the actual cell size for precise positioning.
    // board width = 6 * actualCellSize + 5 * gap(4px) + 2 * padding(4px)
    // 6 * cellSize = 6 * actualCellSize + 20px + 8px
    // actualCellSize = cellSize - 28/6
    const actualCellSize = cellSize > 0 ? cellSize - (28 / 6) : 0;

    // The height of the cutout should be 1.4x the *actual* cell size.
    const cutoutHeight = actualCellSize * 1.4;

    // The vertical center of the exit lane (row index 2) relative to the main container's top edge.
    // Calculation: 8px (main container p-2) + 4px (inner board p-1) + 2 * (full lane height) + (half cell height)
    // A full lane's height = actualCellSize + 4px_gap
    // CenterY = 12 + 2 * (actualCellSize + 4) + actualCellSize / 2
    // CenterY = 12 + 2 * actualCellSize + 8 + 0.5 * actualCellSize = 20 + 2.5 * actualCellSize
    const exitLaneCenterY = 20 + 2.5 * actualCellSize;

    // Position the cutout's top so its center aligns with exitLaneCenterY
    const cutoutTop = exitLaneCenterY - (cutoutHeight / 2);

    // Position the sign's top so its center also aligns
    const signHeight = actualCellSize > 4 ? actualCellSize - 4 : 0;
    const signTop = exitLaneCenterY - (signHeight / 2);


    return (
        <div className="p-2 bg-slate-600 rounded-lg relative shadow-lg mr-16">
            <div className="aspect-square w-full bg-slate-800 rounded-md p-1 relative shadow-inner overflow-hidden" ref={boardRef}>
                {/* Grid background */}
                <div className="grid grid-cols-6 grid-rows-6 w-full h-full gap-1">
                    {Array.from({ length: 36 }).map((_, i) => (
                        <div key={i} className="bg-slate-700/50 rounded-sm"></div>
                    ))}
                </div>

                {boardReady && vehicles.map((vehicle, index) => (
                    <VehicleComponent 
                        key={`${levelIndex}-${index}`}
                        vehicle={vehicle}
                        index={index}
                        onMove={onMove}
                        cellSize={cellSize}
                        color={vehicleColors[index % vehicleColors.length]}
                        allVehicles={vehicles}
                        isPlayer={index === 0}
                    />
                ))}
            </div>
             {/* Exit Cutout in Frame & Sign */}
             {boardReady && (
                <>
                    <div 
                        className="absolute right-0 w-2 bg-slate-900" 
                        style={{
                            height: `${cutoutHeight}px`,
                            top: `${cutoutTop}px`,
                        }}
                    />
                    <div
                        className="absolute flex flex-col items-center justify-center bg-green-700 text-white font-bold rounded-md px-2 py-1 shadow-lg text-xs"
                        style={{
                            left: '100%',
                            marginLeft: '10px',
                            top: `${signTop}px`,
                            height: `${signHeight}px`,
                            minWidth: '45px',
                        }}
                        aria-hidden="true"
                    >
                       <span className="tracking-wider text-sm">EXIT</span>
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                       </svg>
                    </div>
                </>
            )}
        </div>
    );
};