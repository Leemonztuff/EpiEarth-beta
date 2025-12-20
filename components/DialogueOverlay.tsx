
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameState, NPCEntity, DialogueNode, DialogueOption, Quest } from '../types';
import { sfx } from '../services/SoundSystem';
import { AssetManager } from '../services/AssetManager';
import { GeminiService } from '../services/GeminiService';

export const DialogueOverlay: React.FC = () => {
    const { 
        gameState, setGameState, activeNarrativeEvent, resolveNarrativeOption, 
        addQuest, quests, addLog, addGold, addPartyXp, saveGame, currentRegionName,
        clearedLocations, worldTime
    } = useGameStore();
    
    const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [aiMessage, setAiMessage] = useState<string | null>(null);

    const hours = Math.floor(worldTime / 60);
    const isNight = hours < 6 || hours > 21;

    useEffect(() => {
        if (activeNarrativeEvent?.currentNodeId) {
            setCurrentNodeId(activeNarrativeEvent.currentNodeId);
        }
    }, [activeNarrativeEvent]);

    if (gameState !== GameState.DIALOGUE || !activeNarrativeEvent) return null;

    const npc: NPCEntity = activeNarrativeEvent.npc;
    const isBranching = !!npc.dialogueNodes && currentNodeId !== null;

    const handleAskGemini = async () => {
        setIsAIGenerating(true);
        sfx.playMagic();
        const activeQuestTitles = (Object.values(quests) as Quest[]).filter(q => !q.completed).map(q => q.title);
        const text = await GeminiService.generateNPCDialogue(npc.name, npc.role, currentRegionName || "Wilds", activeQuestTitles, isNight);
        setAiMessage(text);
        setIsAIGenerating(false);
    };

    const handleOptionSelect = (option: DialogueOption) => {
        sfx.playUiClick();
        
        // Custom Quest Trigger logic
        if (option.questTriggerId && !quests[option.questTriggerId]) {
            addQuest({
                id: option.questTriggerId,
                title: "Purge the Local Dungeon",
                description: `Clear all RAID encounters in the depths of ${currentRegionName}.`,
                completed: false,
                type: 'SIDE',
                objective: { type: 'CLEAR_LOCATION', targetId: currentRegionName || 'ANY', count: 1, current: 0 },
                reward: { xp: 800, gold: 400, items: [] }
            });
        }

        if (option.action) {
            switch(option.action) {
                case 'CLOSE': 
                    const nextGs = useGameStore.getState().townMapData ? GameState.TOWN_EXPLORATION : GameState.OVERWORLD;
                    setGameState(nextGs); 
                    break;
                case 'SAVE': saveGame(); break;
                case 'REWARD': 
                    const claimable = (Object.values(quests) as Quest[]).find(q => q.completed && !q.claimed);
                    if (claimable) {
                         addLog(`REWARD CLAIMED: ${claimable.reward.gold}G`, "info");
                    }
                    break;
            }
        }

        if (option.nextNodeId && npc.dialogueNodes?.[option.nextNodeId]) {
            setCurrentNodeId(option.nextNodeId);
            setAiMessage(null);
        } else if (!option.action || option.action === 'CLOSE') {
            const nextGs = useGameStore.getState().townMapData ? GameState.TOWN_EXPLORATION : GameState.OVERWORLD;
            setGameState(nextGs);
        }
    };

    const renderContent = () => {
        if (aiMessage) {
            return (
                <div className="animate-in fade-in duration-500">
                    <p className="text-amber-200 text-lg font-serif leading-relaxed italic mb-8 border-l-2 border-amber-500/50 pl-4 bg-amber-500/5 py-2">
                        "{aiMessage}"
                    </p>
                    <button onClick={() => setAiMessage(null)} className="text-[10px] font-black uppercase text-slate-500 hover:text-white">Volver al diálogo anterior</button>
                </div>
            );
        }

        if (isBranching) {
            const node = npc.dialogueNodes![currentNodeId!];
            const hasCompletedQuest = (Object.values(quests) as Quest[]).some(q => q.completed && q.objective.targetId === currentRegionName);
            let textToShow = node.text;
            let optionsToShow = [...node.options];

            if (currentNodeId === 'start' && hasCompletedQuest) {
                textToShow = "Excellent work clearing those ruins! The village is safer thanks to your blade. Here is your reward.";
                optionsToShow = [{ label: "Claim Reward", action: 'REWARD', nextNodeId: 'start' }, ...node.options];
            }

            return (
                <>
                    <div className="min-h-[80px]">
                        <p className="text-white text-lg font-serif leading-relaxed italic mb-8">
                            "{textToShow}"
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        {optionsToShow.map((opt, i) => (
                            <button 
                                key={i}
                                onClick={() => handleOptionSelect(opt)}
                                className="w-full text-left bg-slate-950 border border-slate-800 hover:border-amber-500 p-4 rounded-xl text-slate-300 hover:text-white transition-all group flex justify-between items-center"
                            >
                                <span className="font-bold">{opt.label}</span>
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black text-amber-500">Select →</span>
                            </button>
                        ))}
                        <button 
                            onClick={handleAskGemini}
                            disabled={isAIGenerating}
                            className="w-full text-left bg-purple-950/20 border border-purple-800/40 hover:border-purple-400 p-4 rounded-xl text-purple-200 hover:text-white transition-all group flex justify-between items-center"
                        >
                            <span className="font-bold">{isAIGenerating ? 'Escudriñando el destino...' : 'Indagar sobre esta tierra...'}</span>
                            <span className="text-xl">🔮</span>
                        </button>
                    </div>
                </>
            );
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-end p-6 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-3xl bg-slate-900 border-2 border-amber-600/50 rounded-2xl p-8 shadow-2xl relative animate-in slide-in-from-bottom-10">
                <div className="absolute -top-24 left-10 w-32 h-32 bg-slate-950 rounded-xl border border-amber-500/30 overflow-hidden flex items-center justify-center shadow-2xl">
                    <img src={AssetManager.getSafeSprite(npc.sprite)} className="w-24 h-24 object-contain pixelated" alt={npc.name} />
                </div>
                <div className="ml-0 md:ml-36">
                    <h3 className="text-amber-500 font-black uppercase tracking-widest text-sm mb-1">{npc.name}</h3>
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-4 tracking-tighter">{npc.role}</p>
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
