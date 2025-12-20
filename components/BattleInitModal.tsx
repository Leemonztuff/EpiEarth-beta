
import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameState, Dimension } from '../types';
import { sfx } from '../services/SoundSystem';

export const BattleInitModal = () => {
    const { battleEntities, confirmBattle, gameState, battleIntroText, dimension } = useGameStore();
    
    if (gameState !== GameState.BATTLE_INIT) return null;

    const enemies = battleEntities?.filter(e => e.type === 'ENEMY') || [];
    const boss = enemies[0];
    const enemyCount = enemies.length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto p-4">
            <div className="relative w-full max-w-lg bg-slate-900 border-2 border-red-900 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.3)] flex flex-col">
                <div className="bg-gradient-to-r from-red-950 via-red-900 to-red-950 p-6 text-center border-b border-red-700 relative">
                    <h2 className="text-3xl font-serif font-black text-red-100 tracking-widest uppercase">ENEMIES AHEAD</h2>
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-600 text-[8px] font-black px-3 py-1 rounded text-white uppercase tracking-[0.2em]">Combat Impending</div>
                </div>
                
                <div className="p-8 flex flex-col items-center justify-center bg-slate-800/50">
                    <div className="text-center mb-8 px-4">
                        <p className="text-slate-300 font-serif italic text-lg leading-relaxed">
                            "{battleIntroText}"
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-4 mb-10">
                        <div className="relative group">
                            <div className="absolute inset-0 bg-red-600/20 blur-xl rounded-full group-hover:bg-red-600/40 transition-all duration-500 animate-pulse" />
                            <div className="relative w-28 h-28 bg-slate-950 rounded-full border-4 border-red-600 shadow-[0_0_20px_#dc2626] flex items-center justify-center overflow-hidden">
                                <span className="text-5xl group-hover:scale-125 transition-transform duration-500">💀</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-white mb-1">{boss?.name || "Ambush!"}</h3>
                            <p className="text-red-400 text-[10px] font-black uppercase tracking-[0.3em]">
                                {enemyCount > 1 ? `Warband of ${enemyCount}` : 'Elite Threat'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 w-full">
                        <button 
                            onClick={() => { sfx.playAttack(); confirmBattle(); }} 
                            className="group relative w-full py-5 bg-red-700 hover:bg-red-600 text-white font-black text-xl uppercase tracking-[0.3em] rounded-lg shadow-lg transition-all transform active:scale-95 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            ⚔️ TO ARMS
                        </button>
                        <div className="text-center">
                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Victory provides Experience and Loot</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
