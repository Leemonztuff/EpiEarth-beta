
import React from 'react';
import { Item } from '../types';
import { RARITY_COLORS } from '../constants';

interface BattleResultModalProps {
  type: 'victory' | 'defeat';
  rewards?: { xp: number; gold: number; items: Item[]; shards?: number };
  onContinue?: () => void;
  onRestart?: () => void;
  onQuit?: () => void;
}

export const BattleResultModal: React.FC<BattleResultModalProps> = ({ 
  type, 
  rewards, 
  onContinue, 
  onRestart, 
  onQuit 
}) => {
  const isVictory = type === 'victory';

  const renderIcon = (icon: string) => {
        if (icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('assets')) {
            return <img src={icon} className="w-8 h-8 object-contain drop-shadow-sm invert" alt="loot" />;
        }
        return <span className="text-xl">{icon || '📦'}</span>;
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500 pointer-events-auto">
      <div className={`
        relative w-full max-w-md p-1 rounded-2xl overflow-hidden shadow-2xl transform transition-all scale-100
        ${isVictory ? 'bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800' : 'bg-gradient-to-b from-slate-600 via-slate-800 to-black'}
      `}>
        <div className="bg-slate-950/90 m-0.5 rounded-[14px] p-8 text-center border border-white/10">
          
          <div className="mb-6 text-6xl animate-bounce">
            {isVictory ? '🏆' : '💀'}
          </div>

          <h2 className={`
            text-4xl md:text-5xl font-serif font-bold mb-2 tracking-wider
            ${isVictory ? 'text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500' : 'text-red-500'}
          `}>
            {isVictory ? 'VICTORY' : 'DEFEAT'}
          </h2>

          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

          {isVictory && rewards ? (
            <div className="space-y-4 mb-8 animate-in slide-in-from-bottom-4 delay-150 duration-700">
              <p className="text-slate-300 text-sm uppercase tracking-widest">Rewards Gained</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Experience</span>
                    <span className="text-xl font-bold text-purple-400">+{rewards.xp} XP</span>
                </div>
                <div className="bg-slate-900 p-3 rounded border border-slate-700">
                    <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Gold</span>
                    <span className="text-xl font-bold text-yellow-400">+{rewards.gold} G</span>
                </div>
                {rewards.shards ? (
                  <div className="bg-purple-900/40 p-3 rounded border border-purple-500/50 col-span-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse">
                    <span className="text-[10px] text-purple-400 uppercase font-black block mb-1 tracking-widest">Eternum Shards Harvested</span>
                    <span className="text-2xl font-bold text-purple-200">+{rewards.shards} 🔮</span>
                  </div>
                ) : null}
              </div>

              {rewards.items.length > 0 && (
                  <div className="mt-4">
                      <p className="text-xs text-slate-500 mb-2 font-bold">Items Found</p>
                      <div className="flex flex-wrap justify-center gap-2">
                          {rewards.items.map((item, i) => (
                              <div key={i} className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded border border-slate-700" title={item.description}>
                                  {renderIcon(item.icon)}
                                  <div className="text-left">
                                      <div className="text-[10px] font-bold text-slate-200 leading-tight">{item.name}</div>
                                      <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: RARITY_COLORS[item.rarity] }}>{item.rarity}</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
            </div>
          ) : (
            <div className="mb-8 text-slate-400 text-sm italic">
                The party has fallen. Their shards return to the void...
            </div>
          )}

          <div className="flex flex-col gap-3">
            {isVictory ? (
                <button 
                    onClick={onContinue}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow-lg transition-all transform hover:-translate-y-1 focus:ring-2 focus:ring-white outline-none"
                >
                    CONTINUE JOURNEY
                </button>
            ) : (
                <>
                    <button 
                        onClick={onRestart}
                        className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded shadow-lg transition-colors focus:ring-2 focus:ring-white outline-none"
                    >
                        LOAD LAST SAVE
                    </button>
                    <button 
                        onClick={onQuit}
                        className="w-full py-3 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 font-bold rounded transition-colors focus:ring-2 focus:ring-white outline-none"
                    >
                        QUIT TO TITLE
                    </button>
                </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
