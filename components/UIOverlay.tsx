
// @ts-nocheck
import React, { useMemo, useEffect, useState } from 'react';
import { GameState, BattleAction, Dimension } from '../types';
import { useGameStore } from '../store/gameStore';
import { InventoryScreen } from './InventoryScreen';
import { WorldMapScreen } from './WorldMapScreen';

const SolarClock = ({ time }: { time: number }) => {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    const rotation = (time / 1440) * 360 - 90;
    const isNight = hours < 6 || hours > 21;

    return (
        <div className="relative w-16 h-16 rounded-full bg-slate-900 border-2 border-white/10 shadow-2xl flex items-center justify-center overflow-hidden">
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

const ExpeditionStats = ({ fatigue, supplies }: any) => (
    <div className="flex flex-col gap-2 bg-slate-950/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
            <span className="text-xs">⛺</span>
            <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${fatigue}%` }} />
            </div>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs">🍞</span>
            <div className="flex-1 flex gap-0.5">
                {Array.from({ length: Math.min(10, Math.ceil(supplies/5)) }).map((_, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                ))}
            </div>
        </div>
    </div>
);

interface UIOverlayProps {
    onOpenTownService: (service: 'NONE' | 'SHOP' | 'INN') => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ onOpenTownService }) => {
    const { 
        gameState, supplies, fatigue, worldTime, dimension,
        isInventoryOpen, isMapOpen, toggleInventory, toggleMap,
        standingOnSettlement, standingOnPort, enterSettlement, camp,
        party, turnOrder, currentTurnIndex, battleEntities, remainingActions, hasMoved, selectAction
    } = useGameStore();

    const isBattle = gameState === GameState.BATTLE_TACTICAL || gameState === GameState.BATTLE_INIT;
    const activeEntity = isBattle ? battleEntities.find(e => e.id === turnOrder[currentTurnIndex]) : null;

    if (gameState === GameState.TITLE) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] flex flex-col">
            {/* Header: Clock and Dimension */}
            <div className="p-5 flex justify-between items-start pointer-events-auto">
                <div className="flex gap-4 items-center">
                    <SolarClock time={worldTime} />
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${dimension === Dimension.NORMAL ? 'text-blue-400' : 'text-purple-400'}`}>
                            {dimension} REALM
                        </span>
                        <ExpeditionStats fatigue={fatigue} supplies={supplies} />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={toggleInventory} className="bg-slate-950/80 border border-white/10 text-white w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center text-xl active:scale-90 transition-all hover:bg-slate-800">🎒</button>
                    <button onClick={toggleMap} className="bg-slate-950/80 border border-white/10 text-white w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center text-xl active:scale-90 transition-all hover:bg-slate-800">🗺️</button>
                </div>
            </div>

            {/* Middle: Party Status */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto">
                {party?.map((member, i) => (
                     <div key={member.id} className="relative w-14 h-14 rounded-full bg-slate-900 border-2 border-white/10 overflow-hidden shadow-2xl">
                         <img src={member.visual?.spriteUrl} className="w-full h-full object-contain scale-[2] translate-y-3" />
                         <div className="absolute bottom-0 left-0 right-0 h-1 bg-black"><div className="h-full bg-emerald-500" style={{ width: `${(member.stats.hp/member.stats.maxHp)*100}%` }} /></div>
                     </div>
                ))}
            </div>

            {/* Footer Actions */}
            {!isBattle && (
                <div className="mt-auto p-10 flex flex-col items-center gap-4 pointer-events-auto">
                    {standingOnSettlement && (
                        <div className="flex flex-col gap-2">
                             <button onClick={() => { enterSettlement(); onOpenTownService('SHOP'); }} className="bg-amber-600 px-8 py-3 rounded-full font-black text-white shadow-2xl border-2 border-amber-400 animate-in slide-in-from-bottom-4">
                                VISITAR MERCADO 🛒
                            </button>
                            <button onClick={() => { enterSettlement(); onOpenTownService('INN'); }} className="bg-amber-800 px-8 py-3 rounded-full font-black text-white shadow-2xl border-2 border-amber-600 animate-in slide-in-from-bottom-4">
                                DESCANSAR EN POSADA 🍻
                            </button>
                        </div>
                    )}
                    {standingOnPort && (
                        <button className="bg-blue-600 px-8 py-3 rounded-full font-black text-white shadow-2xl border-2 border-blue-400 animate-in slide-in-from-bottom-4">
                            ALQUILAR BARCO ⛵
                        </button>
                    )}
                    {gameState === GameState.OVERWORLD && (
                        <div className="flex gap-4">
                            <button onClick={camp} className="bg-slate-900/90 w-14 h-14 rounded-full border-2 border-white/20 flex items-center justify-center text-2xl hover:scale-110 transition-transform shadow-2xl">⛺</button>
                            {fatigue > 50 && <span className="absolute -top-12 left-1/2 -translate-x-1/2 bg-red-600 text-[10px] font-black px-2 py-1 rounded animate-bounce">EXHAUSTED</span>}
                        </div>
                    )}
                </div>
            )}

            {isInventoryOpen && <div className="pointer-events-auto"><InventoryScreen /></div>}
            {isMapOpen && <div className="pointer-events-auto"><WorldMapScreen /></div>}
        </div>
    );
};
