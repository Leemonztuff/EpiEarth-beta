// @ts-nocheck
import React from 'react';
import { useGameStore } from '../../store/gameStore';

interface ContextualMenuProps {
    targetEntity: any;
    position: { x: number; y: number };
    onClose: () => void;
}

export const ContextualMenu: React.FC<ContextualMenuProps> = ({ targetEntity, position, onClose }) => {
    const {
        selectAction, hasMoved, hasActed, executeWait,
        selectedAction, endTurn, battleEntities, turnOrder, currentTurnIndex
    } = useGameStore();

    const currentEntityId = turnOrder?.[currentTurnIndex];
    const currentEntity = battleEntities?.find(e => e.id === currentEntityId);
    const isCurrentTurnEntity = currentEntityId === targetEntity.id;
    const isPlayerEntity = targetEntity.type === 'PLAYER';
    
    const canMove = isCurrentTurnEntity && !hasMoved && isPlayerEntity;
    const canAct = isCurrentTurnEntity && !hasActed && isPlayerEntity;
    const canWait = isCurrentTurnEntity && (!hasMoved || !hasActed) && isPlayerEntity;

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

    const screenX = position.x;
    const screenY = position.y;

    return (
        <>
            <div 
                className="fixed inset-0 z-[140]"
                onClick={onClose}
            />
            <div 
                className="fixed z-[150] animate-scale-in"
                style={{ 
                    left: screenX, 
                    top: screenY,
                    transform: 'translate(-50%, -120%)'
                }}
            >
                <div className="bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl min-w-[180px]">
                    <div className="text-center border-b border-white/10 pb-2 mb-2">
                        <div className="text-white font-bold text-sm uppercase tracking-wider">{targetEntity.name}</div>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                                <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-red-500 to-red-400"
                                        style={{ width: `${(targetEntity.stats.hp / targetEntity.stats.maxHp) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-400 font-mono">{targetEntity.stats.hp}/{targetEntity.stats.maxHp}</span>
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase mt-1">
                            {targetEntity.stats.level} · {targetEntity.stats.class}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        {isCurrentTurnEntity && isPlayerEntity && (
                            <>
                                {canMove && (
                                    <button
                                        onClick={() => handleAction('MOVE')}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/80 hover:bg-blue-500 border border-blue-400/30 transition-all active:scale-95"
                                    >
                                        <span>👣</span>
                                        <span className="text-white text-xs font-bold uppercase">Mover</span>
                                    </button>
                                )}
                                {canAct && (
                                    <>
                                        <button
                                            onClick={() => handleAction('ATTACK')}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600/80 hover:bg-red-500 border border-red-400/30 transition-all active:scale-95"
                                        >
                                            <span>⚔️</span>
                                            <span className="text-white text-xs font-bold uppercase">Atacar</span>
                                        </button>
                                        <button
                                            onClick={() => handleAction('SPELL')}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-500 border border-purple-400/30 transition-all active:scale-95"
                                        >
                                            <span>✨</span>
                                            <span className="text-white text-xs font-bold uppercase">Hechizo</span>
                                        </button>
                                    </>
                                )}
                                {canWait && (
                                    <button
                                        onClick={() => handleAction('WAIT')}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-600/80 hover:bg-amber-500 border border-amber-400/30 transition-all active:scale-95"
                                    >
                                        <span>🛡️</span>
                                        <span className="text-white text-xs font-bold uppercase">Esperar</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => handleAction('END')}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400/30 transition-all active:scale-95"
                                >
                                    <span>✅</span>
                                    <span className="text-white text-xs font-bold uppercase">Fin Turno</span>
                                </button>
                            </>
                        )}
                        
                        <button
                            onClick={handleInspect}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 border border-white/10 transition-all active:scale-95"
                        >
                            <span>🔍</span>
                            <span className="text-white text-xs font-bold uppercase">Inspeccionar</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export const useEntityContextMenu = () => {
    const [contextMenu, setContextMenu] = React.useState<{
        entity: any;
        position: { x: number; y: number };
    } | null>(null);

    const showContextMenu = (entity: any, event: React.MouseEvent) => {
        event.preventDefault();
        setContextMenu({
            entity,
            position: { x: event.clientX, y: event.clientY }
        });
    };

    const hideContextMenu = () => setContextMenu(null);

    return { contextMenu, showContextMenu, hideContextMenu };
};
