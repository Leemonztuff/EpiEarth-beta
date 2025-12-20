
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { useContentStore } from '../store/contentStore';
import { WorldGenerator } from '../services/WorldGenerator';
import { TERRAIN_COLORS, NOISE_TEXTURE_URL, WESNOTH_BASE_URL } from '../constants';
import { TerrainType, EnemyDefinition, Quest } from '../types';

export const WorldMapScreen = () => {
    const { exploredTiles, dimension, playerPos, toggleMap, quests } = useGameStore();
    const { enemies } = useContentStore();
    const [activeTab, setActiveTab] = useState<'QUESTS' | 'BESTIARY'>('QUESTS');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scale, setScale] = useState(4);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    // FIXED: Convert quests Record to array for filtering
    const activeQuests = useMemo(() => 
        Object.values(quests as Record<string, Quest>).filter(q => !q.completed)
    , [quests]);

    // Lista de enemigos filtrada para el bestiario (excluyendo duplicados técnicos)
    const bestiaryList = useMemo(() => {
        const enemyArray = Object.values(enemies) as EnemyDefinition[];
        return enemyArray.filter((e, index, self) => 
            index === self.findIndex((t) => t.name === e.name)
        );
    }, [enemies]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const width = canvas.width = canvas.clientWidth;
        const height = canvas.height = canvas.clientHeight;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        const exploredSet = exploredTiles[dimension];
        const centerX = width / 2 + pan.x;
        const centerY = height / 2 + pan.y;

        exploredSet.forEach(key => {
            const [q, r] = key.split(',').map(Number);
            const relQ = q - playerPos.x;
            const relR = r - playerPos.y;
            const x = centerX + (relQ * scale * 1.5);
            const y = centerY + (relR * scale * 1.7);
            const xSkew = x + (relR * scale * 0.8);

            if (xSkew < 0 || xSkew > width || y < 0 || y > height) return;

            const tile = WorldGenerator.getTile(q, r, dimension);
            ctx.fillStyle = TERRAIN_COLORS[tile.terrain] || '#444';
            ctx.beginPath();
            ctx.arc(xSkew, y, scale * 0.6, 0, Math.PI * 2);
            ctx.fill();

            if (tile.terrain === TerrainType.VILLAGE || tile.terrain === TerrainType.CASTLE || tile.poiType) {
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(xSkew, y, scale * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
            if (tile.hasPortal) {
                ctx.fillStyle = '#a855f7';
                ctx.beginPath();
                ctx.arc(xSkew, y, scale * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, scale * 1.2, 0, Math.PI * 2);
        ctx.fill();

    }, [exploredTiles, dimension, playerPos, scale, pan]);

    const handleWheel = (e: React.WheelEvent) => {
        setScale(s => Math.max(1, Math.min(10, s + (e.deltaY > 0 ? -1 : 1))));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300 p-2 md:p-8">
            <div className="w-full max-w-6xl h-full max-h-[90vh] grid grid-cols-1 lg:grid-cols-3 gap-4 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative">
                
                <button onClick={toggleMap} className="absolute top-2 right-2 lg:top-4 lg:right-4 z-50 bg-slate-800 hover:bg-red-900 text-white rounded-full w-10 h-10 flex items-center justify-center border border-slate-600 transition-colors">✕</button>

                {/* LEFT: MAP CANVAS */}
                <div className="lg:col-span-2 relative bg-black border-r border-slate-700 h-[50vh] lg:h-auto">
                    <div className="absolute top-4 left-4 z-10 bg-black/50 px-3 py-1 rounded border border-white/10 text-[10px] text-slate-300">
                        <span className="text-amber-400 font-bold uppercase tracking-wider">{dimension} REALM</span>
                    </div>
                    <canvas ref={canvasRef} className="w-full h-full cursor-move touch-none" onWheel={handleWheel} />
                </div>

                {/* RIGHT: TABS AND CONTENT */}
                <div className="bg-slate-900 flex flex-col h-[40vh] lg:h-auto border-t lg:border-t-0 lg:border-l border-slate-700 relative">
                    <div className="flex bg-slate-950/50 border-b border-slate-800">
                        <button 
                            onClick={() => setActiveTab('QUESTS')}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'QUESTS' ? 'text-amber-500 bg-slate-900' : 'text-slate-500'}`}
                        >
                            📜 Quests
                        </button>
                        <button 
                            onClick={() => setActiveTab('BESTIARY')}
                            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'BESTIARY' ? 'text-red-500 bg-slate-900' : 'text-slate-500'}`}
                        >
                            💀 Bestiary
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {activeTab === 'QUESTS' ? (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest border-b border-amber-500/20 pb-1">Active Objectives</h3>
                                {activeQuests.length === 0 ? (
                                    <p className="text-sm text-slate-500 italic">No active quests.</p>
                                ) : (
                                    activeQuests.map(q => (
                                        <div key={q.id} className="bg-black/20 p-3 rounded-lg border border-white/5">
                                            <h4 className="text-slate-200 font-serif font-bold text-sm">{q.title}</h4>
                                            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{q.description}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-widest border-b border-red-500/20 pb-1">Known Threats</h3>
                                {bestiaryList.map((mob: EnemyDefinition) => (
                                    <div key={mob.id} className="bg-slate-950/50 p-3 rounded-xl border border-white/5 flex gap-3 items-center group hover:border-red-500/30 transition-all">
                                        <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center border border-slate-800 shrink-0 overflow-hidden">
                                            <img 
                                                src={mob.sprite.startsWith('http') ? mob.sprite : `${WESNOTH_BASE_URL}/${mob.sprite}`} 
                                                className="w-10 h-10 object-contain pixelated" 
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-white font-bold text-xs uppercase tracking-tighter">{mob.name}</h4>
                                                <span className="text-[8px] text-red-400 font-black">{mob.type}</span>
                                            </div>
                                            <div className="flex gap-3 mt-1 opacity-60">
                                                <div className="text-[9px] font-mono text-green-400">HP {mob.hp}</div>
                                                <div className="text-[9px] font-mono text-blue-400">AC {mob.ac}</div>
                                                <div className="text-[9px] font-mono text-amber-400">XP {mob.xpReward}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
