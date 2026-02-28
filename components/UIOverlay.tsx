
// @ts-nocheck
import React, { useMemo } from 'react';
import { GameState, Dimension } from '../types';
import { useGameStore } from '../store/gameStore';
import { InventoryScreen } from './InventoryScreen';
import { WorldMapScreen } from './WorldMapScreen';
import { WorldGenerator } from '../services/WorldGenerator';
import { AssetManager } from '../services/AssetManager';
import { HapticFeedback, isTouchDevice } from '../services/TouchFeedback';

const SolarClock = ({ time }: { time: number }) => {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    const rotation = (time / 1440) * 360 - 90;
    const isNight = hours < 6 || hours >= 22;

    return (
        <div className="relative w-20 h-20 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-white/10 shadow-2xl flex items-center justify-center overflow-hidden shrink-0">
            <div className={`absolute inset-0 transition-colors duration-1000 ${isNight ? 'bg-gradient-to-br from-indigo-950 to-purple-950' : 'bg-gradient-to-br from-sky-500/80 to-blue-600/80'}`} />
            <div className="absolute w-full h-0.5 bg-white/30" style={{ transform: `rotate(${rotation}deg)` }}>
                <div className="absolute -right-1.5 -top-1.5 w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
            </div>
            <div className="relative z-10 font-mono text-xs md:text-[9px] font-black text-white drop-shadow-md">
                {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
            </div>
        </div>
    );
};

const ExpeditionStats = ({ fatigue, supplies, shards }: any) => (
    <div className="flex flex-col gap-2 bg-slate-950/90 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-xl min-w-[160px] md:min-w-[130px] md:p-3">
        <div className="flex items-center gap-2">
            <span className="text-sm md:text-[10px]">⛺</span>
            <span className="text-xs text-slate-400 font-bold uppercase">Fatiga</span>
            <div className="flex-1 h-2.5 md:h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-500 ${fatigue > 75 ? 'bg-red-500 animate-pulse' : fatigue > 50 ? 'bg-orange-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${fatigue}%` }} 
                />
            </div>
            <span className={`text-xs font-mono font-black ${fatigue > 75 ? 'text-red-400' : 'text-white'}`}>{fatigue}%</span>
        </div>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                <span className="text-sm md:text-[10px]">🍞</span>
                <span className={`text-sm font-mono font-black ${supplies < 5 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>{supplies}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <span className="text-sm md:text-[10px]">🔮</span>
                <span className="text-sm font-mono text-purple-400 font-black">{shards}</span>
            </div>
        </div>
    </div>
);

const PartyMember: React.FC<{ member: any }> = ({ member }) => {
    const hpPercent = (member.stats.hp / member.stats.maxHp) * 100;
    const isLow = hpPercent <= 30;
    
    return (
        <div className="relative group cursor-pointer">
            <div className={`
                w-16 h-16 md:w-14 md:h-14 rounded-full overflow-hidden shadow-2xl relative
                ring-2 transition-all duration-200
                ${isLow ? 'ring-red-500 animate-pulse' : 'ring-white/10'}
            `}>
                <img 
                    src={AssetManager.getSafeSprite(member.visual?.spriteUrl)} 
                    className="w-full h-full object-contain scale-[2.2] translate-y-2.5 pixelated" 
                    onError={e => e.currentTarget.src = AssetManager.getSafeSprite('units/human-loyalists/swordsman.png')}
                />
                <div className="absolute bottom-0 left-0 right-0 h-2.5 md:h-2 bg-black/80">
                    <div 
                        className={`h-full transition-all duration-300 ${isLow ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${hpPercent}%` }} 
                    />
                </div>
            </div>
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-black/95 px-4 py-3 rounded-2xl text-xs font-black text-white whitespace-nowrap opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity border border-white/10 shadow-2xl pointer-events-none z-50">
                <div className="text-amber-400 uppercase tracking-wider">{member.name}</div>
                <div className="text-slate-400 mt-1">
                    HP: <span className={isLow ? 'text-red-400' : 'text-white'}>{member.stats.hp}/{member.stats.maxHp}</span>
                </div>
                <div className="text-slate-500 text-[10px] mt-0.5">Nivel {member.stats.level} {member.stats.class}</div>
            </div>
        </div>
    );
};

export const UIOverlay: React.FC<{ onOpenTownService: any, activeService?: string }> = ({ onOpenTownService, activeService = 'NONE' }) => {
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

    const partyNeedsRest = party?.some(p => p.stats.hp < p.stats.maxHp * 0.8) || fatigue > 25;
    const canCamp = gameState === GameState.OVERWORLD && partyNeedsRest;

    const currentTile = (isTown || isDungeon) && townMapData 
        ? townMapData.find(c => c.q === playerPos.x && c.r === playerPos.y)
        : WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
        
    const hasNPC = currentTile?.npcs && currentTile.npcs.length > 0;

    const handleButtonPress = (callback: () => void) => {
        HapticFeedback.medium();
        callback();
    };

    if (gameState === GameState.TITLE || activeService !== 'NONE') return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col">
            {/* Top Bar */}
            {isExploring && (
                <div className="p-4 flex justify-between items-start pointer-events-auto">
                    <div className="flex gap-3 items-center">
                        <SolarClock time={worldTime} />
                        <div className="flex flex-col gap-2">
                            <span className={`
                                text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border
                                ${isTown 
                                    ? 'bg-gradient-to-r from-emerald-600/80 to-emerald-800/80 text-emerald-300 border-emerald-500/50' 
                                    : 'bg-black/60 text-slate-400 border-white/5'
                                }
                            `}>
                                {isTown ? currentSettlementName : isDungeon ? 'Cripta Ancestral' : `${dimension} Realm`}
                            </span>
                            <ExpeditionStats fatigue={fatigue} supplies={supplies} shards={eternumShards} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleButtonPress(toggleInventory)} 
                            className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 to-white/20 text-white w-14 h-14 md:w-12 md:h-12 rounded-2xl shadow-xl flex items-center justify-center text-2xl active:scale-90 hover:from-slate-700 transition-all"
                        >
                            🎒
                        </button>
                        {!isTown && !isDungeon && (
                            <button 
                                onClick={() => handleButtonPress(toggleMap)} 
                                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 text-white w-14 h-14 md:w-12 md:h-12 rounded-2xl shadow-xl flex items-center justify-center text-2xl active:scale-90 hover:from-slate-700 transition-all"
                            >
                                🗺️
                            </button>
                        )}
                        {(isTown || isDungeon) && (
                            <button 
                                onClick={() => handleButtonPress(exitSettlement)} 
                                className="bg-gradient-to-br from-red-900/80 to-slate-900 border border-red-500/30 text-white w-14 h-14 md:w-12 md:h-12 rounded-2xl shadow-xl flex items-center justify-center text-2xl active:scale-90 hover:from-red-800 transition-all"
                            >
                                🚪
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Party - Left Side */}
            {(isExploring || isBattle) && party && (
                <div className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 md:gap-4 pointer-events-auto">
                    {party.map((member) => (
                        <PartyMember key={member.id} member={member} />
                    ))}
                </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-auto p-6 pb-12 md:p-10 flex flex-col items-center gap-4 md:gap-5 pointer-events-auto">
                {/* Contextual Portal Button */}
                {standingOnPortal && !isTown && !isDungeon && (
                    <button 
                        onClick={() => handleButtonPress(usePortal)} 
                        className="bg-gradient-to-r from-purple-600 to-purple-800 px-10 py-5 md:px-8 md:py-4 rounded-2xl font-black text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] border-2 border-purple-400 animate-pulse text-sm md:text-xs uppercase tracking-[0.2em] active:scale-95 hover:from-purple-500 transition-all"
                    >
                        🌀 Cruzar el Velo
                    </button>
                )}

                {/* Settlement Button */}
                {standingOnSettlement && !isTown && !isDungeon && (
                    <button 
                        onClick={() => handleButtonPress(enterSettlement)} 
                        className="bg-gradient-to-r from-amber-600 to-amber-800 px-10 py-5 md:px-8 md:py-4 rounded-2xl font-black text-white shadow-2xl border-2 border-amber-400 text-sm md:text-xs uppercase tracking-widest active:scale-95 hover:from-amber-500 transition-all"
                    >
                        🏰 Entrar a Ciudad
                    </button>
                )}

                {/* Dungeon Button */}
                {standingOnDungeon && !isDungeon && !isTown && (
                    <button 
                        onClick={() => handleButtonPress(enterDungeon)} 
                        className="bg-gradient-to-r from-slate-700 to-slate-900 px-10 py-5 md:px-8 md:py-4 rounded-2xl font-black text-white shadow-2xl border-2 border-slate-500 text-sm md:text-xs uppercase tracking-widest active:scale-95 hover:from-slate-600 transition-all"
                    >
                        💀 Explorar Cripta
                    </button>
                )}

                {/* Town Services */}
                {(isTown || isDungeon) && (
                    <div className="flex gap-2 md:gap-3 bg-black/60 p-3 md:p-2 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl">
                        {currentTile?.poiType === 'SHOP' && (
                            <button 
                                onClick={() => handleButtonPress(() => onOpenTownService('SHOP'))} 
                                className="bg-gradient-to-r from-amber-600 to-amber-700 px-8 py-5 md:px-6 md:py-4 rounded-2xl font-black text-white border border-amber-400 text-sm md:text-[11px] uppercase tracking-tighter shadow-lg active:scale-90 hover:from-amber-500 transition-all"
                            >
                                🛒 Mercado
                            </button>
                        )}
                        {currentTile?.poiType === 'INN' && (
                            <button 
                                onClick={() => handleButtonPress(() => onOpenTownService('INN'))} 
                                className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-5 md:px-6 md:py-4 rounded-2xl font-black text-white border border-indigo-400 text-sm md:text-[11px] uppercase tracking-tighter shadow-lg active:scale-90 hover:from-indigo-500 transition-all"
                            >
                                🍺 Posada
                            </button>
                        )}
                        {hasNPC && (
                            <button 
                                onClick={() => handleButtonPress(talkToNPC)} 
                                className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-5 md:px-6 md:py-4 rounded-2xl font-black text-white border border-emerald-400 text-sm md:text-[11px] uppercase tracking-tighter shadow-lg active:scale-90 hover:from-emerald-500 transition-all"
                            >
                                💬 Hablar
                            </button>
                        )}
                    </div>
                )}

                {/* Camp Button */}
                {canCamp && (
                    <div className="flex flex-col items-center gap-2 animate-in zoom-in-50 duration-500">
                        <button 
                            onClick={() => handleButtonPress(camp)} 
                            className="bg-gradient-to-br from-slate-800 to-slate-900 w-24 h-24 md:w-20 md:h-20 rounded-full border-4 border-amber-500/40 flex items-center justify-center text-5xl md:text-4xl shadow-[0_0_40px_rgba(245,158,11,0.4)] active:scale-90 hover:border-amber-500/60 transition-all relative group"
                        >
                            ⛺
                            <div className="absolute -top-16 bg-black/95 px-4 py-2 rounded-xl border border-amber-500/40 text-xs font-black text-amber-400 uppercase tracking-widest whitespace-nowrap shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                                Acampar (5 raciones)
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* Overlays */}
            {isInventoryOpen && <div className="pointer-events-auto"><InventoryScreen /></div>}
            {isMapOpen && <div className="pointer-events-auto"><WorldMapScreen /></div>}
        </div>
    );
};
