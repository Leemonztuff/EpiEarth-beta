
import React, { useState, useMemo, useEffect } from 'react';
import { CharacterRace, CharacterClass, Attributes, Ability, Difficulty, GameState } from '../types';
import { BASE_STATS, RACE_BONUS, getSprite, CLASS_CONFIG, RACE_ICONS, WESNOTH_BASE_URL, NOISE_TEXTURE_URL } from '../constants';
import { getModifier } from '../services/dndRules';
import { useGameStore } from '../store/gameStore';
import { useContentStore } from '../store/contentStore';
import { AuthModal } from './AuthModal';
import { SaveLoadModal } from './SaveLoadModal';
import { sfx } from '../services/SoundSystem';

const StatBar: React.FC<{ label: string, value: number, bonus: number }> = ({ label, value, bonus }) => {
    const max = 20; 
    const percentage = Math.min(100, (value / max) * 100);
    const bonusPct = Math.min(100, (bonus / max) * 100);
    
    return (
        <div className="flex items-center gap-2 text-[10px] md:text-xs mb-1.5 w-full">
            <span className="w-8 font-black text-slate-500 uppercase shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden relative border border-slate-800">
                <div className="absolute top-0 left-0 h-full bg-slate-600 transition-all duration-300" style={{ width: `${percentage - bonusPct}%` }} />
                <div className="absolute top-0 h-full bg-amber-500 transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]" style={{ left: `${percentage - bonusPct}%`, width: `${bonusPct}%` }} />
            </div>
            <span className={`w-6 text-right font-mono font-bold shrink-0 ${bonus > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{value}</span>
        </div>
    );
};

export const TitleScreen: React.FC<{ onComplete: any }> = ({ onComplete }) => {
  const [view, setView] = useState<'MENU' | 'CREATION'>('MENU');
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'LINEAGE' | 'VOCATION'>('IDENTITY');
  const [name, setName] = useState('');
  const [race, setRace] = useState<CharacterRace>(CharacterRace.HUMAN);
  const [cls, setCls] = useState<CharacterClass>(CharacterClass.FIGHTER);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [showAuth, setShowAuth] = useState(false);
  const [showLoad, setShowLoad] = useState(false);
  
  const { userSession } = useGameStore();
  const { isLoading } = useContentStore();

  const currentStats: Attributes = useMemo(() => {
      const base = { ...BASE_STATS[cls] };
      const bonus = RACE_BONUS[race];
      const result = { ...base };
      (Object.keys(base) as Ability[]).forEach(k => { if (bonus[k]) result[k] += bonus[k]!; });
      return result;
  }, [race, cls]);

  const spriteUrl = useMemo(() => getSprite(race, cls), [race, cls]);

  if (view === 'MENU') {
      return (
        <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black opacity-50" />
            
            <div className="relative z-10 mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
                <img src={`${WESNOTH_BASE_URL}/items/gem-large-blue.png`} className="w-32 h-32 mx-auto drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] animate-pulse" />
                <h1 className="text-5xl md:text-8xl font-serif font-black text-white tracking-tighter mt-4">EPIC EARTH</h1>
                <div className="bg-red-600 text-white px-6 py-1 text-[10px] font-black uppercase tracking-[0.4em] mx-auto w-fit mt-2">Shards of Eternum</div>
            </div>

            <div className="z-10 flex flex-col gap-3 w-full max-w-xs">
                <button onClick={() => setView('CREATION')} className="bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-transform active:scale-95 shadow-xl">New Adventure</button>
                <button onClick={() => setShowLoad(true)} className="bg-slate-900 text-white border border-slate-700 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors">Continue</button>
            </div>

            {showLoad && <SaveLoadModal mode="load" onClose={() => setShowLoad(false)} />}
            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-300">
        {/* Preview Panel */}
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
                        className="relative z-10 w-full h-full object-contain pixelated scale-[1.5] md:scale-[1.8] drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] transition-all"
                        onError={(e) => { e.currentTarget.src = `${WESNOTH_BASE_URL}/units/human-loyalists/lieutenant.png`; }}
                    />
                </div>
                
                <div className="mt-2 md:mt-4 text-center z-10">
                    <h2 className="text-xl md:text-4xl font-serif font-black text-white truncate max-w-[240px] md:max-w-[280px] px-2 leading-none">
                        {name || <span className="opacity-20 italic">Unnamed Hero</span>}
                    </h2>
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Lvl 1</span>
                        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-slate-400">{race} • {cls}</span>
                    </div>
                </div>
            </div>

            {/* Desktop Stats (Hidden on Mobile view top) */}
            <div className="p-6 bg-black/40 border-t border-slate-800 hidden md:block">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {Object.values(Ability).map(attr => (
                        <StatBar key={attr} label={attr} value={currentStats[attr]} bonus={RACE_BONUS[race][attr] || 0} />
                    ))}
                </div>
            </div>
        </div>

        {/* Customization Options */}
        <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
            {/* Mobile-Friendly Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-900/50 shrink-0 sticky top-0 z-20">
                {(['IDENTITY', 'LINEAGE', 'VOCATION'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { sfx.playUiClick(); setActiveTab(tab); }}
                        className={`flex-1 py-4 text-[10px] md:text-xs font-black uppercase tracking-[0.15em] transition-all relative ${activeTab === tab ? 'text-amber-400 bg-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {tab === 'LINEAGE' ? 'RACE' : (tab === 'VOCATION' ? 'CLASS' : tab)}
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
                                        <img src={RACE_ICONS[r]} className={`w-8 h-8 object-contain transition-all ${race === r ? 'opacity-100' : 'opacity-40 invert grayscale group-hover:opacity-60'}`} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${race === r ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{r}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'VOCATION' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-bottom-4 duration-500">
                            {Object.values(CharacterClass).map(c => (
                                <button key={c} onClick={() => { setCls(c); sfx.playUiClick(); }} className={`p-4 rounded-xl border-2 transition-all text-left group relative ${cls === c ? 'bg-slate-800 border-amber-500 shadow-lg shadow-amber-900/10' : 'bg-slate-900/40 border-slate-800'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[11px] font-black uppercase tracking-widest ${cls === c ? 'text-amber-400' : 'text-white'}`}>{c}</span>
                                        <div className="w-6 h-6 bg-black/30 rounded flex items-center justify-center overflow-hidden">
                                            <img src={CLASS_CONFIG[c]?.icon || RACE_ICONS[CharacterRace.HUMAN]} className={`w-5 h-5 object-contain transition-all ${cls === c ? 'opacity-100' : 'opacity-20 grayscale group-hover:opacity-40'}`} onError={e => e.currentTarget.style.display='none'} />
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter leading-tight">{CLASS_CONFIG[c]?.archetype || 'Fated Hero'}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Show stats on mobile within the content scroll to avoid layout crunch */}
                    <div className="mt-8 md:hidden animate-in fade-in duration-700">
                         <div className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-inner">
                            <h3 className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Attribute Distribution</h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                                {Object.values(Ability).map(attr => (
                                    <StatBar key={attr} label={attr} value={currentStats[attr]} bonus={RACE_BONUS[race][attr] || 0} />
                                ))}
                            </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Bottom Floating Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-slate-950/95 border-t border-slate-800 backdrop-blur-xl flex gap-3 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
                {activeTab !== 'IDENTITY' && (
                    <button 
                        onClick={() => setActiveTab(prev => prev === 'VOCATION' ? 'LINEAGE' : 'IDENTITY')}
                        className="px-6 py-4 rounded-xl border border-slate-700 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] active:bg-slate-800 active:text-white transition-all shadow-lg"
                    >
                        Back
                    </button>
                )}
                
                <button 
                    onClick={() => {
                        if (activeTab === 'IDENTITY') setActiveTab('LINEAGE');
                        else if (activeTab === 'LINEAGE') setActiveTab('VOCATION');
                        else onComplete(name.trim() || `${race} ${cls}`, race, cls, currentStats, difficulty);
                    }}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-[0.25em] text-xs py-4 rounded-xl shadow-[0_0_20px_rgba(217,119,6,0.3)] active:scale-[0.97] transition-all border-b-4 border-amber-800"
                >
                    {activeTab === 'VOCATION' ? 'Embark Journey' : 'Next Step'}
                </button>
            </div>
        </div>
    </div>
  );
};
