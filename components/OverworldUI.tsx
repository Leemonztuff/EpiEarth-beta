// @ts-nocheck
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { WorldGenerator } from '../services/WorldGenerator';
import { Dimension, WeatherType } from '../types';

const Compass: React.FC<{ playerPos: { x: number, y: number }, dimension: string }> = ({ playerPos, dimension }) => {
    const isVoid = dimension === Dimension.UPSIDE_DOWN;
    
    return (
        <div className="absolute top-4 right-4 z-[100]">
            <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center relative">
                <div className="absolute inset-1 rounded-full border border-white/5" />
                <div 
                    className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[20px] transition-transform duration-500"
                    style={{ 
                        borderBottomColor: isVoid ? '#a855f7' : '#f59e0b',
                        transform: `rotate(${(playerPos.x % 8) * 45}deg)`
                    }}
                />
                <div className="absolute text-[8px] font-bold text-white/60 -top-3">N</div>
                <div className="absolute text-[8px] font-bold text-white/40 -bottom-2">S</div>
                <div className="absolute text-[8px] font-bold text-white/40 -left-2">W</div>
                <div className="absolute text-[8px] font-bold text-white/40 -right-2">E</div>
            </div>
        </div>
    );
};

const MiniMap: React.FC<{ playerPos: { x: number, y: number }, dimension: string, exploredTiles: any }> = ({ playerPos, dimension, exploredTiles }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const size = 120;
        const scale = 3;
        canvas.width = size;
        canvas.height = size;
        
        ctx.fillStyle = '#0a0f1a';
        ctx.fillRect(0, 0, size, size);
        
        const currentExplored = exploredTiles[dimension] || new Set();
        const centerX = size / 2;
        const centerY = size / 2;
        
        currentExplored.forEach((key: string) => {
            const [q, r] = key.split(',').map(Number);
            const dx = (q - playerPos.x) * scale;
            const dy = (r - playerPos.y) * scale;
            
            if (Math.abs(dx) < size/2 && Math.abs(dy) < size/2) {
                const tile = WorldGenerator.getTile(q, r, dimension);
                ctx.fillStyle = tile?.terrain === 'WATER' ? '#1e3a5f' : 
                               tile?.terrain === 'FOREST' ? '#1a4a2a' :
                               tile?.terrain === 'MOUNTAIN' ? '#4a4a5a' : '#2a4a3a';
                ctx.beginPath();
                ctx.arc(centerX + dx, centerY + dy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fbbf2440';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.stroke();
        
    }, [playerPos, dimension, exploredTiles]);

    return (
        <div className="absolute bottom-4 left-4 z-[100]">
            <div className="w-[120px] h-[120px] rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
                <canvas ref={canvasRef} className="w-full h-full" />
            </div>
            <div className="text-[8px] text-white/40 text-center mt-1 font-mono">MINIMAP</div>
        </div>
    );
};

const CoordinateDisplay: React.FC<{ playerPos: { x: number, y: number }, dimension: string }> = ({ playerPos, dimension }) => {
    const tile = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
    
    return (
        <div className="absolute top-4 left-4 z-[100] bg-black/60 backdrop-blur-xl rounded-lg p-3 border border-white/10">
            <div className="flex items-center gap-3">
                <div className="text-amber-400 font-mono text-sm font-bold">
                    {playerPos.x}, {playerPos.y}
                </div>
                <div className="w-px h-4 bg-white/10" />
                <div className="text-white/60 text-xs">
                    {tile?.terrain || 'Unknown'}
                </div>
            </div>
            {tile?.poiType && (
                <div className="text-purple-400 text-xs mt-1 animate-pulse">
                    ✦ {tile.poiType}
                </div>
            )}
        </div>
    );
};

const DayNightIndicator: React.FC<{ worldTime: number }> = ({ worldTime }) => {
    const hours = Math.floor(worldTime / 60);
    const minutes = worldTime % 60;
    const isNight = hours < 6 || hours >= 22;
    const isDawn = hours >= 5 && hours < 8;
    const isDusk = hours >= 18 && hours < 22;
    
    let icon = '☀️';
    let color = 'text-yellow-400';
    if (isNight) { icon = '🌙'; color = 'text-blue-300'; }
    else if (isDawn) { icon = '🌅'; color = 'text-orange-400'; }
    else if (isDusk) { icon = '🌇'; color = 'text-red-400'; }
    
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-black/50 backdrop-blur-lg rounded-full px-4 py-1.5 border border-white/10">
            <span className="text-lg">{icon}</span>
            <span className={`font-mono text-sm font-bold ${color}`}>
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </span>
        </div>
    );
};

const ResourceDisplay: React.FC<{ gold: number, supplies: number, fatigue: number }> = ({ gold, supplies, fatigue }) => {
    return (
        <div className="absolute bottom-4 right-4 z-[100] flex gap-3">
            <div className="bg-black/60 backdrop-blur-xl rounded-lg px-3 py-2 border border-amber-500/30">
                <span className="text-amber-400 text-sm font-bold">💰 {gold}</span>
            </div>
            <div className="bg-black/60 backdrop-blur-xl rounded-lg px-3 py-2 border border-emerald-500/30">
                <span className={`text-sm font-bold ${supplies < 3 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                    📦 {supplies}
                </span>
            </div>
            <div className="bg-black/60 backdrop-blur-xl rounded-lg px-3 py-2 border border-red-500/30">
                <span className={`text-sm font-bold ${fatigue > 80 ? 'text-red-400' : 'text-red-300'}`}>
                    💨 {fatigue}%
                </span>
            </div>
        </div>
    );
};

const QuestPointer: React.FC<{ playerPos: { x: number, y: number }, dimension: string, quests: any[] }> = ({ playerPos, dimension, quests }) => {
    const activeQuest = quests?.find(q => q.status === 'ACTIVE');
    if (!activeQuest?.targetPos) return null;
    
    const [tq, tr] = activeQuest.targetPos.split(',').map(Number);
    const dx = tq - playerPos.x;
    const dy = tr - playerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 15) return null;
    
    const angle = Math.atan2(dy, dx);
    
    return (
        <div 
            className="absolute pointer-events-none z-[90]"
            style={{
                left: '50%',
                top: '50%',
                width: '200px',
                height: '200px',
                marginLeft: '-100px',
                marginTop: '-100px',
                transform: `rotate(${angle}rad)`,
            }}
        >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-pulse">
                <div className="text-2xl">🎯</div>
            </div>
        </div>
    );
};

const LocationName: React.FC<{ currentRegionName: string | null }> = ({ currentRegionName }) => {
    if (!currentRegionName) return null;
    
    return (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[100]">
            <div className="bg-gradient-to-r from-transparent via-black/70 to-transparent px-8 py-2">
                <div className="text-white/80 text-sm font-serif tracking-widest uppercase">
                    {currentRegionName}
                </div>
            </div>
        </div>
    );
};

export const OverworldUI: React.FC = () => {
    const playerPos = useGameStore(s => s.playerPos);
    const dimension = useGameStore(s => s.dimension);
    const exploredTiles = useGameStore(s => s.exploredTiles);
    const gold = useGameStore(s => s.gold);
    const supplies = useGameStore(s => s.supplies);
    const fatigue = useGameStore(s => s.fatigue);
    const worldTime = useGameStore(s => s.worldTime);
    const quests = useGameStore(s => s.quests);
    const currentRegionName = useGameStore(s => s.currentRegionName);
    const gameState = useGameStore(s => s.gameState);
    
    if (!gameState || (gameState !== 'OVERWORLD' && gameState !== 'TOWN_EXPLORATION' && gameState !== 'DUNGEON')) {
        return null;
    }
    
    return (
        <div className="fixed inset-0 pointer-events-none z-[90]">
            <CoordinateDisplay playerPos={playerPos} dimension={dimension} />
            <Compass playerPos={playerPos} dimension={dimension} />
            <DayNightIndicator worldTime={worldTime} />
            <MiniMap playerPos={playerPos} dimension={dimension} exploredTiles={exploredTiles} />
            <ResourceDisplay gold={gold || 0} supplies={supplies || 10} fatigue={fatigue || 0} />
            <QuestPointer playerPos={playerPos} dimension={dimension} quests={quests || []} />
            <LocationName currentRegionName={currentRegionName} />
        </div>
    );
};
