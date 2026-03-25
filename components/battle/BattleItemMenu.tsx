// @ts-nocheck
import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { Item, ItemRarity } from '../../types';

interface BattleItemMenuProps {
    onClose: () => void;
}

const RARITY_COLORS: Record<ItemRarity, string> = {
    [ItemRarity.COMMON]: '#94a3b8',
    [ItemRarity.UNCOMMON]: '#22c55e',
    [ItemRarity.RARE]: '#3b82f6',
    [ItemRarity.VERY_RARE]: '#a855f7',
    [ItemRarity.LEGENDARY]: '#f59e0b'
};

export const BattleItemMenu: React.FC<BattleItemMenuProps> = ({ onClose }) => {
    const { party, turnOrder, currentTurnIndex, battleEntities, executeItem } = useGameStore();
    
    const currentEntityId = turnOrder?.[currentTurnIndex];
    const currentEntity = battleEntities?.find(e => e.id === currentEntityId);
    const partyMember = party?.find(p => p.id === currentEntity?.id);
    
    const consumables = partyMember?.inventory?.filter((slot: any) => 
        slot?.item?.type === 'consumable' || slot?.item?.effect?.type === 'HEAL'
    ) || [];
    
    const handleUseItem = async (item: any) => {
        await executeItem(item);
        onClose();
    };
    
    if (!currentEntity || currentEntity.type !== 'PLAYER') {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-white/20 rounded-2xl p-4 shadow-2xl w-[320px] max-h-[80vh] overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">🎒 Items de Batalla</h2>
                    <button 
                        onClick={onClose}
                        className="text-white/50 hover:text-white text-xl"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="text-white/60 text-xs mb-3">
                    Selecciona un item para usar en batalla
                </div>
                
                {consumables.length === 0 ? (
                    <div className="text-center py-8 text-white/40">
                        <div className="text-4xl mb-2">🎒</div>
                        <div>No tienesitems consumibles</div>
                        <div className="text-xs mt-1">Compra pociones en la tienda</div>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {consumables.map((slot: any, idx: number) => {
                            const item = slot?.item;
                            if (!item) return null;
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleUseItem(item)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 transition-all active:scale-95 group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-2xl border border-white/10">
                                        {item.icon || '🧪'}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-white font-bold text-sm">{item.name}</div>
                                        <div className="text-white/50 text-xs">{item.description}</div>
                                        {item.effect?.type === 'HEAL' && (
                                            <div className="text-emerald-400 text-xs mt-1">
                                                ❤️ Cura {item.effect.fixedValue || '1d6+2'} HP
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-white/30 text-xs">
                                        ×{slot.quantity || 1}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
                
                <div className="mt-4 pt-3 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white/60 hover:text-white text-sm transition-all"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
