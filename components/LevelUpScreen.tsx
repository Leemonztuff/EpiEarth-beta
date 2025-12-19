
import React, { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { useContentStore } from '../store/contentStore';
import { GameState, Ability, Attributes, MagicSchool } from '../types';
import { sfx } from '../services/SoundSystem';
import { CLASS_TREES, SCHOOL_COLORS } from '../constants';

const SchoolSeal = ({ school }: { school: MagicSchool }) => {
    const seals: Record<MagicSchool, string> = {
        [MagicSchool.ABJURATION]: '🛡️', [MagicSchool.CONJURATION]: '🌀', [MagicSchool.DIVINATION]: '👁️',
        [MagicSchool.ENCHANTMENT]: '💖', [MagicSchool.EVOCATION]: '💥', [MagicSchool.ILLUSION]: '🎭',
        [MagicSchool.NECROMANCY]: '💀', [MagicSchool.TRANSMUTATION]: '🧪'
    };
    return (
        <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center text-2xl animate-[spin-slow_10s_linear_infinite]" style={{ borderColor: SCHOOL_COLORS[school], color: SCHOOL_COLORS[school] }}>
                {seals[school]}
            </div>
            <span className="text-[8px] font-black uppercase tracking-tighter opacity-60" style={{ color: SCHOOL_COLORS[school] }}>{school}</span>
        </div>
    );
};

export const LevelUpScreen = () => {
    const { party, applyLevelUp, setGameState } = useGameStore();
    const { spells, skills } = useContentStore();
    
    const [characterIndex, setCharacterIndex] = useState(0);
    const [phase, setPhase] = useState<'ATTRIBUTES' | 'MASTERY'>('ATTRIBUTES');
    const [pendingAttributes, setPendingAttributes] = useState<Partial<Attributes>>({});
    const [pointsRemaining, setPointsRemaining] = useState(2);
    const [selectedChoiceIds, setSelectedChoiceIds] = useState<string[]>([]);

    const character = party[characterIndex];
    const eligibleCharacters = party.filter(p => p.stats.xp >= p.stats.xpToNextLevel);
    const nextLevel = character ? character.stats.level + 1 : 1;

    const availableChoices = useMemo(() => {
        if (!character) return [];
        const tree = CLASS_TREES[character.stats.class] || [];
        const node = tree.find(n => n.level === nextLevel);
        return node?.choices || [];
    }, [character, nextLevel]);

    useEffect(() => {
        if (eligibleCharacters.length === 0) {
            setGameState(GameState.OVERWORLD);
        } else {
            const firstEligible = party.findIndex(p => p.id === eligibleCharacters[0].id);
            if (characterIndex !== firstEligible && pointsRemaining === 2) {
                setCharacterIndex(firstEligible);
            }
        }
    }, [eligibleCharacters.length, party, setGameState]);

    if (!character) return null;

    const handleAttributeChange = (attr: Ability, change: number) => {
        const currentBonus = pendingAttributes[attr] || 0;
        if (change > 0 && pointsRemaining > 0) {
            setPendingAttributes({ ...pendingAttributes, [attr]: currentBonus + 1 });
            setPointsRemaining(pointsRemaining - 1);
            sfx.playUiHover();
        } else if (change < 0 && currentBonus > 0) {
            setPendingAttributes({ ...pendingAttributes, [attr]: currentBonus - 1 });
            setPointsRemaining(pointsRemaining + 1);
            sfx.playUiHover();
        }
    };

    const goToMastery = () => {
        if (pointsRemaining > 0 && !confirm("You have unused points. Continue anyway?")) return;
        if (availableChoices.length > 0) {
            setPhase('MASTERY');
            sfx.playMagic();
        } else {
            handleConfirm();
        }
    };

    const handleConfirm = () => {
        applyLevelUp(character.id, pendingAttributes, selectedChoiceIds);
        sfx.playVictory();
        
        setPendingAttributes({});
        setPointsRemaining(2);
        setSelectedChoiceIds([]);
        setPhase('ATTRIBUTES');

        const nextEligible = party.findIndex((p, idx) => idx > characterIndex && p.stats.xp >= p.stats.xpToNextLevel);
        if (nextEligible !== -1) setCharacterIndex(nextEligible);
        else setGameState(GameState.OVERWORLD);
    };

    const toggleChoice = (id: string) => {
        setSelectedChoiceIds([id]);
        sfx.playUiClick();
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 md:p-6 animate-in fade-in duration-500 overflow-hidden">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-slate-950 to-black pointer-events-none" />

            <div className="relative max-w-5xl w-full h-full max-h-[85vh] bg-slate-900/80 backdrop-blur-xl border border-amber-500/30 rounded-2xl flex flex-col md:flex-row shadow-2xl overflow-hidden">
                
                {/* Panel Izquierdo: Resumen */}
                <div className="w-full md:w-80 bg-slate-950/50 p-6 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col items-center shrink-0">
                    <h2 className="text-xl font-serif font-bold text-amber-500 mb-6 uppercase tracking-widest">Level Up!</h2>
                    
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full animate-pulse" />
                        <div className="w-32 h-32 md:w-40 md:h-40 bg-slate-900 rounded-full border-4 border-amber-600/50 shadow-2xl overflow-hidden relative">
                            <img src={character.visual.spriteUrl} className="w-full h-full object-contain scale-[1.8] translate-y-4 pixelated" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-white font-black text-xl border-2 border-slate-900 shadow-lg">
                            {nextLevel}
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h3 className="text-xl font-bold text-white mb-1">{character.name}</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">{character.stats.race} • {character.stats.class}</p>
                    </div>

                    <div className="w-full space-y-2">
                         {Object.values(Ability).map(attr => (
                             <div key={attr} className="flex justify-between text-[10px] font-bold">
                                 <span className="text-slate-500 uppercase">{attr}</span>
                                 <span className="text-white font-mono">{character.stats.baseAttributes[attr]}</span>
                             </div>
                         ))}
                    </div>
                </div>

                {/* Panel Derecho: Contenido dinámico */}
                <div className="flex-1 flex flex-col p-6 md:p-10 overflow-y-auto custom-scrollbar relative">
                    
                    {phase === 'ATTRIBUTES' ? (
                        <div className="animate-in slide-in-from-right-4 duration-300">
                            <header className="mb-8 border-b border-white/5 pb-4">
                                <h4 className="text-2xl font-serif font-bold text-slate-100 mb-2">Enhance Attributes</h4>
                                <p className="text-sm text-slate-400">Allocate points to strengthen your base capabilities. <span className="text-amber-400 font-bold font-mono">Remaining: {pointsRemaining}</span></p>
                            </header>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.values(Ability).map(attr => {
                                    const bonus = pendingAttributes[attr] || 0;
                                    const total = character.stats.baseAttributes[attr] + bonus;
                                    return (
                                        <div key={attr} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${bonus > 0 ? 'bg-amber-900/10 border-amber-500/50' : 'bg-slate-950/40 border-slate-800'}`}>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">{attr}</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-2xl font-mono font-black text-white">{total}</span>
                                                    {bonus > 0 && <span className="text-xs font-bold text-amber-500 animate-pulse">+{bonus}</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAttributeChange(attr, -1)} disabled={bonus === 0} className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xl text-slate-400 hover:bg-slate-700 disabled:opacity-20">-</button>
                                                <button onClick={() => handleAttributeChange(attr, 1)} disabled={pointsRemaining === 0} className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xl text-amber-500 hover:bg-amber-900 disabled:opacity-20">+</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-12">
                                <button onClick={goToMastery} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest rounded-xl shadow-2xl transition-all active:scale-95">
                                    {availableChoices.length > 0 ? 'Choose Mastery →' : 'Finalize Level Up'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                            <header className="mb-8 border-b border-white/5 pb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-2xl font-serif font-bold text-slate-100 uppercase tracking-wide">Path of Mastery</h4>
                                    <button onClick={() => setPhase('ATTRIBUTES')} className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">← Attributes</button>
                                </div>
                                <p className="text-sm text-slate-400">Select one specialization to unlock new tactical possibilities or permanent traits.</p>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                                {availableChoices.map((opt) => {
                                    const isSelected = selectedChoiceIds.includes(opt.id);
                                    const skillData = opt.unlocksSkill ? skills[opt.unlocksSkill] : null;
                                    const spellData = opt.unlocksSpell ? spells[opt.unlocksSpell] : null;
                                    const isPassive = !!opt.passiveEffect;
                                    const school = opt.magicSchool || (spellData?.school);
                                    
                                    return (
                                        <button 
                                            key={opt.id} 
                                            onClick={() => toggleChoice(opt.id)}
                                            className={`relative text-left p-6 rounded-2xl border-2 transition-all group flex flex-col h-full ${isSelected ? (isPassive ? 'bg-emerald-900/20 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-purple-900/20 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)]') : 'bg-slate-950/40 border-slate-800 hover:border-slate-600'}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl transition-all ${isSelected ? (isPassive ? 'bg-emerald-500 text-white shadow-lg' : 'bg-purple-500 text-white shadow-lg') : 'bg-slate-900 text-slate-600'}`}>
                                                    {isPassive ? '🛡️' : (opt.unlocksSpell ? '✨' : '⚔️')}
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    {isSelected && <div className={`${isPassive ? 'bg-emerald-500' : 'bg-purple-500'} text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest mb-2`}>Selected</div>}
                                                    {school && <SchoolSeal school={school} />}
                                                </div>
                                            </div>
                                            
                                            <h5 className={`text-lg font-serif font-bold mb-2 ${isSelected ? (isPassive ? 'text-emerald-200' : 'text-purple-200') : 'text-slate-100'}`}>{opt.featureName}</h5>
                                            <p className="text-xs text-slate-400 leading-relaxed flex-1 mb-4">{opt.description}</p>
                                            
                                            {(skillData || spellData) ? (
                                                <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase mb-1">
                                                        <span>{spellData ? 'Spellcasting' : 'Combat Utility'}</span>
                                                        <span className="text-amber-500">Range {skillData?.range || spellData?.range || 0}</span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-300 italic line-clamp-2">
                                                        {skillData?.description || spellData?.description}
                                                    </div>
                                                </div>
                                            ) : isPassive && (
                                                <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                                                    <div className="flex justify-between text-[10px] font-black text-emerald-500/60 uppercase mb-1">
                                                        <span>Trait Synergy</span>
                                                    </div>
                                                    <div className="text-[10px] text-emerald-100/60 italic">
                                                        Effects are applied automatically during combat or exploration.
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-12">
                                <button 
                                    onClick={handleConfirm}
                                    disabled={selectedChoiceIds.length === 0}
                                    className={`w-full py-4 disabled:opacity-30 disabled:grayscale text-white font-black uppercase tracking-widest rounded-xl shadow-2xl transition-all active:scale-95 ${availableChoices.some(c => selectedChoiceIds.includes(c.id) && !!c.passiveEffect) ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-purple-600 hover:bg-purple-500'}`}
                                >
                                    Finalize Mastery
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
