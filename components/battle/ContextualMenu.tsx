// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

interface ContextualMenuProps {
    targetEntity: any;
    position: { x: number; y: number };
    onClose: () => void;
}

const ActionButton = ({ 
    icon, label, description, shortcut, color, onClick, disabled 
}: { 
    icon: string; label: string; description?: string; shortcut?: string; 
    color: 'blue' | 'red' | 'purple' | 'amber' | 'emerald' | 'gray';
    onClick: () => void; disabled?: boolean;
}) => {
    const colors = {
        blue: { bg: 'from-blue-600 to-blue-700', border: 'border-blue-400/40', hover: 'hover:from-blue-500 hover:to-blue-600', glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]', icon: 'text-blue-300' },
        red: { bg: 'from-red-600 to-red-700', border: 'border-red-400/40', hover: 'hover:from-red-500 hover:to-red-600', glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]', icon: 'text-red-300' },
        purple: { bg: 'from-purple-600 to-purple-700', border: 'border-purple-400/40', hover: 'hover:from-purple-500 hover:to-purple-600', glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]', icon: 'text-purple-300' },
        amber: { bg: 'from-amber-600 to-amber-700', border: 'border-amber-400/40', hover: 'hover:from-amber-500 hover:to-amber-600', glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]', icon: 'text-amber-300' },
        emerald: { bg: 'from-emerald-600 to-emerald-700', border: 'border-emerald-400/40', hover: 'hover:from-emerald-500 hover:to-emerald-600', glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]', icon: 'text-emerald-300' },
        gray: { bg: 'from-slate-600 to-slate-700', border: 'border-white/10', hover: 'hover:from-slate-500 hover:to-slate-600', glow: '', icon: 'text-slate-300' }
    };
    const c = colors[color];
    
    if (disabled) {
        return (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/50 border border-white/5 opacity-40 cursor-not-allowed">
                <span className="text-lg">{icon}</span>
                <div className="flex-1">
                    <div className="text-white/60 text-xs font-bold uppercase">{label}</div>
                    {description && <div className="text-white/30 text-[10px]">{description}</div>}
                </div>
                {shortcut && <div className="text-white/20 text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded">{shortcut}</div>}
            </div>
        );
    }
    
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r ${c.bg} ${c.border} border ${c.hover} ${c.glow} transition-all duration-200 active:scale-95 group`}
        >
            <span className={`text-lg filter drop-shadow-sm group-hover:scale-110 transition-transform ${c.icon}`}>{icon}</span>
            <div className="flex-1 text-left">
                <div className="text-white text-xs font-bold uppercase tracking-wide">{label}</div>
                {description && <div className="text-white/60 text-[10px]">{description}</div>}
            </div>
            {shortcut && <div className="text-white/50 text-[10px] font-mono bg-black/20 px-1.5 py-0.5 rounded">{shortcut}</div>}
        </button>
    );
};

export const ContextualMenu: React.FC<ContextualMenuProps> = ({ targetEntity, position, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    
    const {
        selectAction, hasMoved, hasActed, executeWait,
        selectedAction, endTurn, battleEntities, turnOrder, currentTurnIndex
    } = useGameStore();

    const currentEntityId = turnOrder?.[currentTurnIndex];
    const isCurrentTurnEntity = currentEntityId === targetEntity.id;
    const isPlayerEntity = targetEntity.type === 'PLAYER';
    const isEnemyEntity = targetEntity.type === 'ENEMY';
    
    const canMove = isCurrentTurnEntity && !hasMoved && isPlayerEntity;
    const canAct = isCurrentTurnEntity && !hasActed && isPlayerEntity;
    const canWait = isCurrentTurnEntity && (!hasMoved || !hasActed) && isPlayerEntity;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === '1' && canMove) handleAction('MOVE');
            if (e.key === '2' && canAct) handleAction('ATTACK');
            if (e.key === '3' && canAct) handleAction('SPELL');
            if (e.key === '4' && canWait) handleAction('WAIT');
            if (e.key === 'Enter') handleAction('END');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canMove, canAct, canWait]);

    const handleAction = (action: string) => {
        if (action === 'MOVE') selectAction('MOVE');
        else if (action === 'ATTACK') selectAction('ATTACK');
        else if (action === 'SPELL') selectAction('SPELL');
        else if (action === 'WAIT') executeWait();
        else if (action === 'END') endTurn();
        onClose();
    };

    const handleInspect = () => {
        useGameStore.getState().setInspectedEntity(targetEntity.id);
        onClose();
    };

    const hpPercent = targetEntity.stats.hp / targetEntity.stats.maxHp;
    const hpColor = hpPercent > 0.5 ? 'from-emerald-500 to-emerald-400' : hpPercent > 0.25 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400';
    
    // Smart positioning - keep menu on screen
    const menuWidth = 220;
    const menuHeight = 350;
    let left = position.x;
    let top = position.y;
    
    if (left + menuWidth > window.innerWidth - 20) left = window.innerWidth - menuWidth - 20;
    if (left < 20) left = 20;
    if (top + menuHeight > window.innerHeight - 20) top = position.y - menuHeight - 10;
    if (top < 20) top = 20;

    return (
        <>
            <div className="fixed inset-0 z-[140]" onClick={onClose} />
            <div 
                ref={menuRef}
                className="fixed z-[150] animate-context-menu-in"
                style={{ left, top }}
            >
                <div className="bg-gradient-to-b from-slate-900/98 to-slate-950/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_30px_rgba(59,130,246,0.1)] overflow-hidden w-[220px]">
                    {/* Header */}
                    <div className="relative p-4 pb-3">
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl overflow-hidden border-2 ${isEnemyEntity ? 'border-red-500/50' : 'border-blue-500/50'} shadow-lg`}>
                                <img 
                                    src={targetEntity.visual?.spriteUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-bold text-sm truncate">{targetEntity.name}</div>
                                <div className="text-white/50 text-[10px] uppercase tracking-wider">
                                    {targetEntity.stats.level} · {targetEntity.stats.class}
                                </div>
                            </div>
                            <div className={`text-xs font-bold px-2 py-1 rounded-lg ${isEnemyEntity ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {isEnemyEntity ? 'ENEMIGO' : 'ALIADO'}
                            </div>
                        </div>
                        
                        {/* HP Bar */}
                        <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] mb-1">
                                <span className="text-white/60 font-medium">HP</span>
                                <span className={`font-mono font-bold ${hpPercent > 0.5 ? 'text-emerald-400' : hpPercent > 0.25 ? 'text-amber-400' : 'text-red-400'}`}>
                                    {targetEntity.stats.hp}/{targetEntity.stats.maxHp}
                                </span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full bg-gradient-to-r ${hpColor} transition-all duration-500 relative`}
                                    style={{ width: `${hpPercent * 100}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-3 pb-3 space-y-2">
                        {isCurrentTurnEntity && isPlayerEntity && (
                            <>
                                <div className="text-[10px] text-white/40 uppercase tracking-wider font-bold px-1">Acciones</div>
                                
                                {canMove && (
                                    <ActionButton
                                        icon="👣"
                                        label="Mover"
                                        description="Desplazarse por el campo"
                                        shortcut="1"
                                        color="blue"
                                        onClick={() => handleAction('MOVE')}
                                    />
                                )}
                                {canAct && (
                                    <>
                                        <ActionButton
                                            icon="⚔️"
                                            label="Atacar"
                                            description="Infligir daño físico"
                                            shortcut="2"
                                            color="red"
                                            onClick={() => handleAction('ATTACK')}
                                        />
                                        <ActionButton
                                            icon="✨"
                                            label="Hechizo"
                                            description="Usar magia"
                                            shortcut="3"
                                            color="purple"
                                            onClick={() => handleAction('SPELL')}
                                        />
                                    </>
                                )}
                                {canWait && (
                                    <ActionButton
                                        icon="🛡️"
                                        label="Esperar"
                                        description="Mantener posición"
                                        shortcut="4"
                                        color="amber"
                                        onClick={() => handleAction('WAIT')}
                                    />
                                )}
                                <ActionButton
                                    icon="✅"
                                    label="Fin de Turno"
                                    description="Terminar acciones"
                                    shortcut="↵"
                                    color="emerald"
                                    onClick={() => handleAction('END')}
                                />
                                
                                <div className="h-px bg-white/10 my-2" />
                            </>
                        )}
                        
                        <ActionButton
                            icon="🔍"
                            label="Inspeccionar"
                            description="Ver estadísticas completas"
                            color="gray"
                            onClick={handleInspect}
                        />
                    </div>
                    
                    {/* Footer hint */}
                    <div className="px-3 pb-3">
                        <div className="text-[9px] text-white/25 text-center">
                            <span className="text-white/40">ESC</span> para cerrar · <span className="text-white/40">1-4</span> para acciones
                        </div>
                    </div>
                </div>
                
                {/* Decorative arrow */}
                <div 
                    className="absolute w-3 h-3 bg-slate-900 border-l border-t border-white/10 rotate-45"
                    style={{ 
                        bottom: -6, 
                        left: '50%', 
                        marginLeft: -6,
                        transform: 'rotate(225deg)' 
                    }} 
                />
            </div>
        </>
    );
};
