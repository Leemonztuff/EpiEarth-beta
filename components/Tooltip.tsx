
import React from 'react';
import { ItemRarity, DamageType } from '../types';
import { RARITY_COLORS, DAMAGE_ICONS } from '../constants';

interface TooltipProps {
    title: string;
    subtitle?: string;
    description: string;
    rarity?: ItemRarity;
    stats?: React.ReactNode;
    position: { x: number, y: number };
    visible: boolean;
}

export const FloatingTooltip: React.FC<TooltipProps> = ({ title, subtitle, description, rarity, stats, position, visible }) => {
    if (!visible) return null;

    const rarityColor = rarity ? RARITY_COLORS[rarity] : '#94a3b8';

    return (
        <div 
            className="fixed z-[300] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
            style={{ 
                left: position.x + 20, 
                top: position.y - 40,
                width: '240px'
            }}
        >
            <div className="bg-slate-900/95 backdrop-blur-md border border-amber-600/40 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
                <div className="p-3 border-b border-white/5 bg-white/5">
                    <h4 className="text-sm font-serif font-black text-white leading-tight uppercase tracking-wide">{title}</h4>
                    {subtitle && <p className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color: rarityColor }}>{subtitle}</p>}
                </div>
                <div className="p-3 space-y-2 text-xs leading-relaxed text-slate-300 font-sans">
                    <p className="italic text-slate-400">"{description}"</p>
                    {stats && (
                        <div className="pt-2 border-t border-white/5 mt-2 flex flex-wrap gap-2">
                            {stats}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
