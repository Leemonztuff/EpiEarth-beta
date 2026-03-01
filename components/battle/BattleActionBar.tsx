
// @ts-nocheck
import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { HapticFeedback, isTouchDevice } from '../../services/TouchFeedback';

export const BattleActionBar: React.FC = () => {
    const { 
        selectAction, hasMoved, hasActed, executeWait, 
        selectedAction, endTurn, turnOrder, currentTurnIndex, battleEntities 
    } = useGameStore();
    
    const isMobile = isTouchDevice();
    const currentEntityId = turnOrder?.[currentTurnIndex];
    const currentEntity = battleEntities?.find(e => e.id === currentEntityId);
    const isPlayerTurn = currentEntity?.type === 'PLAYER';
    
    if (!isPlayerTurn) return null;

    const handleAction = (action: string) => {
        HapticFeedback.medium();
        if (action === 'MOVE') selectAction('MOVE');
        else if (action === 'ATTACK') selectAction('ATTACK');
        else if (action === 'SPELL') selectAction('SPELL');
        else if (action === 'WAIT') executeWait();
        else if (action === 'END') endTurn();
    };

    const moveDisabled = hasMoved;
    const attackDisabled = hasActed;
    const spellDisabled = hasActed;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[150] bg-gradient-to-t from-black/95 via-black/90 to-transparent pb-6 pt-12 px-4 pointer-events-auto">
            <div className="flex justify-center items-end gap-3 max-w-lg mx-auto">
                <ActionButton 
                    icon="👣" 
                    label="MOVER" 
                    color="blue" 
                    disabled={moveDisabled}
                    isSelected={selectedAction === 'MOVE'}
                    onClick={() => handleAction('MOVE')}
                    isMobile={isMobile}
                />
                <ActionButton 
                    icon="⚔️" 
                    label="ATACAR" 
                    color="red" 
                    disabled={attackDisabled}
                    isSelected={selectedAction === 'ATTACK'}
                    onClick={() => handleAction('ATTACK')}
                    isMobile={isMobile}
                />
                <ActionButton 
                    icon="✨" 
                    label="HECHIZO" 
                    color="purple" 
                    disabled={spellDisabled}
                    isSelected={selectedAction === 'SPELL'}
                    onClick={() => handleAction('SPELL')}
                    isMobile={isMobile}
                />
                <ActionButton 
                    icon="🛡️" 
                    label="ESPERAR" 
                    color="amber" 
                    disabled={hasMoved && hasActed}
                    isSelected={false}
                    onClick={() => handleAction('WAIT')}
                    isMobile={isMobile}
                />
                <ActionButton 
                    icon="✅" 
                    label="FIN" 
                    color="emerald" 
                    disabled={false}
                    isSelected={false}
                    onClick={() => handleAction('END')}
                    isMobile={isMobile}
                    className="border-2 border-emerald-500/50"
                />
            </div>
        </div>
    );
};

const ActionButton: React.FC<{
    icon: string;
    label: string;
    color: string;
    disabled: boolean;
    isSelected: boolean;
    onClick: () => void;
    isMobile: boolean;
    className?: string;
}> = ({ icon, label, color, disabled, isSelected, onClick, isMobile, className = '' }) => {
    const size = isMobile ? 'w-16 h-16' : 'w-14 h-14';
    const iconSize = isMobile ? 'text-3xl' : 'text-2xl';
    const textSize = isMobile ? 'text-[9px]' : 'text-[8px]';
    
    const colorClasses = {
        blue: {
            bg: 'bg-blue-600',
            border: 'border-blue-400',
            hover: 'hover:bg-blue-500',
            selected: 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)]'
        },
        red: {
            bg: 'bg-red-600',
            border: 'border-red-400',
            hover: 'hover:bg-red-500',
            selected: 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]'
        },
        purple: {
            bg: 'bg-purple-600',
            border: 'border-purple-400',
            hover: 'hover:bg-purple-500',
            selected: 'bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]'
        },
        amber: {
            bg: 'bg-amber-600',
            border: 'border-amber-400',
            hover: 'hover:bg-amber-500',
            selected: 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)]'
        },
        emerald: {
            bg: 'bg-emerald-600',
            border: 'border-emerald-400',
            hover: 'hover:bg-emerald-500',
            selected: 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
        }
    };
    
    const colors = colorClasses[color as keyof typeof colorClasses];
    
    if (disabled) {
        return (
            <div className={`${size} rounded-2xl bg-slate-900/80 border-2 border-slate-700 border-dashed flex flex-col items-center justify-center opacity-40`}>
                <span className={iconSize}>{icon}</span>
                <span className={`${textSize} font-black text-slate-500 uppercase tracking-wider mt-1`}>{label}</span>
            </div>
        );
    }

    return (
        <button 
            onClick={onClick}
            className={`
                ${size} rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200
                ${isSelected ? colors.selected : `${colors.bg} ${colors.border} ${colors.hover}`}
                ${className}
                active:scale-90
            `}
        >
            <span className={iconSize}>{icon}</span>
            <span className={`${textSize} font-black text-white uppercase tracking-wider mt-1 drop-shadow-md`}>{label}</span>
        </button>
    );
};
