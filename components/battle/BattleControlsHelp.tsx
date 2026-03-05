// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';

export const BattleControlsHelp: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTips, setShowTips] = useState(true);
    const gameState = useGameStore(s => s.gameState);
    const selectedAction = useGameStore(s => s.selectedAction);
    const currentTurnIndex = useGameStore(s => s.currentTurnIndex);
    const turnOrder = useGameStore(s => s.turnOrder);
    const battleEntities = useGameStore(s => s.battleEntities);
    
    const actorId = turnOrder?.[currentTurnIndex];
    const actor = battleEntities?.find(e => e.id === actorId);
    const isPlayerTurn = actor?.type === 'PLAYER';
    
    useEffect(() => {
        const timer = setTimeout(() => setShowTips(false), 8000);
        return () => clearTimeout(timer);
    }, []);
    
    if (gameState !== 'BATTLE_TACTICAL') return null;
    
    return (
        <>
            {showTips && isPlayerTurn && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[120] animate-bounce pointer-events-none">
                    <div className="bg-amber-600/90 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg">
                        🎮 ¡Es tu turno! Haz clic en tus acciones abajo
                    </div>
                </div>
            )}
            
            <div 
                className="absolute top-2 right-2 z-[100] transition-all duration-300"
                onMouseEnter={() => setIsExpanded(true)}
                onMouseLeave={() => setIsExpanded(false)}
            >
                <div className={`bg-black/60 backdrop-blur-sm rounded-xl p-3 text-xs text-white/70 font-mono transition-all duration-300 ${isExpanded ? 'w-48' : 'w-auto'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-amber-400 text-sm">🎮</span>
                        <span className="font-bold text-white/90">Controles</span>
                    </div>
                    
                    <div className={`space-y-1.5 overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="flex items-center justify-between">
                            <span>🖱️ Arrastrar</span>
                            <span className="text-white/50">Rotar</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>⚙️ Scroll</span>
                            <span className="text-white/50">Zoom</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>👆 Clic</span>
                            <span className="text-white/50">Seleccionar</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>⚔️ Clic Der.</span>
                            <span className="text-white/50">Info</span>
                        </div>
                    </div>
                    
                    {!isExpanded && (
                        <div className="text-[10px] text-white/40 text-center">
                            Mantén mouse sobre mí
                        </div>
                    )}
                </div>
            </div>
            
            {selectedAction === 'MOVE' && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
                    <div className="bg-green-600/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-white text-xs font-bold animate-pulse">
                        🟢 Selecciona dónde moverte
                    </div>
                </div>
            )}
            
            {selectedAction === 'ATTACK' && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
                    <div className="bg-red-600/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-white text-xs font-bold animate-pulse">
                        🔴 Selecciona un objetivo
                    </div>
                </div>
            )}
        </>
    );
};
