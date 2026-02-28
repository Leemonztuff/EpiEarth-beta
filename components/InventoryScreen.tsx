
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { EquipmentSlot, ItemRarity, Item, Ability, DamageType } from '../types';
import { RARITY_COLORS, DAMAGE_ICONS } from '../constants';

const RarityBorder: React.FC<{ rarity: ItemRarity, children?: React.ReactNode, className?: string }> = ({ rarity, children, className = "" }) => {
    const color = RARITY_COLORS[rarity];
    return (
        <div className={`relative group ${className}`} style={{ boxShadow: `inset 0 0 0 1px ${color}40` }}>
            {(rarity === ItemRarity.LEGENDARY || rarity === ItemRarity.VERY_RARE) && (
                <div className="absolute inset-0 border-2 opacity-20 animate-pulse pointer-events-none" style={{ borderColor: color }} />
            )}
            {children}
        </div>
    );
};

export const InventoryScreen: React.FC = () => {
    const { 
        inventory, party, activeInventoryCharacterId, 
        toggleInventory, consumeItem, equipItem, unequipItem, 
        cycleInventoryCharacter, gold
    } = useGameStore();
    
    const [tab, setTab] = useState<'ITEMS' | 'STATS'>('ITEMS');
    
    const activeChar = party.find(p => p.id === activeInventoryCharacterId) || party[0];
    if (!activeChar) return null;

    const { stats } = activeChar;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col md:p-12 animate-in fade-in duration-300">
            <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 md:gap-4">
                    <button onClick={() => cycleInventoryCharacter('prev')} className="w-12 h-12 md:w-10 md:h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl active:scale-95">◀</button>
                    <div className="text-center">
                        <h2 className="text-base md:text-sm font-black text-amber-500 uppercase tracking-widest">{activeChar.name}</h2>
                        <div className="text-xs md:text-[9px] text-slate-500 font-bold uppercase">Nivel {stats.level} {stats.class}</div>
                    </div>
                    <button onClick={() => cycleInventoryCharacter('next')} className="w-12 h-12 md:w-10 md:h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl active:scale-95">▶</button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setTab('ITEMS')} className={`px-5 py-2 md:px-4 md:py-1 rounded-full text-xs md:text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'ITEMS' ? 'bg-amber-600 text-white' : 'text-slate-500'}`}>Objetos</button>
                    <button onClick={() => setTab('STATS')} className={`px-5 py-2 md:px-4 md:py-1 rounded-full text-xs md:text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'STATS' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Atributos</button>
                </div>
                <button onClick={toggleInventory} className="w-12 h-12 md:w-10 md:h-10 bg-red-600 rounded-full text-white font-bold text-xl active:scale-95">✕</button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-0 flex flex-col lg:flex-row gap-4 md:gap-6">
                {/* Lateral: Equipamiento y Stats Rápidas */}
                <div className="lg:w-1/3 space-y-4">
                    <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5 flex flex-col items-center">
                        <div className="w-40 h-40 md:w-32 md:h-32 bg-black/40 rounded-full border-2 border-white/10 mb-4 overflow-hidden flex items-center justify-center">
                            <img src={activeChar.visual.spriteUrl} className="w-32 h-32 md:w-24 md:h-24 object-contain pixelated scale-150 translate-y-4" />
                        </div>
                        <div className="grid grid-cols-3 gap-3 md:gap-2 w-full">
                             {[EquipmentSlot.MAIN_HAND, EquipmentSlot.BODY, EquipmentSlot.OFF_HAND].map(slot => {
                                const item = activeChar.equipment[slot];
                                return (
                                    <button key={slot} onClick={() => item && unequipItem(slot, activeChar.id)} className={`aspect-square rounded-2xl border-2 flex items-center justify-center relative transition-all ${item ? 'bg-slate-800 border-amber-600 shadow-lg shadow-amber-900/20' : 'bg-slate-900/50 border-slate-800 border-dashed opacity-40'}`}>
                                        {item ? <img src={item.icon} className="w-12 h-12 md:w-10 md:h-10 object-contain invert" /> : <span className="text-xs md:text-[8px] font-black uppercase text-white">{slot.split('_')[0]}</span>}
                                    </button>
                                );
                             })}
                        </div>
                    </div>
                </div>

                {/* Contenido Principal */}
                <div className="flex-1 bg-slate-900/40 p-4 md:p-4 lg:p-6 rounded-3xl border border-white/5 overflow-y-auto custom-scrollbar">
                    {tab === 'ITEMS' ? (
                        <>
                            <div className="flex justify-between items-center mb-4 md:mb-6">
                                <h3 className="text-xs md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Mochila ({inventory.length}/20)</h3>
                                <span className="text-yellow-500 font-mono font-bold text-sm">🪙 {gold} Oro</span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                {inventory.map((slot, idx) => (
                                    <RarityBorder key={idx} rarity={slot.item.rarity} className="aspect-square">
                                        <button onClick={() => slot.item.type === 'consumable' ? consumeItem(slot.item.id) : equipItem(slot.item.id, activeChar.id)} className="w-full h-full bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center relative active:scale-95 transition-transform">
                                            <img src={slot.item.icon} className="w-10 h-10 md:w-8 md:h-8 object-contain invert" />
                                            {slot.quantity > 1 && <span className="absolute bottom-1 right-1 bg-black text-xs md:text-[8px] font-black px-1.5 py-0.5 rounded">{slot.quantity}</span>}
                                        </button>
                                    </RarityBorder>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-4 duration-300">
                            <div>
                                <h3 className="text-xs md:text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 border-b border-blue-900/30 pb-1">Atributos Primarios</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {Object.entries(stats.attributes).map(([key, val]) => (
                                        <div key={key} className="bg-black/20 p-4 md:p-3 rounded-xl border border-white/5">
                                            <div className="text-xs md:text-[8px] font-black text-slate-500 uppercase mb-1">{key}</div>
                                            <div className="text-2xl md:text-xl font-mono font-bold text-white">{val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs md:text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 border-b border-amber-900/30 pb-1">Rasgos y Pasivas</h3>
                                <div className="flex flex-wrap gap-2">
                                    {stats.traits?.map(trait => (
                                        <span key={trait} className="px-4 py-2 md:px-3 md:py-1 bg-slate-800 border border-amber-500/20 rounded text-xs md:text-[10px] font-bold text-amber-100 uppercase tracking-tighter">{trait.replace('_', ' ')}</span>
                                    )) || <span className="text-sm md:text-xs text-slate-600 italic">Ningún rasgo especial desbloqueado.</span>}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xs md:text-[10px] font-black text-purple-400 uppercase tracking-widest mb-4 border-b border-purple-900/30 pb-1">Afinidades Elementales</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <span className="text-xs md:text-[8px] font-bold text-slate-500 uppercase">Resistencias</span>
                                        <div className="flex flex-wrap gap-2">
                                            {stats.resistances.map(r => <img key={r} src={DAMAGE_ICONS[r]} className="w-7 h-7 md:w-5 md:h-5 invert opacity-60" title={r} />)}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-xs md:text-[8px] font-bold text-slate-500 uppercase">Debilidades</span>
                                        <div className="flex flex-wrap gap-2">
                                            {stats.vulnerabilities.map(v => <img key={v} src={DAMAGE_ICONS[v]} className="w-7 h-7 md:w-5 md:h-5 invert sepia hue-rotate-[320deg]" title={v} />)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
