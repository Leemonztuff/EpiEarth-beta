// @ts-nocheck
import React, { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Spell, SpellType } from '../../types';

interface BattleSpellMenuProps {
    onClose: () => void;
}

export const BattleSpellMenu: React.FC<BattleSpellMenuProps> = ({ onClose }) => {
    const { party, turnOrder, currentTurnIndex, battleEntities, executeSpell } = useGameStore();
    
    const currentEntityId = turnOrder?.[currentTurnIndex];
    const currentEntity = battleEntities?.find(e => e.id === currentEntityId);
    const partyMember = party?.find(p => p.id === currentEntity?.id);
    
    const spells = useMemo(() => {
        const knownSpells = partyMember?.stats?.knownSpells || [];
        const contentStore = useContentStore.getState();
        return knownSpells.map(spellId => contentStore.spells[spellId]).filter(Boolean);
    }, [partyMember]);
    
    const handleCastSpell = async (spell: Spell) => {
        onClose();
    };
    
    if (!currentEntity || currentEntity.type !== 'PLAYER') {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-white/20 rounded-2xl p-4 shadow-2xl w-[360px] max-h-[80vh] overflow-hidden animate-scale-in">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">✨ Hechizos</h2>
                    <button 
                        onClick={onClose}
                        className="text-white/50 hover:text-white text-xl"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="text-white/60 text-xs mb-3">
                    Selecciona un hechizo para lanzar
                </div>
                
                {spells.length === 0 ? (
                    <div className="text-center py-8 text-white/40">
                        <div className="text-4xl mb-2">✨</div>
                        <div>No conoces hechizos</div>
                        <div className="text-xs mt-1">Aprende hechizos al subir de nivel</div>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {spells.map((spell: Spell, idx: number) => {
                            if (!spell) return null;
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleCastSpell(spell)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-purple-500/30 hover:border-purple-400/50 transition-all active:scale-95 group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-purple-900/50 flex items-center justify-center text-2xl border border-purple-500/30">
                                        {spell.icon || '✨'}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-white font-bold text-sm">{spell.name}</div>
                                        <div className="text-white/50 text-xs">{spell.description}</div>
                                        <div className="flex gap-2 mt-1">
                                            {spell.damage && (
                                                <span className="text-red-400 text-xs">⚔️ {spell.damage.diceCount}d{spell.damage.diceSides}</span>
                                            )}
                                            {spell.heal && (
                                                <span className="text-emerald-400 text-xs">❤️ {spell.heal.diceCount}d{spell.heal.diceSides}</span>
                                            )}
                                            <span className="text-purple-300 text-xs">📏 {spell.range}</span>
                                        </div>
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
