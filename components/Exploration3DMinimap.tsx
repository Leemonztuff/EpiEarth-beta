import React, { useMemo } from 'react';
import { DoorState, DungeonRoomGraph } from '../types';

interface MinimapProps {
    mapSize: number;
    playerPos: { x: number; z: number };
    enemies: { id: string; x: number; z: number; type: string; isDefeated: boolean }[];
    traps: { id: string; x: number; z: number; type: string; isArmed: boolean }[];
    targetPos?: { x: number; z: number } | null;
    roomGraph?: DungeonRoomGraph | null;
    doorStates?: Record<string, DoorState>;
    discoveredRooms?: string[];
    currentRoomId?: string | null;
}

function buildRoomPositions(roomIds: string[], size: number) {
    const radius = size * 0.36;
    const center = size / 2;
    return roomIds.reduce<Record<string, { x: number; y: number }>>((acc, roomId, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(1, roomIds.length);
        acc[roomId] = {
            x: center + Math.cos(angle) * radius,
            y: center + Math.sin(angle) * radius,
        };
        return acc;
    }, {});
}

export const Exploration3DMinimap: React.FC<MinimapProps> = ({
    mapSize,
    playerPos,
    enemies,
    traps,
    targetPos,
    roomGraph,
    doorStates,
    discoveredRooms = [],
    currentRoomId = null,
}) => {
    const minimapSize = 148;
    const cellSize = minimapSize / mapSize;

    const playerPixelX = playerPos.x * cellSize;
    const playerPixelZ = playerPos.z * cellSize;
    const targetPixelX = targetPos ? targetPos.x * cellSize : null;
    const targetPixelZ = targetPos ? targetPos.z * cellSize : null;

    const roomPositions = useMemo(() => {
        if (!roomGraph) return null;
        return buildRoomPositions(Object.keys(roomGraph.rooms), minimapSize);
    }, [roomGraph]);

    const isDungeonGraph = !!roomGraph && !!roomPositions;

    return (
        <div className="absolute bottom-4 left-4 bg-black/70 border border-white/30 rounded-lg p-2">
            <div className="text-xs font-bold text-white/80 mb-1">{isDungeonGraph ? 'Dungeon' : 'Mapa'}</div>
            <div className="relative bg-slate-900 border border-white/20 rounded" style={{ width: minimapSize, height: minimapSize }}>
                {isDungeonGraph && roomGraph && roomPositions ? (
                    <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${minimapSize} ${minimapSize}`}>
                        {Object.values(roomGraph.doors).map(door => {
                            const from = roomPositions[door.fromRoomId];
                            const to = roomPositions[door.toRoomId];
                            if (!from || !to) return null;
                            const state = doorStates?.[door.id] ?? door.state;
                            const color = state === 'open' ? '#22c55e' : state === 'locked' ? '#ef4444' : '#f59e0b';
                            return (
                                <line
                                    key={door.id}
                                    x1={from.x}
                                    y1={from.y}
                                    x2={to.x}
                                    y2={to.y}
                                    stroke={color}
                                    strokeWidth="2"
                                    strokeDasharray={state === 'open' ? '0' : '4,3'}
                                    opacity="0.8"
                                />
                            );
                        })}
                        {Object.values(roomGraph.rooms).map(room => {
                            const pos = roomPositions[room.id];
                            if (!pos) return null;
                            const discovered = discoveredRooms.includes(room.id) || room.id === currentRoomId;
                            return (
                                <g key={room.id}>
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={room.id === currentRoomId ? 8 : 6}
                                        fill={
                                            room.id === currentRoomId
                                                ? '#06b6d4'
                                                : discovered
                                                    ? (room.elite ? '#ef4444' : '#94a3b8')
                                                    : '#1e293b'
                                        }
                                        stroke={room.id === currentRoomId ? '#ffffff' : '#64748b'}
                                        strokeWidth="1.5"
                                    />
                                </g>
                            );
                        })}
                    </svg>
                ) : (
                    <>
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${minimapSize} ${minimapSize}`}>
                            {Array.from({ length: Math.ceil(mapSize / 5) + 1 }).map((_, i) => {
                                const pos = i * 5 * cellSize;
                                return (
                                    <g key={i}>
                                        <line x1={pos} y1="0" x2={pos} y2={minimapSize} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                                        <line x1="0" y1={pos} x2={minimapSize} y2={pos} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                                    </g>
                                );
                            })}
                            {targetPixelX !== null && targetPixelZ !== null && (
                                <>
                                    <line x1={playerPixelX} y1={playerPixelZ} x2={targetPixelX} y2={targetPixelZ} stroke="rgba(59, 130, 246, 0.5)" strokeWidth="1" strokeDasharray="2,2" />
                                    <circle cx={targetPixelX} cy={targetPixelZ} r="3" fill="rgba(59, 130, 246, 0.7)" stroke="rgba(59, 130, 246, 1)" strokeWidth="1" />
                                </>
                            )}
                        </svg>

                        {enemies.map(enemy => {
                            if (enemy.isDefeated) return null;
                            const eX = enemy.x * cellSize;
                            const eZ = enemy.z * cellSize;
                            return (
                                <div
                                    key={enemy.id}
                                    className="absolute w-1.5 h-1.5 bg-red-500 rounded-full"
                                    style={{ left: `${eX}px`, top: `${eZ}px`, transform: 'translate(-50%, -50%)' }}
                                />
                            );
                        })}

                        {traps.map(trap => {
                            if (!trap.isArmed) return null;
                            const tX = trap.x * cellSize;
                            const tZ = trap.z * cellSize;
                            return (
                                <div
                                    key={trap.id}
                                    className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                                    style={{ left: `${tX}px`, top: `${tZ}px`, transform: 'translate(-50%, -50%)' }}
                                />
                            );
                        })}

                        <div
                            className="absolute w-2 h-2 bg-cyan-400 rounded-full border border-white/80 animate-pulse"
                            style={{ left: `${playerPixelX}px`, top: `${playerPixelZ}px`, transform: 'translate(-50%, -50%)' }}
                        />
                    </>
                )}
            </div>

            <div className="text-[10px] text-white/60 mt-2 space-y-1">
                {isDungeonGraph ? (
                    <>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-cyan-400 rounded-full" /> Sala actual</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /> Elite</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-[2px] bg-amber-500" /> Puerta cerrada</div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" /> Jugador</div>
                        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Enemigos</div>
                        <div className="flex items-center gap-1"><div className="w-1 h-1 bg-yellow-400 rounded-full" /> Trampas</div>
                    </>
                )}
            </div>
        </div>
    );
};

