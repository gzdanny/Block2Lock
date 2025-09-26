import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Vehicle } from './types';

export const VehicleComponent = ({ vehicle, index, onMove, cellSize, color, allVehicles }) => {
    const [isDragging, setIsDragging] = useState(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const vehicleRef = useRef<HTMLDivElement>(null);

    const getDragBounds = useCallback(() => {
        const grid = Array(6).fill(null).map(() => Array(6).fill(false));
        allVehicles.forEach((v, i) => {
            if (i === index) return;
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
                if (grid[vehicle.y][x]) {
                    maxX = x - vehicle.length;
                    break;
                }
            }
            return { min: (minX - vehicle.x) * cellSize, max: (maxX - vehicle.x) * cellSize };
        } else {
            let minY = 0;
            for (let y = vehicle.y - 1; y >= 0; y--) {
                if (grid[y][vehicle.x]) {
                    minY = y + 1;
                    break;
                }
            }
            let maxY = 6 - vehicle.length;
            for (let y = vehicle.y + vehicle.length; y < 6; y++) {
                if (grid[y][vehicle.x]) {
                    maxY = y - vehicle.length;
                    break;
                }
            }
            return { min: (minY - vehicle.y) * cellSize, max: (maxY - vehicle.y) * cellSize };
        }
    }, [allVehicles, vehicle, index, cellSize]);

    const handleInteractionStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        const event = e.touches ? e.touches[0] : e;
        dragStartPos.current = {
            x: event.clientX,
            y: event.clientY,
        };
        document.body.style.cursor = 'grabbing';
        if(vehicleRef.current) vehicleRef.current.style.transition = 'none';
    };

    const handleInteractionMove = useCallback((e) => {
        if (!isDragging || !vehicleRef.current) return;
        const event = e.touches ? e.touches[0] : e;
        
        const deltaX = event.clientX - dragStartPos.current.x;
        const deltaY = event.clientY - dragStartPos.current.y;
        
        const bounds = getDragBounds();

        if (vehicle.hz) {
            const clampedDeltaX = Math.max(bounds.min, Math.min(deltaX, bounds.max));
            vehicleRef.current.style.transform = `translateX(${clampedDeltaX}px)`;
        } else {
            const clampedDeltaY = Math.max(bounds.min, Math.min(deltaY, bounds.max));
            vehicleRef.current.style.transform = `translateY(${clampedDeltaY}px)`;
        }
    }, [isDragging, vehicle, getDragBounds]);
    
    const handleInteractionEnd = useCallback(() => {
        if (!isDragging || !vehicleRef.current) return;
        
        const transform = vehicleRef.current.style.transform;
        const transformValue = (transform.match(/-?\d+\.?\d*/g) || ['0'])[0];
        const delta = Number(transformValue);

        let newX = vehicle.x;
        let newY = vehicle.y;

        if (vehicle.hz) {
            newX = Math.round((vehicle.x * cellSize + delta) / cellSize);
        } else {
            newY = Math.round((vehicle.y * cellSize + delta) / cellSize);
        }

        setIsDragging(false);
        document.body.style.cursor = 'default';
        if(vehicleRef.current) {
            vehicleRef.current.style.transition = 'transform 0.2s ease';
            vehicleRef.current.style.transform = 'translate(0, 0)';
        }
        
        onMove(index, newX, newY);
    }, [isDragging, vehicle, cellSize, onMove, index]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleInteractionMove);
            window.addEventListener('mouseup', handleInteractionEnd);
            window.addEventListener('touchmove', handleInteractionMove);
            window.addEventListener('touchend', handleInteractionEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleInteractionMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
            window.removeEventListener('touchmove', handleInteractionMove);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
    }, [isDragging, handleInteractionMove, handleInteractionEnd]);

    return (
        <div 
            ref={vehicleRef}
            onMouseDown={handleInteractionStart}
            onTouchStart={handleInteractionStart}
            className={`absolute rounded-md flex items-center justify-center font-bold text-white/50 shadow-lg cursor-grab ${isDragging ? 'z-10 shadow-2xl' : ''} ${color}`}
            style={{
                width: vehicle.hz ? `calc(100%/6 * ${vehicle.length} - 4px)` : `calc(100%/6 - 4px)`,
                height: vehicle.hz ? `calc(100%/6 - 4px)` : `calc(100%/6 * ${vehicle.length} - 4px)`,
                top: `calc(100%/6 * ${vehicle.y} + 2px)`,
                left: `calc(100%/6 * ${vehicle.x} + 2px)`,
                transition: 'top 0.2s ease, left 0.2s ease, transform 0.2s ease',
            }}
            aria-label={`Vehicle at column ${vehicle.x + 1}, row ${vehicle.y + 1} of length ${vehicle.length}, oriented ${vehicle.hz ? 'horizontally' : 'vertically'}`}
        >
        </div>
    );
};