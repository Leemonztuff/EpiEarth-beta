
// @ts-nocheck
import React, { useEffect, useState } from 'react';

interface HealthBarProps {
    current: number;
    max: number;
    width?: string;
    height?: string;
    showText?: boolean;
    animated?: boolean;
    variant?: 'default' | 'small' | 'compact';
    className?: string;
}

export const HealthBar: React.FC<HealthBarProps> = ({
    current,
    max,
    width = 'w-full',
    height = 'h-3',
    showText = true,
    animated = true,
    variant = 'default',
    className = ''
}) => {
    const [displayHealth, setDisplayHealth] = useState(current);
    const [isAnimating, setIsAnimating] = useState(false);
    
    const percentage = Math.max(0, Math.min(100, (displayHealth / max) * 100));
    const isCritical = percentage <= 25;
    const isLow = percentage <= 50;
    
    const getColor = () => {
        if (isCritical) return 'bg-red-500';
        if (isLow) return 'bg-orange-500';
        return 'bg-emerald-500';
    };

    const getGlow = () => {
        if (isCritical) return 'shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse';
        if (isLow) return 'shadow-[0_0_8px_rgba(249,115,22,0.6)]';
        return 'shadow-[0_0_8px_rgba(16,185,129,0.5)]';
    };

    useEffect(() => {
        if (!animated) {
            setDisplayHealth(current);
            return;
        }
        
        if (current !== displayHealth) {
            setIsAnimating(true);
            const diff = current - displayHealth;
            const steps = Math.abs(diff);
            const stepTime = Math.max(20, Math.min(100, 300 / steps));
            let step = 0;
            
            const interval = setInterval(() => {
                step++;
                if (step >= steps) {
                    setDisplayHealth(current);
                    setIsAnimating(false);
                    clearInterval(interval);
                } else {
                    setDisplayHealth(prev => prev + Math.sign(diff));
                }
            }, stepTime);
            
            return () => clearInterval(interval);
        }
    }, [current, animated]);

    const sizeClasses = {
        default: 'h-3',
        small: 'h-2',
        compact: 'h-1.5'
    };

    const textSizes = {
        default: 'text-xs',
        small: 'text-[10px]',
        compact: 'text-[8px]'
    };

    return (
        <div className={`flex flex-col gap-0.5 ${width} ${className}`}>
            {showText && (
                <div className={`flex justify-between items-center ${textSizes[variant]}`}>
                    <span className="text-white/70 font-medium">HP</span>
                    <span className={`font-mono font-bold ${isCritical ? 'text-red-400' : 'text-white'}`}>
                        {Math.max(0, displayHealth)}/{max}
                    </span>
                </div>
            )}
            <div className={`relative ${sizeClasses[variant]} bg-slate-800 rounded-full overflow-hidden border border-white/10`}>
                <div 
                    className={`
                        absolute inset-y-0 left-0 rounded-full 
                        ${getColor()} ${getGlow()}
                        transition-all duration-300 ease-out
                        ${isAnimating ? 'brightness-110' : 'brightness-100'}
                    `}
                    style={{ width: `${percentage}%` }}
                >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/20" />
                </div>
                
                {/* Critical warning indicator */}
                {isCritical && (
                    <div className="absolute inset-0 animate-ping opacity-30">
                        <div className="w-full h-full bg-red-500" />
                    </div>
                )}
            </div>
        </div>
    );
};

// Mana/Resource bar similar
export const ResourceBar: React.FC<{
    current: number;
    max: number;
    type: 'mana' | 'stamina' | 'rage';
    showText?: boolean;
    className?: string;
}> = ({ current, max, type, showText = true, className = '' }) => {
    const percentage = Math.max(0, Math.min(100, (current / max) * 100));
    
    const config = {
        mana: { color: 'bg-blue-500', glow: 'shadow-[0_0_10px_rgba(59,130,246,0.6)]', icon: '🔮' },
        stamina: { color: 'bg-green-500', glow: 'shadow-[0_0_10px_rgba(34,197,94,0.6)]', icon: '⚡' },
        rage: { color: 'bg-red-600', glow: 'shadow-[0_0_10px_rgba(220,38,38,0.6)]', icon: '🔥' }
    };
    
    const { color, glow, icon } = config[type];

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-xs opacity-70">{icon}</span>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                <div 
                    className={`h-full ${color} ${glow} transition-all duration-300 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showText && (
                <span className="text-[10px] font-mono text-white/70">{current}/{max}</span>
            )}
        </div>
    );
};

// XP Progress bar
export const XPBar: React.FC<{ current: number; nextLevel: number; level: number }> = ({ 
    current, 
    nextLevel, 
    level 
}) => {
    const percentage = Math.max(0, Math.min(100, (current / nextLevel) * 100));

    return (
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-900 border-2 border-purple-400 flex items-center justify-center font-black text-white text-xs shadow-lg">
                {level}
            </div>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
                <div 
                    className="h-full bg-gradient-to-r from-purple-600 via-purple-400 to-purple-600 shadow-[0_0_10px_rgba(147,51,234,0.6)] animate-pulse"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-[10px] font-mono text-purple-300">{current}/{nextLevel} XP</span>
        </div>
    );
};
