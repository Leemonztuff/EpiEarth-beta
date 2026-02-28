
// @ts-nocheck
import React, { useMemo } from 'react';
import { GameState, Dimension } from '../types';
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
        <div className="relative w-20 h-20 rounded-full bg-slate-900 border-2 border-white/10 shadow-2xl flex items-center justify-center overflow-hidden shrink-0 md:w-16 md:h-16">
            <div className={`absolute inset-0 transition-colors duration-1000 ${isNight ? 'bg-indigo-950/80' : 'bg-sky-500/80'}`} />
            <div className="absolute w-full h-0.5 bg-white/20" style={{ transform: `rotate(${rotation}deg)` }}>
                <div className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_white]" />
            </div>
            <div className="relative z-10 font-mono text-xs font-black text-white drop-shadow-md md:text-[9px]">
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </div>
        </div>
    );
};

const ExpeditionStats = ({ fatigue, supplies, shards }: any) => (
    <div className="flex flex-col gap-2 bg-slate-950/85 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl min-w-[150px] md:min-w-[130px] md:p-3">
        <div className="flex items-center gap-2">
            <span className="text-sm md:text-[10px]" title="Fatiga">⛺</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden md:h-1.5">
                <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${fatigue}%` }} />
            </div>
        </div>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                <span className="text-sm md:text-[10px]">🍞</span>
                <span className={`text-xs md:text-[10px] font-mono font-black ${supplies < 5 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>{supplies}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-sm md:text-[10px]">🔮</span>
                <span className="text-xs md:text-[10px] font-mono text-purple-400 font-black">{shards}</span>
            </div>
        </div>
    </div>
);

export const UIOverlay: React.FC<any> = ({ onOpenTownService, activeService = 'NONE' }) => {
    const { 
        gameState, setGameState, supplies, fatigue, worldTime, dimension, playerPos,
        isInventoryOpen, isMapOpen, toggleInventory, toggleMap, talkToNPC,
        standingOnPortal, standingOnSettlement, standingOnTemple, standingOnDungeon,
        usePortal, enterSettlement, enterDungeon, exitSettlement, camp,
        party, townMapData, currentSettlementName, eternumShards
    } = useGameStore();

    const isBattle = gameState === GameState.BATTLE_TACTICAL || gameState === GameState.BATTLE_INIT;
    const isExploring = gameState === GameState.OVERWORLD || gameState === GameState.TOWN_EXPLORATION || gameState === GameState.DUNGEON;
    const isTown = gameState === GameState.TOWN_EXPLORATION;
    const isDungeon = gameState === GameState.DUNGEON;

    // BOTÓN CONTEXTUAL: Solo si estamos en el Overworld, cansados (>25%) o heridos (<80% HP)
    const partyNeedsRest = party.some(p => p.stats.hp < p.stats.maxHp * 0.8) || fatigue > 25;
    const canCamp = gameState === GameState.OVERWORLD && partyNeedsRest;

    const currentTile = (isTown || isDungeon) && townMapData 
        ? townMapData.find(c => c.q === playerPos.x && c.r === playerPos.y)
        : WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
        
    const hasNPC = currentTile?.npcs && currentTile.npcs.length > 0;

    if (gameState === GameState.TITLE || activeService !== 'NONE') return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col">
            {/* Top Bar */}
            {isExploring && (
                <div className="p-4 flex justify-between items-start pointer-events-auto">
                    <div className="flex gap-3 items-center">
                        <SolarClock time={worldTime} />
                        <div className="flex flex-col gap-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-white/5 ${isTown ? 'bg-emerald-950/80 text-emerald-400' : 'bg-black/60 text-slate-400'}`}>
                                {isTown ? currentSettlementName : isDungeon ? 'Cripta Ancestral' : `${dimension} REALM`}
                            </span>
                            <ExpeditionStats fatigue={fatigue} supplies={supplies} shards={eternumShards} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={toggleInventory} className="bg-slate-900/90 border border-white/10 text-white w-14 h-14 md:w-12 md:h-12 rounded-2xl shadow-xl flex items-center justify-center text-3xl md:text-2xl active:scale-90 transition-transform">🎒</button>
                        {!isTown && !isDungeon && <button onClick={toggleMap} className="bg-slate-900/90 border border-white/10 text-white w-14 h-14 md:w-12 md:h-12 rounded-2xl shadow-xl flex items-center justify-center text-3xl md:text-2xl active:scale-90 transition-transform">🗺️</button>}
                        {(isTown || isDungeon) && <button onClick={exitSettlement} className="bg-red-950/90 border border-white/10 text-white w-14 h-14 md:w-12 md:h-12 rounded-2xl shadow-xl flex items-center justify-center text-3xl md:text-2xl active:scale-90 transition-transform">🚪</button>}
                    </div>
                </div>
            )}

            {/* Lateral Party - Optimizado para pulgar izquierdo */}
            {(isExploring || isBattle) && (
                <div className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 md:gap-4 pointer-events-auto">
                    {party?.map((member) => (
                        <div key={member.id} className="relative group active:scale-110 transition-transform">
                            <div className="w-16 h-16 md:w-14 md:h-14 rounded-full bg-slate-900 border-2 border-white/10 overflow-hidden shadow-2xl relative">
                                <img 
                                    src={AssetManager.getSafeSprite(member.visual?.spriteUrl)} 
                                    className="w-full h-full object-contain scale-[2.2] translate-y-2.5 pixelated" 
                                    onError={e => e.currentTarget.src = AssetManager.getSafeSprite('units/human-loyalists/swordsman.png')}
                                />
                                <div className="absolute bottom-0 left-0 right-0 h-2.5 md:h-2 bg-black/80">
                                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(member.stats.hp/member.stats.maxHp)*100}%` }} />
                                </div>
                            </div>
                            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-black/90 px-3 py-2 md:py-1.5 rounded-xl text-xs md:text-[10px] font-black text-white whitespace-nowrap opacity-0 group-active:opacity-100 transition-opacity border border-white/10 shadow-2xl pointer-events-none">
                                {member.name.toUpperCase()}: {member.stats.hp} HP
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Bottom Actions - Centralized for Mobile */}
            <div className="mt-auto p-6 pb-12 md:p-10 flex flex-col items-center gap-4 md:gap-5 pointer-events-auto">
                {standingOnPortal && !isTown && !isDungeon && (
                    <button onClick={usePortal} className="bg-purple-600/90 px-10 py-5 md:px-8 md:py-4 rounded-full font-black text-white shadow-[0_0_25px_rgba(168,85,247,0.6)] border-2 border-purple-400 animate-pulse text-sm md:text-xs uppercase tracking-[0.2em] active:scale-95 transition-transform">
                        Cruzar el Velo 🌀
                    </button>
                )}

                {standingOnSettlement && !isTown && !isDungeon && (
                    <button onClick={enterSettlement} className="bg-amber-600/95 px-10 py-5 md:px-8 md:py-4 rounded-2xl font-black text-white shadow-2xl border-2 border-amber-400 text-sm md:text-xs uppercase tracking-widest active:scale-95 transition-transform">
                        Entrar a Ciudad 🏰
                    </button>
                )}

                {standingOnDungeon && !isDungeon && !isTown && (
                    <button onClick={enterDungeon} className="bg-slate-800/95 px-10 py-5 md:px-8 md:py-4 rounded-2xl font-black text-white shadow-2xl border-2 border-slate-600 text-sm md:text-xs uppercase tracking-widest active:scale-95 transition-transform">
                        Explorar Cripta 💀
                    </button>
                )}

                {/* Town Services Hub */}
                {(isTown || isDungeon) && (
                    <div className="flex gap-2 md:gap-3 bg-black/40 p-3 md:p-2 rounded-3xl backdrop-blur-md border border-white/5 shadow-2xl">
                         {currentTile?.poiType === 'SHOP' && (
                            <button onClick={() => onOpenTownService('SHOP')} className="bg-amber-600 px-8 py-5 md:px-6 md:py-4 rounded-2xl font-black text-white border border-amber-400 text-sm md:text-[11px] uppercase tracking-tighter shadow-lg active:scale-90 transition-transform">Mercado 🛒</button>
                         )}
                         {currentTile?.poiType === 'INN' && (
                            <button onClick={() => onOpenTownService('INN')} className="bg-indigo-600 px-8 py-5 md:px-6 md:py-4 rounded-2xl font-black text-white border border-indigo-400 text-sm md:text-[11px] uppercase tracking-tighter shadow-lg active:scale-90 transition-transform">Posada 🍺</button>
                         )}
                         {hasNPC && (
                            <button onClick={talkToNPC} className="bg-emerald-600 px-8 py-5 md:px-6 md:py-4 rounded-2xl font-black text-white border border-emerald-400 text-sm md:text-[11px] uppercase tracking-tighter shadow-lg active:scale-90 transition-transform">Hablar 💬</button>
                         )}
                    </div>
                )}

                {/* BOTÓN DE ACAMPAR CONTEXTUAL */}
                {canCamp && (
                    <div className="flex flex-col items-center gap-2 animate-in zoom-in-50 duration-500">
                         <button onClick={camp} className="bg-slate-900/95 w-24 h-24 md:w-20 md:h-20 rounded-full border-4 border-amber-500/40 flex items-center justify-center text-5xl md:text-4xl shadow-[0_0_40px_rgba(245,158,11,0.3)] active:scale-90 transition-transform relative group">
                            ⛺
                            <div className="absolute -top-14 md:-top-12 bg-black/90 px-4 py-2 md:px-3 md:py-1.5 rounded-xl border border-amber-500/30 text-xs md:text-[9px] font-black text-amber-400 uppercase tracking-widest whitespace-nowrap shadow-2xl">Acampar (5 raciones)</div>
                        </button>
                    </div>
                )}
            </div>

            {isInventoryOpen && <div className="pointer-events-auto"><InventoryScreen /></div>}
            {isMapOpen && <div className="pointer-events-auto"><WorldMapScreen /></div>}
        </div>
    );
};
