
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { DAMAGE_ICONS } from '../constants';

export const InspectionPanel = () => {
    const { inspectedEntityId, party } = useGameStore();
    
    if (!inspectedEntityId) return null;
    
    const entity = party.find(p => p.id === inspectedEntityId);
    if (!entity) return null;

    const stats = entity.stats;

    const closePanel = () => {
        useGameStore.setState({ inspectedEntityId: null });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={closePanel}>
            <div className="bg-slate-900 border-2 border-amber-600/50 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 border-b border-amber-600/30 flex gap-6 items-center relative">
                    <button onClick={closePanel} className="absolute top-2 right-2 text-slate-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-800">✕</button>
                    
                    <div className="w-20 h-20 bg-black/50 rounded-lg border border-slate-600 flex items-center justify-center relative overflow-hidden shrink-0 shadow-inner">
                        <img src={entity.visual?.spriteUrl} className="w-16 h-16 object-contain pixelated relative z-10" />
                        <div className="absolute inset-0 opacity-20 bg-blue-600" />
                    </div>
                    
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-serif font-bold text-amber-100">{entity.name}</h2>
                        </div>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[10px] uppercase tracking-widest font-bold bg-slate-950 px-2 py-1 rounded text-slate-400 border border-slate-700">
                                {stats.race || 'Unknown'}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest font-bold bg-slate-950 px-2 py-1 rounded text-slate-400 border border-slate-700">
                                Lvl {stats.level}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest font-bold bg-amber-950 px-2 py-1 rounded text-amber-400 border border-amber-700">
                                {stats.class}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 bg-slate-900/95 space-y-6">
                    
                    {/* Vitals */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 p-3 rounded border border-slate-800 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">Health</span>
                            <span className="text-lg font-mono font-bold text-green-400">{stats.hp} <span className="text-slate-600 text-sm">/ {stats.maxHp}</span></span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded border border-slate-800 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 uppercase">XP</span>
                            <span className="text-lg font-mono font-bold text-purple-400">{stats.xp} <span className="text-slate-600 text-sm">/ {stats.xpToNextLevel}</span></span>
                        </div>
                    </div>

                    {/* Base Attributes */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-serif font-bold text-amber-500 border-b border-amber-900/30 pb-1">Attributes</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map(attr => (
                                <div key={attr} className="bg-slate-950/50 p-2 rounded border border-slate-800 flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{attr}</span>
                                    <span className="text-lg font-mono font-bold text-white">{stats.baseAttributes?.[attr] || 10}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
                
                <div className="bg-slate-950 p-3 text-center">
                    <p className="text-[10px] text-slate-600"> party member details </p>
                </div>
            </div>
        </div>
    );
};
