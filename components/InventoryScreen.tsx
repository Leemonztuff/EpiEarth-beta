
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { EquipmentSlot, ItemRarity, Item, Ability, DamageType } from '../types';
import { RARITY_COLORS, DAMAGE_ICONS } from '../constants';
import { HealthBar, ResourceBar, XPBar } from './ui/HealthBar';

const RarityBorder: React.FC<{ rarity: ItemRarity, children?: React.ReactNode, className?: string }> = ({ rarity, children, className = "" }) => {
    const color = RARITY_COLORS[rarity];
    return (
        <div className={`relative group ${className}`} style={{ boxShadow: `inset 0 0 0 1px ${color}40` }}>
            {(rarity === ItemRarity.LEGENDARY || rarity === ItemRarity.VERY_RARE) && (
                <div className="absolute inset-0 border-2 opacity-30 animate-pulse pointer-events-none" style={{ borderColor: color }} />
            )}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: `linear-gradient(135deg, ${color}20, transparent 60%)` }} />
            {children}
        </div>
    );
};

const CharacterPreview: React.FC<{ character: any }> = ({ character }) => {
    return (
        <div className="relative flex flex-col items-center">
            {/* Character avatar frame */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/30 via-transparent to-purple-500/30 rounded-full blur-xl" />
                <div className="w-36 h-36 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-4 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.3)] overflow-hidden relative z-10">
                    <img 
                        src={character.visual.spriteUrl} 
                        className="w-full h-full object-contain scale-150 translate-y-4 pixelated"
                        alt={character.name}
                    />
                    {/* Class badge */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-gradient-to-r from-amber-600 to-amber-500 px-3 py-0.5 rounded-full text-[10px] font-black text-black uppercase tracking-wider shadow-lg">
                        {character.stats.class}
                    </div>
                </div>
            </div>
            
            {/* Character name with level */}
            <div className="mt-4 text-center">
                <h3 className="text-lg md:text-base font-black text-white uppercase tracking-widest drop-shadow-lg">{character.name}</h3>
                <p className="text-xs text-amber-400 font-bold">Nivel {character.stats.level}</p>
            </div>

            {/* Health, Mana, XP */}
            <div className="mt-4 w-full space-y-2 px-2">
                <HealthBar 
                    current={character.stats.hp} 
                    max={character.stats.maxHp} 
                    variant="default"
                />
                <ResourceBar 
                    current={character.stats.mp || Math.floor(character.stats.maxMp * 0.7)} 
                    max={character.stats.maxMp || 100} 
                    type="mana" 
                />
                <XPBar 
                    current={character.stats.xp || 0} 
                    nextLevel={character.stats.level * 1000} 
                    level={character.stats.level} 
                />
            </div>
        </div>
    );
};

const EquipmentSlotItem: React.FC<{ 
    slot: EquipmentSlot; 
    item?: Item; 
    onClick: () => void;
    onUnequip?: () => void;
}> = ({ slot, item, onClick, onUnequip }) => {
    const slotIcons: Record<string, string> = {
        MAIN_HAND: '⚔️',
        BODY: '🛡️',
        OFF_HAND: '🛡️',
        HEAD: '⛑️',
        FEET: '👢',
        AMULET: '📿',
        RING: '💍'
    };

    const slotLabels: Record<string, string> = {
        MAIN_HAND: 'Arma',
        BODY: 'Armadura',
        OFF_HAND: 'Escudo',
        HEAD: 'Casco',
        FEET: 'Botas',
        AMULET: 'Amuleto',
        RING: 'Anillo'
    };

    const rarityColor = item ? RARITY_COLORS[item.rarity] : null;

    return (
        <button 
            onClick={onClick}
            className={`
                relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center 
                transition-all duration-200 group
                ${item 
                    ? 'bg-slate-800 hover:bg-slate-700 active:scale-95' 
                    : 'bg-slate-900/50 border-slate-800 border-dashed hover:border-slate-600'
                }
            `}
            style={rarityColor ? { borderColor: rarityColor, boxShadow: `inset 0 0 15px ${rarityColor}30` } : undefined}
        >
            {item ? (
                <>
                    <img src={item.icon} className="w-12 h-12 md:w-10 md:h-10 object-contain invert" alt={item.name} />
                    <span className="absolute bottom-1 text-[8px] font-bold text-white/70 truncate max-w-[90%]">{item.name}</span>
                    
                    {/* Rarity indicator */}
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: rarityColor }} />
                </>
            ) : (
                <>
                    <span className="text-2xl md:text-xl opacity-30">{slotIcons[slot] || '📦'}</span>
                    <span className="absolute bottom-1 text-[7px] font-bold text-slate-600 uppercase">{slotLabels[slot] || slot}</span>
                </>
            )}
            
            {/* Hover tooltip */}
            {item && (
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 bg-black/95 px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-[150px]">
                    <p className="text-xs font-bold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.description || 'Sin descripción'}</p>
                </div>
            )}
        </button>
    );
};

export const InventoryScreen: React.FC = () => {
    const { 
        inventory, party, activeInventoryCharacterId, 
        toggleInventory, consumeItem, equipItem, unequipItem, 
        cycleInventoryCharacter, gold
    } = useGameStore();
    
    const [tab, setTab] = useState<'ITEMS' | 'STATS' | 'EQUIP'>('ITEMS');
    
    const activeChar = party.find(p => p.id === activeInventoryCharacterId) || party[0];
    if (!activeChar) return null;

    const { stats } = activeChar;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-300">
            {/* Header moderno con gradiente */}
            <header className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 md:gap-4">
                    <button 
                        onClick={() => cycleInventoryCharacter('prev')} 
                        className="w-12 h-12 md:w-10 md:h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xl active:scale-95 transition-all"
                    >
                        ◀
                    </button>
                    <div className="text-center hidden md:block">
                        <h2 className="text-base font-black text-amber-500 uppercase tracking-widest">{activeChar.name}</h2>
                        <div className="text-xs text-slate-500 font-bold uppercase">Nivel {stats.level} {stats.class}</div>
                    </div>
                    <button 
                        onClick={() => cycleInventoryCharacter('next')} 
                        className="w-12 h-12 md:w-10 md:h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-xl active:scale-95 transition-all"
                    >
                        ▶
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-1 bg-slate-800/50 p-1 rounded-2xl">
                    {(['ITEMS', 'EQUIP', 'STATS'] as const).map((t) => (
                        <button 
                            key={t}
                            onClick={() => setTab(t)} 
                            className={`
                                px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                                ${tab === t 
                                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg' 
                                    : 'text-slate-500 hover:text-slate-300'
                                }
                            `}
                        >
                            {t === 'ITEMS' ? '🎒' : t === 'EQUIP' ? '⚔️' : '📊'}
                        </button>
                    ))}
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Gold display */}
                    <div className="flex items-center gap-2 bg-yellow-600/20 px-3 py-2 rounded-xl border border-yellow-600/30">
                        <span className="text-lg">🪙</span>
                        <span className="text-yellow-400 font-black text-sm">{gold}</span>
                    </div>
                    <button 
                        onClick={toggleInventory} 
                        className="w-12 h-12 bg-red-600/80 hover:bg-red-600 rounded-full text-white font-bold text-xl active:scale-95 transition-all"
                    >
                        ✕
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Sidebar - Character Preview */}
                <div className="w-full md:w-80 bg-slate-900/50 p-6 border-b md:border-b-0 md:border-r border-slate-800">
                    <CharacterPreview character={activeChar} />
                    
                    {/* Quick equipment slots */}
                    <div className="mt-6">
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Equipamiento</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {[EquipmentSlot.MAIN_HAND, EquipmentSlot.BODY, EquipmentSlot.OFF_HAND].map(slot => (
                                <EquipmentSlotItem
                                    key={slot}
                                    slot={slot}
                                    item={activeChar.equipment[slot]}
                                    onClick={() => {}}
                                    onUnequip={() => unequipItem(slot, activeChar.id)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900/30">
                    {tab === 'ITEMS' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Mochila</h3>
                                <span className="text-xs text-slate-500">{inventory.length}/20 espacios</span>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {inventory.map((slot, idx) => (
                                    <RarityBorder key={idx} rarity={slot.item.rarity} className="aspect-square">
                                        <button 
                                            onClick={() => slot.item.type === 'consumable' ? consumeItem(slot.item.id) : equipItem(slot.item.id, activeChar.id)} 
                                            className="w-full h-full bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 flex items-center justify-center relative active:scale-95 transition-all"
                                        >
                                            <img src={slot.item.icon} className="w-10 h-10 md:w-8 md:h-8 object-contain invert" />
                                            {slot.quantity > 1 && (
                                                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                                                    {slot.quantity}
                                                </span>
                                            )}
                                        </button>
                                    </RarityBorder>
                                ))}
                                {/* Empty slots */}
                                {Array.from({ length: Math.max(0, 16 - inventory.length) }).map((_, idx) => (
                                    <div key={`empty-${idx}`} className="aspect-square bg-slate-900/50 rounded-xl border border-slate-800/50 border-dashed" />
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'EQUIP' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Todos los Slots</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                {Object.values(EquipmentSlot).map((slot) => (
                                    <EquipmentSlotItem
                                        key={slot}
                                        slot={slot}
                                        item={activeChar.equipment[slot]}
                                        onClick={() => {}}
                                        onUnequip={() => unequipItem(slot, activeChar.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'STATS' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Attributes */}
                            <div>
                                <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span>📊</span> Atributos
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {Object.entries(stats.attributes).map(([key, val]) => (
                                        <div key={key} className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl border border-slate-700">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{key}</div>
                                            <div className="text-3xl font-black text-white">{val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Derived Stats */}
                            <div>
                                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span>💪</span> Estadísticas
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-800/50 p-4 rounded-2xl">
                                        <div className="text-[10px] text-slate-500 uppercase">CA</div>
                                        <div className="text-2xl font-black text-white">{stats.ac || 10}</div>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-2xl">
                                        <div className="text-[10px] text-slate-500 uppercase">Iniciativa</div>
                                        <div className="text-2xl font-black text-white">+{stats.initiative || 0}</div>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-2xl">
                                        <div className="text-[10px] text-slate-500 uppercase">Velocidad</div>
                                        <div className="text-2xl font-black text-white">{stats.speed || 30} ft</div>
                                    </div>
                                    <div className="bg-slate-800/50 p-4 rounded-2xl">
                                        <div className="text-[10px] text-slate-500 uppercase">Salvación</div>
                                        <div className="text-2xl font-black text-white">+{stats.saveDC || 12}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Traits */}
                            {stats.traits && stats.traits.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span>✨</span> Rasgos
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {stats.traits.map((trait: string) => (
                                            <span 
                                                key={trait} 
                                                className="px-4 py-2 bg-gradient-to-r from-amber-900/50 to-slate-800 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-100"
                                            >
                                                {trait.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resistances */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="text-xs font-black text-red-400 uppercase tracking-widest mb-3">Resistencias</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {stats.resistances?.map((r: string) => (
                                            <span key={r} className="px-3 py-1 bg-red-900/30 border border-red-500/30 rounded-lg text-xs text-red-300">
                                                {r}
                                            </span>
                                        )) || <span className="text-xs text-slate-600">Ninguna</span>}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-3">Debilidades</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {stats.vulnerabilities?.map((v: string) => (
                                            <span key={v} className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 rounded-lg text-xs text-blue-300">
                                                {v}
                                            </span>
                                        )) || <span className="text-xs text-slate-600">Ninguna</span>}
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
