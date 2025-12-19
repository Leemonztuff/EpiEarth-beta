
import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Ability } from '../types';

export const NarrativeEventModal: React.FC = () => {
    const { activeNarrativeEvent, resolveNarrativeOption } = useGameStore();

    if (!activeNarrativeEvent) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-slate-900 border-2 border-amber-600/50 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
                {/* Banner */}
                <div className="bg-gradient-to-r from-amber-900 to-slate-900 p-6 border-b border-amber-600/30">
                    <h2 className="text-2xl font-serif font-bold text-amber-100 tracking-wider">
                        {activeNarrativeEvent.title}
                    </h2>
                </div>

                {/* Content */}
                <div className="p-8">
                    <p className="text-slate-300 text-lg leading-relaxed mb-8 font-serif italic">
                        "{activeNarrativeEvent.description}"
                    </p>

                    <div className="space-y-3">
                        {activeNarrativeEvent.options.map((opt, i) => (
                            <button
                                key={i}
                                onClick={() => resolveNarrativeOption(i)}
                                className="w-full text-left p-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 hover:border-amber-500 transition-all group relative overflow-hidden"
                            >
                                <div className="flex justify-between items-center relative z-10">
                                    <span className="text-slate-100 font-bold">{opt.label}</span>
                                    {opt.requirement && (
                                        <span className="text-[10px] font-black uppercase tracking-tighter bg-amber-900/50 text-amber-400 px-2 py-1 rounded border border-amber-500/30">
                                            {opt.requirement.ability} Check (DC {opt.requirement.dc})
                                        </span>
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-amber-500/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-950 p-4 text-center">
                    <span className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">Destiny is being written...</span>
                </div>
            </div>
        </div>
    );
};
