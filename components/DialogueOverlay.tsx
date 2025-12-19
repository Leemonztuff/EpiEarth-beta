
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { GameState, NPCEntity } from '../types';

export const DialogueOverlay: React.FC = () => {
    const { gameState, setGameState, activeNarrativeEvent } = useGameStore();

    if (gameState !== GameState.DIALOGUE || !activeNarrativeEvent) return null;

    const npc: NPCEntity = activeNarrativeEvent.npc;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-end p-6 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-3xl bg-slate-900 border-2 border-amber-600/50 rounded-2xl p-8 shadow-2xl relative animate-in slide-in-from-bottom-10">
                {/* Sprite del NPC */}
                <div className="absolute -top-24 left-10 w-32 h-32 bg-slate-950 rounded-xl border border-amber-500/30 overflow-hidden flex items-center justify-center shadow-2xl">
                    <img src={npc.sprite} className="w-24 h-24 object-contain pixelated" />
                </div>

                <div className="ml-36">
                    <h3 className="text-amber-500 font-black uppercase tracking-widest text-sm mb-1">{npc.name}</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-4 tracking-tighter">{npc.role}</p>
                    
                    <p className="text-white text-lg font-serif leading-relaxed italic mb-8">
                        "{npc.dialogue[0]}"
                    </p>

                    <div className="flex flex-col gap-3">
                        {activeNarrativeEvent.options.map((opt: any, i: number) => (
                            <button 
                                key={i}
                                onClick={() => {
                                    if (opt.quest) useGameStore.getState().addQuest(opt.quest);
                                    setGameState(GameState.OVERWORLD);
                                }}
                                className="w-full text-left bg-slate-950 border border-slate-800 hover:border-amber-500 p-4 rounded-xl text-slate-300 hover:text-white transition-all group flex justify-between items-center"
                            >
                                <span className="font-bold">{opt.label}</span>
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black text-amber-500">Continuar →</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
