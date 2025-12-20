
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameState, NPCEntity, DialogueNode, DialogueOption } from '../types';
import { sfx } from '../services/SoundSystem';

export const DialogueOverlay: React.FC = () => {
    const { 
        gameState, setGameState, activeNarrativeEvent, resolveNarrativeOption, 
        addQuest, quests, addLog, addGold, addPartyXp, saveGame
    } = useGameStore();
    
    const [lineIndex, setLineIndex] = useState(0);
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);

    // Sync internal state with store on open
    useEffect(() => {
        if (activeNarrativeEvent?.currentNodeId) {
            setCurrentNodeId(activeNarrativeEvent.currentNodeId);
        }
    }, [activeNarrativeEvent]);

    if (gameState !== GameState.DIALOGUE || !activeNarrativeEvent) return null;

    const npc: NPCEntity = activeNarrativeEvent.npc;
    const isBranching = !!npc.dialogueNodes && currentNodeId !== null;

    // Traversal logic for branching dialogue
    const handleOptionSelect = (option: DialogueOption) => {
        sfx.playUiClick();

        // 1. Handle Quest Triggers
        if (option.questTriggerId && !quests[option.questTriggerId]) {
            // This is a simplification; in a real app, quest data would come from contentStore
            addQuest({
                id: option.questTriggerId,
                title: "Venture into the Rift",
                description: `The ${npc.role} has tasked you with investigating the spatial anomalies.`,
                completed: false,
                type: 'MAIN',
                objective: { type: 'KILL', targetId: 'ANY', count: 5, current: 0 },
                reward: { xp: 1000, gold: 500 }
            });
            addLog(`Quest Started: Venture into the Rift`, "narrative");
        }

        // 2. Handle System Actions
        if (option.action) {
            switch(option.action) {
                case 'CLOSE':
                    setGameState(GameState.OVERWORLD);
                    break;
                case 'SAVE':
                    saveGame();
                    break;
                case 'REST':
                    // Trigger camping logic manually or close and let player use UI
                    setGameState(GameState.OVERWORLD);
                    break;
                case 'REWARD':
                    addGold(100);
                    addPartyXp(200);
                    addLog("Received a small token of gratitude.", "info");
                    break;
            }
        }

        // 3. Move to next node or exit
        if (option.nextNodeId && npc.dialogueNodes?.[option.nextNodeId]) {
            setCurrentNodeId(option.nextNodeId);
        } else if (!option.action || option.action === 'CLOSE') {
            setGameState(GameState.OVERWORLD);
        }
    };

    // Helper for legacy linear dialogue
    const isLastLegacyLine = lineIndex >= (npc.dialogue?.length || 0) - 1;
    const handleLegacyNext = () => {
        if (!isBranching && !isLastLegacyLine) {
            setLineIndex(lineIndex + 1);
        }
    };

    const renderContent = () => {
        if (isBranching) {
            const node = npc.dialogueNodes![currentNodeId!];
            return (
                <>
                    <div className="min-h-[80px]">
                        <p className="text-white text-lg font-serif leading-relaxed italic mb-8">
                            "{node.text}"
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        {node.options.map((opt, i) => (
                            <button 
                                key={i}
                                onClick={() => handleOptionSelect(opt)}
                                className="w-full text-left bg-slate-950 border border-slate-800 hover:border-amber-500 p-4 rounded-xl text-slate-300 hover:text-white transition-all group flex justify-between items-center"
                            >
                                <span className="font-bold">{opt.label}</span>
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black text-amber-500">Select →</span>
                            </button>
                        ))}
                    </div>
                </>
            );
        }

        // Legacy rendering
        return (
            <>
                <div className="min-h-[80px]">
                    <p className="text-white text-lg font-serif leading-relaxed italic mb-8">
                        "{npc.dialogue[lineIndex]}"
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    {!isLastLegacyLine ? (
                        <button 
                            onClick={handleLegacyNext}
                            className="w-full text-right bg-slate-950 border border-slate-800 hover:border-amber-500 p-4 rounded-xl text-slate-300 hover:text-white transition-all group flex justify-between items-center"
                        >
                            <span className="font-bold">Next</span>
                            <span className="text-[10px] uppercase font-black text-amber-500">Continue →</span>
                        </button>
                    ) : (
                        activeNarrativeEvent.options?.map((opt: any, i: number) => (
                            <button 
                                key={i}
                                onClick={() => {
                                    if (opt.action) opt.action();
                                    setGameState(GameState.OVERWORLD);
                                    setLineIndex(0);
                                }}
                                className="w-full text-left bg-slate-950 border border-slate-800 hover:border-amber-500 p-4 rounded-xl text-slate-300 hover:text-white transition-all group flex justify-between items-center"
                            >
                                <span className="font-bold">{opt.label}</span>
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black text-amber-500">Select →</span>
                            </button>
                        ))
                    )}
                </div>
            </>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-end p-6 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-3xl bg-slate-900 border-2 border-amber-600/50 rounded-2xl p-8 shadow-2xl relative animate-in slide-in-from-bottom-10">
                {/* Sprite del NPC */}
                <div className="absolute -top-24 left-10 w-32 h-32 bg-slate-950 rounded-xl border border-amber-500/30 overflow-hidden flex items-center justify-center shadow-2xl">
                    <img src={npc.sprite} className="w-24 h-24 object-contain pixelated" alt={npc.name} />
                </div>

                <div className="ml-36">
                    <h3 className="text-amber-500 font-black uppercase tracking-widest text-sm mb-1">{npc.name}</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-4 tracking-tighter">{npc.role}</p>
                    
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
