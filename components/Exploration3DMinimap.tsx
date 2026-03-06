import React, { useMemo } from 'react';

interface MinimapProps {
    mapSize: number;
    playerPos: { x: number; z: number };
    enemies: { id: string; x: number; z: number; type: string; isDefeated: boolean }[];
    traps: { id: string; x: number; z: number; type: string; isArmed: boolean }[];
    targetPos?: { x: number; z: number } | null;
}

export const Exploration3DMinimap: React.FC<MinimapProps> = ({ mapSize, playerPos, enemies, traps, targetPos }) => {
    const minimapSize = 120;
    const cellSize = minimapSize / mapSize;
    
    const playerPixelX = playerPos.x * cellSize;
    const playerPixelZ = playerPos.z * cellSize;
    
    const targetPixelX = targetPos ? targetPos.x * cellSize : null;
    const targetPixelZ = targetPos ? targetPos.z * cellSize : null;

    return (
        <div className="absolute bottom-4 left-4 bg-black/70 border border-white/30 rounded-lg p-2">
            <div className="text-xs font-bold text-white/80 mb-1">Mapa</div>
            <div 
                className="relative bg-slate-900 border border-white/20 rounded"
                style={{ width: minimapSize, height: minimapSize }}
            >
                {/* Grid background */}
                <svg 
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${minimapSize} ${minimapSize}`}
                >
                    {/* Draw grid lines */}
                    {Array.from({ length: Math.ceil(mapSize / 5) + 1 }).map((_, i) => {
                        const pos = i * 5 * cellSize;
                        return (
                            <g key={i}>
                                <line x1={pos} y1="0" x2={pos} y2={minimapSize} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                                <line x1="0" y1={pos} x2={minimapSize} y2={pos} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                            </g>
                        );
                    })}
                    
                    {/* Target direction line */}
                    {targetPixelX !== null && targetPixelZ !== null && (
                        <>
                            <line
                                x1={playerPixelX}
                                y1={playerPixelZ}
                                x2={targetPixelX}
                                y2={targetPixelZ}
                                stroke="rgba(59, 130, 246, 0.5)"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                            />
                            <circle
                                cx={targetPixelX}
                                cy={targetPixelZ}
                                r="3"
                                fill="rgba(59, 130, 246, 0.7)"
                                stroke="rgba(59, 130, 246, 1)"
                                strokeWidth="1"
                            />
                        </>
                    )}
                </svg>

                {/* Enemies */}
                {enemies.map(enemy => {
                    if (enemy.isDefeated) return null;
                    const eX = enemy.x * cellSize;
                    const eZ = enemy.z * cellSize;
                    return (
                        <div
                            key={enemy.id}
                            className="absolute w-1.5 h-1.5 bg-red-500 rounded-full"
                            style={{
                                left: `${eX}px`,
                                top: `${eZ}px`,
                                transform: 'translate(-50%, -50%)'
                            }}
                            title={`Enemigo en ${enemy.x}, ${enemy.z}`}
                        />
                    );
                })}

                {/* Traps */}
                {traps.map(trap => {
                    if (!trap.isArmed) return null;
                    const tX = trap.x * cellSize;
                    const tZ = trap.z * cellSize;
                    return (
                        <div
                            key={trap.id}
                            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                            style={{
                                left: `${tX}px`,
                                top: `${tZ}px`,
                                transform: 'translate(-50%, -50%)'
                            }}
                            title={`Trampa ${trap.type} en ${trap.x}, ${trap.z}`}
                        />
                    );
                })}

                {/* Player */}
                <div
                    className="absolute w-2 h-2 bg-cyan-400 rounded-full border border-white/80 animate-pulse"
                    style={{
                        left: `${playerPixelX}px`,
                        top: `${playerPixelZ}px`,
                        transform: 'translate(-50%, -50%)'
                    }}
                    title={`Jugador en ${playerPos.x}, ${playerPos.z}`}
                />
            </div>

            {/* Legend */}
            <div className="text-[10px] text-white/60 mt-2 space-y-1">
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" /> Jugador
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Enemigos
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-yellow-400 rounded-full" /> Trampas
                </div>
            </div>
        </div>
    );
};
