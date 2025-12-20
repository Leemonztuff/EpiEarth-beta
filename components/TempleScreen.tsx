
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { GameState } from '../types';
import { sfx } from '../services/SoundSystem';

export const TempleScreen: React.FC = () => {
    const { setGameState, party, characterPool } = useGameStore();

    const handleExit = () => {
        sfx.playUiClick();
        setGameState(GameState.OVERWORLD);
    };

    const goToSummon = () => {
        sfx.playMagic();
        setGameState(GameState.SUMMONING);
    };

    const goToParty = () => {
        sfx.playUiClick();
        setGameState(GameState.PARTY_MANAGEMENT);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center overflow-y-auto custom-scrollbar">
            {/* Background */}
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/40 via-black to-black pointer-events-none" />
            <div className="fixed inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} />

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-4xl p-6 md:p-10 flex flex-col items-center text-center pt-20 pb-20">
                
                <div className="mb-10 md:mb-16">
                    <span className="text-purple-500 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs mb-2 block animate-pulse">Sanctuary of Souls</span>
                    <h1 className="text-4xl md:text-7xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-100 to-purple-600 drop-shadow-[0_0_20px_rgba(168,85,247,0.6)] uppercase">
                        The Temple
                    </h1>
                    <div className="h-px w-32 md:w-48 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mx-auto mt-4" />
                </div>

                {/* Menu Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-3xl">
                    
                    {/* SUMMON CARD */}
                    <button 
                        onClick={goToSummon}
                        className="group relative bg-slate-900/60 backdrop-blur-md border border-purple-500/30 p-6 md:p-10 rounded-2xl overflow-hidden hover:border-purple-400 transition-all hover:-translate-y-1 shadow-lg hover:shadow-purple-900/30 text-left active:scale-[0.98]"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                            <span className="text-5xl md:text-7xl grayscale group-hover:grayscale-0">🔮</span>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xl md:text-2xl font-black text-white mb-3 group-hover:text-purple-300 transition-colors uppercase tracking-tight">Summon Hero</h3>
                            <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-medium">
                                Perform rituals to pull souls from the void. Use your camera or local entropy to generate unique heroes for your cause.
                            </p>
                            <div className="mt-6 text-[10px] md:text-xs font-black text-purple-500 uppercase tracking-widest flex items-center gap-2 group-hover:translate-x-2 transition-all">
                                <span>Begin Ritual</span> <span>→</span>
                            </div>
                        </div>
                    </button>

                    {/* PARTY CARD */}
                    <button 
                        onClick={goToParty}
                        className="group relative bg-slate-900/60 backdrop-blur-md border border-blue-500/30 p-6 md:p-10 rounded-2xl overflow-hidden hover:border-blue-400 transition-all hover:-translate-y-1 shadow-lg hover:shadow-blue-900/30 text-left active:scale-[0.98]"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                            <span className="text-5xl md:text-7xl grayscale group-hover:grayscale-0">🛡️</span>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xl md:text-2xl font-black text-white mb-3 group-hover:text-blue-300 transition-colors uppercase tracking-tight">Manage Party</h3>
                            <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-medium">
                                Organize your active team and reserve pool. Swap heroes, inspect capabilities, and prepare for the coming rift.
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                                <div className="text-[10px] font-mono bg-blue-900/30 px-2 py-1 rounded border border-blue-500/20">
                                    <span className="text-blue-300">{party.length} ACTIVE</span>
                                </div>
                                <div className="text-[10px] font-mono bg-slate-800/50 px-2 py-1 rounded border border-white/5">
                                    <span className="text-slate-400">{characterPool.length} RESERVE</span>
                                </div>
                            </div>
                            <div className="mt-6 text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 group-hover:translate-x-2 transition-all">
                                <span>Organize Team</span> <span>→</span>
                            </div>
                        </div>
                    </button>

                </div>

                <button 
                    onClick={handleExit}
                    className="mt-16 md:mt-24 bg-slate-900/40 hover:bg-slate-800 text-slate-500 hover:text-white uppercase text-[10px] font-black tracking-[0.3em] border border-slate-800 hover:border-slate-600 px-10 py-4 rounded-full transition-all shadow-xl"
                >
                    Return to World
                </button>

            </div>
        </div>
    );
};
