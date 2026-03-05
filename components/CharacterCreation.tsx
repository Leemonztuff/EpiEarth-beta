
import React, { useState, useMemo, useEffect } from 'react';
import { CharacterRace, CharacterClass, Attributes, Ability, Difficulty, GameState, EvolutionStage, ClassBranch } from '../types';
import { BASE_STATS, RACE_BONUS, getSprite, CLASS_CONFIG, RACE_ICONS, WESNOTH_BASE_URL, NOISE_TEXTURE_URL } from '../constants';
import { getModifier } from '../services/dndRules';
import { useGameStore } from '../store/gameStore';
import { useContentStore } from '../store/contentStore';
import { AuthModal } from './AuthModal';
import { SaveLoadModal } from './SaveLoadModal';
import { sfx } from '../services/SoundSystem';
import { AssetManager } from '../services/AssetManager';

const roll3d6 = (): number => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    return d1 + d2 + d3;
};

const StatBar: React.FC<{ label: string, value: number, bonus: number, baseValue: number, onIncrease: () => void, onDecrease: () => void, canIncrease: boolean, canDecrease: boolean }> = ({ label, value, bonus, baseValue, onIncrease, onDecrease, canIncrease, canDecrease }) => {
    const max = 20; 
    const totalValue = baseValue + value + bonus;
    const percentage = Math.min(100, (totalValue / max) * 100);
    const bonusPct = Math.min(100, (bonus / max) * 100);
    const basePct = Math.min(100, (baseValue / max) * 100);
    const allocatedPct = Math.min(100, (value / max) * 100);
    
    return (
        <div className="flex items-center gap-2 text-[10px] md:text-xs mb-1.5 w-full">
            <span className="w-8 font-black text-slate-500 uppercase shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden relative border border-slate-800">
                <div className="absolute top-0 left-0 h-full bg-slate-600 transition-all duration-300" style={{ width: `${percentage - bonusPct - allocatedPct}%` }} />
                <div className="absolute top-0 h-full bg-slate-500 transition-all duration-300" style={{ left: `${percentage - bonusPct - allocatedPct}%`, width: `${allocatedPct}%` }} />
                <div className="absolute top-0 h-full bg-amber-500 transition-all duration-300" style={{ left: `${percentage - bonusPct}%`, width: `${bonusPct}%` }} />
            </div>
            <span className={`w-8 text-right font-mono font-bold shrink-0 ${bonus > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{totalValue}</span>
            <div className="flex gap-1 shrink-0">
                <button onClick={onDecrease} disabled={!canDecrease} className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-20">-</button>
                <button onClick={onIncrease} disabled={!canIncrease} className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs text-amber-500 hover:bg-amber-900 disabled:opacity-20">+</button>
            </div>
        </div>
    );
};

export const TitleScreen: React.FC<{ onComplete: any }> = ({ onComplete }) => {
  const [view, setView] = useState<'MENU' | 'CREATION'>('MENU');
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'LINEAGE' | 'ATTRIBUTES'>('IDENTITY');
  const [name, setName] = useState('');
  const [race, setRace] = useState<CharacterRace>(CharacterRace.HUMAN);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [showAuth, setShowAuth] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  
  const [rolledPoints, setRolledPoints] = useState<number | null>(null);
  const [allocatedPoints, setAllocatedPoints] = useState<Attributes>({ STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 });
  
  const { userSession, setAdminMode } = useGameStore();
  const { isLoading } = useContentStore();

  const baseStats = BASE_STATS[CharacterClass.NOVICE];
  const raceBonus = RACE_BONUS[race];

  const handleRoll = () => {
      const points = roll3d6();
      setRolledPoints(points);
      setAllocatedPoints({ STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 });
      sfx.playUiClick();
  };

  const handlePointAllocation = (attr: Ability, delta: number) => {
      if (rolledPoints === null) return;
      const totalAllocated = Object.values(allocatedPoints).reduce((a, b) => a + b, 0);
      const remaining = rolledPoints - totalAllocated;

      if (delta > 0 && remaining > 0) {
          setAllocatedPoints(prev => ({ ...prev, [attr]: prev[attr] + 1 }));
      } else if (delta < 0 && allocatedPoints[attr] > 0) {
          setAllocatedPoints(prev => ({ ...prev, [attr]: prev[attr] - 1 }));
      }
  };

  const currentStats: Attributes = useMemo(() => {
      const result = { ...baseStats };
      (Object.keys(baseStats) as Ability[]).forEach(k => {
          result[k] = baseStats[k]! + allocatedPoints[k]!;
          if (raceBonus[k]) result[k] += raceBonus[k]!;
      });
      return result;
  }, [race, allocatedPoints]);

  const totalAllocated = Object.values(allocatedPoints).reduce((a, b) => a + b, 0);
  const remainingPoints = rolledPoints !== null ? rolledPoints - totalAllocated : 0;

  const spriteUrl = useMemo(() => AssetManager.getSafeSprite(getSprite(race, CharacterClass.NOVICE)), [race]);

  const handleAdminPortal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sfx.playUiClick();
    setAdminMode(true);
  };

  if (view === 'MENU') {
      return (
        <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-50" />
            
            <div className="relative z-10 mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
                <img src={AssetManager.getSafeSprite('items/gem-large-blue.png')} className="w-32 h-32 mx-auto drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] animate-pulse" />
                <h1 className="text-5xl md:text-8xl font-serif font-black text-white tracking-tighter mt-4">EPIC EARTH</h1>
                <div className="bg-red-600 text-white px-6 py-1 text-[10px] font-black uppercase tracking-[0.4em] mx-auto w-fit mt-2">Shards of Eternum</div>
            </div>

            <div className="z-10 flex flex-col gap-3 w-full max-w-xs">
                <button onClick={() => setView('CREATION')} className="bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform active:scale-95 shadow-xl">New Adventure</button>
                <button onClick={() => setShowLoad(true)} className="bg-slate-900 text-white border border-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors">Continue</button>
            </div>

            <div className="absolute bottom-6 right-6 z-20">
                <button 
                    onClick={handleAdminPortal}
                    className="p-4 bg-slate-900/60 hover:bg-slate-800 border border-white/10 rounded-2xl text-slate-500 hover:text-amber-500 transition-all flex items-center gap-3 group"
                    title="Admin Portal"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity hidden md:inline">Master Registry</span>
                    <span className="text-2xl">⚙️</span>
                </button>
            </div>

            {showLoad && <SaveLoadModal mode="load" onClose={() => setShowLoad(false)} />}
            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-300">
        <div className="relative w-full h-[30vh] md:h-full md:w-1/3 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shadow-2xl shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-800/20 to-black pointer-events-none" />
            
            <div className="absolute top-4 left-4 z-20">
                <button onClick={() => setView('MENU')} className="bg-black/60 backdrop-blur-md hover:bg-black/80 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all">← Menu</button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
                <div className="relative w-24 h-24 md:w-64 md:h-64 flex items-center justify-center">
                    <div className="absolute inset-0 bg-amber-500/10 blur-[40px] md:blur-[60px] rounded-full animate-pulse" />
                    <img 
                        src={spriteUrl} 
                        className="relative z-10 w-full h-full object-contain scale-[1.5] md:scale-[1.8] drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] transition-all"
                        onError={(e) => { e.currentTarget.src = AssetManager.getSafeSprite('units/human-loyalists/lieutenant.png'); }}
                    />
                </div>
                
                <div className="mt-2 md:mt-4 text-center z-10">
                    <h2 className="text-xl md:text-4xl font-serif font-black text-white truncate max-w-[240px] md:max-w-[280px] px-2 leading-none">
                        {name || <span className="opacity-20 italic">Unnamed Hero</span>}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Lvl 1</span>
                        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400">{race} • NOVICE</span>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-black/40 border-t border-slate-800 hidden md:block">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {Object.values(Ability).map(attr => (
                        <StatBar 
                            key={attr} 
                            label={attr} 
                            value={allocatedPoints[attr]} 
                            bonus={raceBonus[attr] || 0}
                            baseValue={baseStats[attr]!}
                            onIncrease={() => handlePointAllocation(attr, 1)}
                            onDecrease={() => handlePointAllocation(attr, -1)}
                            canIncrease={remainingPoints > 0}
                            canDecrease={allocatedPoints[attr] > 0}
                        />
                    ))}
                </div>
            </div>
        </div>

        <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
            <div className="flex border-b border-slate-800 bg-slate-900/50 shrink-0 sticky top-0 z-20">
                {(['IDENTITY', 'LINEAGE', 'ATTRIBUTES'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { sfx.playUiClick(); setActiveTab(tab); }}
                        className={`flex-1 py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === tab ? 'text-amber-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {tab === 'LINEAGE' ? 'RACE' : (tab === 'ATTRIBUTES' ? 'STATS' : tab)}
                        {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 shadow-[0_-2px_10px_rgba(245,158,11,0.5)]" />}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-12 pb-32 touch-pan-y custom-scrollbar">
                <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-right-2 duration-300" key={activeTab}>
                    {activeTab === 'IDENTITY' && (
                        <div className="space-y-8">
                            <div className="animate-in slide-in-from-bottom-4 duration-500">
                                <label className="block text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Character Name</label>
                                <input 
                                    type="text" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name..."
                                    maxLength={20}
                                    className="w-full bg-slate-900/50 border-2 border-slate-800 rounded-xl px-4 py-4 text-2xl text-white outline-none focus:border-amber-600 transition-all font-serif shadow-inner"
                                />
                                <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest font-bold">This name will be etched into history.</p>
                            </div>
                            <div className="animate-in slide-in-from-bottom-4 delay-100 duration-500">
                                <label className="block text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Challenge Level</label>
                                <div className="grid grid-cols-1 gap-3">
                                    {Object.values(Difficulty).map(d => (
                                        <button key={d} onClick={() => setDifficulty(d)} className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${difficulty === d ? 'bg-amber-900/20 border-amber-500' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'}`}>
                                            <div className="font-black text-sm text-white relative z-10 tracking-widest">{d}</div>
                                            <div className="text-[9px] text-slate-500 uppercase font-bold relative z-10 mt-1">{d === 'EASY' ? 'Adventure focus' : d === 'HARD' ? 'Tactical mastery' : 'Balanced rules'}</div>
                                            {difficulty === d && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl animate-pulse">✨</div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'LINEAGE' && (
                        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-bottom-4 duration-500">
                            {Object.values(CharacterRace).map(r => (
                                <button key={r} onClick={() => { setRace(r); sfx.playUiClick(); }} className={`p-4 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-3 group relative ${race === r ? 'bg-slate-800 border-amber-500 shadow-lg shadow-amber-900/10' : 'bg-slate-900/40 border-slate-800'}`}>
                                    <div className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center border border-white/5 overflow-hidden group-hover:scale-110 transition-transform">
                                        <img src={AssetManager.getSafeSprite(RACE_ICONS[r])} className={`w-8 h-8 object-contain transition-all ${race === r ? 'opacity-100' : 'opacity-40 invert grayscale group-hover:opacity-60'}`} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${race === r ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{r}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'ATTRIBUTES' && (
                        <div className="animate-in slide-in-from-bottom-4 duration-500">
                            {!rolledPoints ? (
                                <div className="text-center py-8">
                                    <div className="mb-6">
                                        <div className="text-6xl mb-4">🎲</div>
                                        <h3 className="text-2xl font-serif font-bold text-white mb-2">Roll for Potential</h3>
                                        <p className="text-sm text-slate-400">Tira 3d6 para determinar tus puntos de atributo disponibles. ¡Cada tirada es única!</p>
                                    </div>
                                    <button 
                                        onClick={handleRoll}
                                        className="bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-[0.2em] text-sm py-4 px-12 rounded-xl shadow-[0_0_20px_rgba(217,119,6,0.3)] active:scale-95 transition-all"
                                    >
                                        Roll 3d6
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h3 className="text-xl font-serif font-bold text-white">Points Available</h3>
                                            <p className="text-xs text-slate-500">Distribuye tus puntos libremente</p>
                                        </div>
                                        <div className={`text-3xl font-black ${remainingPoints > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {remainingPoints}
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        {Object.values(Ability).map(attr => (
                                            <StatBar 
                                                key={attr} 
                                                label={attr} 
                                                value={allocatedPoints[attr]} 
                                                bonus={raceBonus[attr] || 0}
                                                baseValue={baseStats[attr]!}
                                                onIncrease={() => handlePointAllocation(attr, 1)}
                                                onDecrease={() => handlePointAllocation(attr, -1)}
                                                canIncrease={remainingPoints > 0}
                                                canDecrease={allocatedPoints[attr] > 0}
                                            />
                                        ))}
                                    </div>

                                    <button 
                                        onClick={() => { setRolledPoints(null); setAllocatedPoints({ STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }); }}
                                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold uppercase text-xs tracking-widest rounded-xl border border-slate-700 transition-all"
                                    >
                                        Reroll
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 md:hidden animate-in fade-in duration-700">
                         <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-inner">
                            <h3 className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Attribute Distribution</h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                {Object.values(Ability).map(attr => (
                                    <StatBar 
                                        key={attr} 
                                        label={attr} 
                                        value={allocatedPoints[attr]} 
                                        bonus={raceBonus[attr] || 0}
                                        baseValue={baseStats[attr]!}
                                        onIncrease={() => handlePointAllocation(attr, 1)}
                                        onDecrease={() => handlePointAllocation(attr, -1)}
                                        canIncrease={remainingPoints > 0}
                                        canDecrease={allocatedPoints[attr] > 0}
                                    />
                                ))}
                            </div>
                         </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 bg-slate-950/95 border-t border-slate-800 backdrop-blur-xl flex gap-3 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
                {activeTab !== 'IDENTITY' && (
                    <button 
                        onClick={() => setActiveTab(prev => prev === 'ATTRIBUTES' ? 'LINEAGE' : 'IDENTITY')}
                        className="px-6 py-4 rounded-xl border border-slate-700 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] active:bg-slate-800 active:text-white transition-all shadow-lg"
                    >
                        Back
                    </button>
                )}
                
                <button 
                    onClick={() => {
                        if (activeTab === 'IDENTITY') setActiveTab('LINEAGE');
                        else if (activeTab === 'LINEAGE') {
                            if (rolledPoints === null) {
                                setActiveTab('ATTRIBUTES');
                            } else {
                                onComplete(name.trim() || `${race} Novice`, race, CharacterClass.NOVICE, currentStats, difficulty, EvolutionStage.NOVICE);
                            }
                        }
                        else onComplete(name.trim() || `${race} Novice`, race, CharacterClass.NOVICE, currentStats, difficulty, EvolutionStage.NOVICE);
                    }}
                    disabled={activeTab === 'ATTRIBUTES' && (rolledPoints === null || remainingPoints > 0)}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black uppercase tracking-[0.25em] text-xs py-4 rounded-xl shadow-[0_0_20px_rgba(217,119,6,0.3)] active:scale-[0.97] transition-all border-b-4 border-amber-800 disabled:border-slate-900"
                >
                    {activeTab === 'ATTRIBUTES' ? (remainingPoints > 0 ? 'Allocate All Points' : 'Begin Journey') : 'Next Step'}
                </button>
            </div>
        </div>
    </div>
  );
};
