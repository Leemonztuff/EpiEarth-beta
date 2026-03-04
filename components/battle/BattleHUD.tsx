import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const BattleHUD: React.FC = () => {
    const { 
        battleEntities, turnOrder, currentTurnIndex, 
        selectedAction, hasMoved, hasActed, comboCount 
    } = useGameStore();

    const currentEntityId = turnOrder?.[currentTurnIndex];
    const currentEntity = battleEntities?.find(e => e.id === currentEntityId);
    const isPlayerTurn = currentEntity?.type === 'PLAYER';

    const actionLabels: Record<string, string> = {
        MOVE: 'Mover',
        ATTACK: 'Atacar',
        SPELL: 'Hechizo',
        ITEM: 'Usar Item',
        WAIT: 'Esperar'
    };

    return (
        <div className="fixed top-4 left-4 right-4 z-[100] pointer-events-none">
            <div className="flex justify-between items-start">
                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Estado</div>
                    <div className="flex gap-2">
                        <StatusBadge 
                            label="Movimiento" 
                            available={!hasMoved} 
                            icon="👣"
                        />
                        <StatusBadge 
                            label="Acción" 
                            available={!hasActed} 
                            icon="⚔️"
                        />
                    </div>
                </div>

                {isPlayerTurn && comboCount > 0 && (
                    <div className="bg-gradient-to-r from-orange-600 to-red-600 px-4 py-2 rounded-lg animate-pulse shadow-lg">
                        <div className="text-xs text-orange-200 uppercase tracking-wider text-center">COMBO</div>
                        <div className="text-2xl font-black text-white text-center">x{comboCount}</div>
                    </div>
                )}

                {isPlayerTurn && selectedAction && (
                    <div className="bg-blue-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-blue-400/50">
                        <div className="text-xs text-blue-300 uppercase tracking-wider mb-1">Acción Seleccionada</div>
                        <div className="text-lg font-bold text-white">{actionLabels[selectedAction] || selectedAction}</div>
                        <div className="text-xs text-blue-200 mt-1">
                            {selectedAction === 'MOVE' && 'Selecciona un tile azul para moverte'}
                            {selectedAction === 'ATTACK' && 'Selecciona un enemigo en rango'}
                            {selectedAction === 'SPELL' && 'Selecciona un objetivo para el hechizo'}
                            {selectedAction === 'ITEM' && 'Selecciona un item de tu inventario'}
                        </div>
                    </div>
                )}

                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Turno de</div>
                    <div className={`text-lg font-bold ${isPlayerTurn ? 'text-blue-400' : 'text-red-400'}`}>
                        {isPlayerTurn ? currentEntity?.name || 'Jugador' : 'Enemigo'}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatusBadge: React.FC<{ label: string; available: boolean; icon: string }> = ({ label, available, icon }) => (
    <div className={`flex items-center gap-1 px-2 py-1 rounded ${available ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
        <span>{icon}</span>
        <span className="text-xs font-medium">{available ? '✓' : '✗'}</span>
    </div>
);

export default BattleHUD;
