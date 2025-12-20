
// @ts-nocheck
import React, { useMemo, useEffect, useState } from 'react';
import { GameState, BattleAction, Dimension } from '../types';
import { useGameStore } from '../store/gameStore';
import { InventoryScreen } from './InventoryScreen';
import { WorldMapScreen } from './WorldMapScreen';
import { WorldGenerator } from '../services/WorldGenerator';
import { AssetManager } from '../services/AssetManager';

const SolarClock = ({ time }: { time: number }) => {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    const rotation = (time / 1440) * 360 - 90;
    const isNight = hours < 6 || hours >= 22;

    return (
        <div className="relative w-16 h-16 rounded-full bg-slate-900 border-2 border-white/10 shadow-2xl flex items-center justify-center overflow-hidden shrink-0">
            <div className={`absolute inset-0 transition-colors duration-1000 ${isNight ? 'bg-indigo-950' : 'bg-sky-500'}`} />
            <div className="absolute w-full h-0.5 bg-white/20" style={{ transform: `rotate(${rotation}deg)` }}>
                <div className="absolute -right-2 -top-1.5 w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_white]" />
            </div>
            <div className="relative z-10 font-mono text-[9px] font-black text-white drop-shadow-md">
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </div>
        </div>
    );
};

const ExpeditionStats = ({ fatigue, supplies, shards }: any) => (
    <div className="flex flex-col gap-2 bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-xl min-w-[140px]">
        <div className="flex items-center gap-3">
            <span className="text-xs">⛺</span>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${fatigue}%` }} />
            </div>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs">🍞</span>
            <div className="flex-1 flex gap-0.5 flex-wrap">
                {Array.from({ length: Math.min(10, Math.ceil(supplies/5)) }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                ))}
            </div>
        </div>
        <div className="flex items-center gap-3 pt-1 border-t border-white/5">
            <span className="text-xs">🔮</span>
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{shards} SHARDS</span>
        </div>
    </div>
);

interface UIOverlayProps {
    activeService?: 'NONE' | 'SHOP' | 'INN';
    onOpenTownService: (service: 'NONE' | 'SHOP' | 'INN') => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ onOpenTownService, activeService = 'NONE' }) => {
    const { 
        gameState, setGameState, supplies, fatigue, worldTime, dimension, playerPos,
        isInventoryOpen, isMapOpen, toggleInventory, toggleMap, talkToNPC,
        standingOnSettlement, standingOnPort, standingOnTemple, standingOnDungeon,
        standingOnPortal, usePortal,
        enterSettlement, enterDungeon, exitSettlement, camp,
        party, townMapData, currentSettlementName, eternumShards
    } = useGameStore();

    const isServiceActive = activeService !== 'NONE' || gameState === GameState.DIALOGUE;
    const isBattle = gameState === GameState.BATTLE_TACTICAL || gameState === GameState.BATTLE_INIT;
    const isExploring = gameState === GameState.OVERWORLD || gameState === GameState.TOWN_EXPLORATION || gameState === GameState.DUNGEON;
    const isTown = gameState === GameState.TOWN_EXPLORATION;
    const isDungeon = gameState === GameState.DUNGEON;

    const currentTile = (isTown || isDungeon) && townMapData 
        ? townMapData.find(c => c.q === playerPos.x && c.r === playerPos.y)
        : WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
        
    const hasNPC = currentTile?.npcs && currentTile.npcs.length > 0;
    const isStandingOnShop = currentTile?.poiType === 'SHOP';
    const isStandingOnInn = currentTile?.poiType === 'INN';

    if (gameState === GameState.TITLE || isServiceActive) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col">
            {/* Header */}
            {isExploring && (
                <div className="p-5 flex justify-between items-start pointer-events-auto animate-in slide-in-from-top-2 duration-500">
                    <div className="flex gap-4 items-center">
                        <SolarClock time={worldTime} />
                        <div className="flex flex-col gap-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-black/40 border border-white/5 w-fit ${isTown ? 'text-emerald-400' : (dimension === Dimension.NORMAL ? 'text-blue-400' : 'text-purple-400')}`}>
                                {isTown ? currentSettlementName : isDungeon ? 'Ancient Dungeon' : `${dimension} REALM`}
                            </span>
                            <ExpeditionStats fatigue={fatigue} supplies={supplies} shards={eternumShards} />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={toggleInventory} className="bg-slate-950/80 border border-white/10 text-white w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center text-xl active:scale-90 transition-all">🎒</button>
                        {!isTown && !isDungeon && <button onClick={toggleMap} className="bg-slate-950/80 border border-white/10 text-white w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center text-xl active:scale-90 transition-all">🗺️</button>}
                        {(isTown || isDungeon) && <button onClick={exitSettlement} className="bg-red-950/80 border border-white/10 text-white w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center text-xl active:scale-90 transition-all">🚪</button>}
                    </div>
                </div>
            )}

            {/* Middle: Party Status */}
            {(isExploring || isBattle) && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">
                    {party?.map((member, i) => (
                        <div key={member.id} className="relative w-14 h-14 rounded-full bg-slate-900 border-2 border-white/10 overflow-hidden shadow-2xl">
                            <img src={AssetManager.getSafeSprite(member.visual?.spriteUrl)} className="w-full h-full object-contain scale-[2] translate-y-3" />
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black"><div className="h-full bg-emerald-500" style={{ width: `${(member.stats.hp/member.stats.maxHp)*100}%` }} /></div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer Actions */}
            {isExploring && (
                <div className="mt-auto p-10 flex flex-col items-center gap-4 pointer-events-auto">
                    
                    {/* Portal Interaction */}
                    {standingOnPortal && !isTown && !isDungeon && (
                        <button onClick={usePortal} className="bg-purple-900/80 px-8 py-3 rounded-full font-black text-white shadow-[0_0_20px_#a855f7] border-2 border-purple-400 animate-pulse hover:scale-105 transition-all">
                            CRUZAR EL DESGARRO 🌀
                        </button>
                    )}

                    {/* Settlement Entry */}
                    {standingOnSettlement && !isTown && !isDungeon && (
                        <button onClick={enterSettlement} className="bg-amber-600 px-8 py-3 rounded-full font-black text-white shadow-2xl border-2 border-amber-400 animate-in slide-in-from-bottom-4 hover:scale-105 transition-all">
                            EXPLORAR ASENTAMIENTO 🏰
                        </button>
                    )}

                    {/* Dungeon Entry */}
                    {standingOnDungeon && !isDungeon && !isTown && (
                        <button onClick={enterDungeon} className="bg-slate-800 px-8 py-3 rounded-full font-black text-white shadow-2xl border-2 border-slate-600 animate-in slide-in-from-bottom-4 hover:scale-105 transition-all">
                            DESCENDER A MAZMORRA 💀
                        </button>
                    )}
                    
                    {/* Town Interaction */}
                    {(isTown || isDungeon) && (
                        <div className="flex flex-col gap-2">
                             {isStandingOnShop && (
                                <button onClick={() => onOpenTownService('SHOP')} className="bg-amber-600 px-8 py-3 rounded-full font-black text-white shadow-2xl border-2 border-amber-400 animate-in slide-in-from-bottom-4">
                                    ABRIR TIENDA 🛒
                                </button>
                             )}
                             {isStandingOnInn && (
                                <button onClick={() => onOpenTownService('INN')} className="bg-amber-800 px-8 py-3 rounded-full font-black text-white shadow-2xl border-2 border-amber-600 animate-in slide-in-from-bottom-4">
                                    POSADA / GUARDAR 🍺
                                </button>
                             )}
                             {hasNPC && (
                                <button onClick={talkToNPC} className="bg-emerald-600 px-8 py-3 rounded-full font-black text-white shadow-2xl border-2 border-emerald-400 animate-in slide-in-from-bottom-4">
                                    HABLAR CON NPC 💬
                                </button>
                            )}
                        </div>
                    )}

                    {standingOnTemple && !isTown && !isDungeon && (
                        <button onClick={() => setGameState(GameState.TEMPLE_HUB)} className="bg-purple-600 px-8 py-3 rounded-full font-black text-white shadow-2xl border-2 border-purple-400 animate-in slide-in-from-bottom-4">
                            ENTRAR AL TEMPLO 🏛️
                        </button>
                    )}

                    {!isTown && !isDungeon && (
                        <div className="flex gap-4">
                            <button onClick={camp} className="bg-slate-900/90 w-14 h-14 rounded-full border-2 border-white/20 flex items-center justify-center text-2xl hover:scale-110 transition-transform shadow-2xl">⛺</button>
                        </div>
                    )}
                </div>
            )}

            {isInventoryOpen && <div className="pointer-events-auto"><InventoryScreen /></div>}
            {isMapOpen && <div className="pointer-events-auto"><WorldMapScreen /></div>}
        </div>
    );
};
