
import { StateCreator } from 'zustand';
import { GameState, Trap, TrapType, BattleAction, EnemyDefinition, Entity } from '../../types';
import { TRAP_DATA, PLAYER_TRAP_LIMIT } from '../../data/trapsData';

export interface ExplorationSlice {
    explorationState: {
        traps: Trap[];
        maxTraps: number;
        currentBiome: string;
        encounterRate: number;
    };
    versusState: {
        isActive: boolean;
        playerEntity: Entity | null;
        enemyEntity: Entity | null;
        playerCurrentHp: number;
        enemyCurrentHp: number;
        turn: 'PLAYER' | 'ENEMY';
        battleLog: string[];
    };
    
    placeTrap: (type: TrapType, x: number, z: number) => boolean;
    removeTrap: (trapId: string) => void;
    triggerTrap: (trapId: string, targetId: string) => { damage: number; message: string };
    disarmTrap: (trapId: string) => void;
    
    startEncounter: (player: Entity, enemy: EnemyDefinition) => void;
    executeBattleAction: (action: BattleAction, skillId?: string) => void;
    endVersusBattle: (victory: boolean) => void;
    fleeFromBattle: () => void;
}

export const createExplorationSlice: StateCreator<any, [], [], ExplorationSlice> = (set, get) => ({
    explorationState: {
        traps: [],
        maxTraps: PLAYER_TRAP_LIMIT,
        currentBiome: 'forest',
        encounterRate: 0.15
    },
    versusState: {
        isActive: false,
        playerEntity: null,
        enemyEntity: null,
        playerCurrentHp: 0,
        enemyCurrentHp: 0,
        turn: 'PLAYER',
        battleLog: []
    },
    
    placeTrap: (type, x, z) => {
        const { explorationState } = get();
        if (explorationState.traps.length >= explorationState.maxTraps) {
            return false;
        }
        
        const trapData = TRAP_DATA[type];
        const newTrap: Trap = {
            id: `trap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            position: { x, y: 0, z },
            isArmed: true,
            isTriggered: false,
            damage: trapData.damage,
            duration: trapData.duration,
            description: trapData.description
        };
        
        set({
            explorationState: {
                ...explorationState,
                traps: [...explorationState.traps, newTrap]
            }
        });
        
        return true;
    },
    
    removeTrap: (trapId) => {
        const { explorationState } = get();
        set({
            explorationState: {
                ...explorationState,
                traps: explorationState.traps.filter(t => t.id !== trapId)
            }
        });
    },
    
    triggerTrap: (trapId, targetId) => {
        const { explorationState } = get();
        const trap = explorationState.traps.find(t => t.id === trapId);
        
        if (!trap || !trap.isArmed) {
            return { damage: 0, message: 'La trampa no está armada' };
        }
        
        const trapData = TRAP_DATA[trap.type];
        
        set({
            explorationState: {
                ...explorationState,
                traps: explorationState.traps.map(t => 
                    t.id === trapId ? { ...t, isTriggered: true, isArmed: false } : t
                )
            }
        });
        
        return {
            damage: trap.damage || 0,
            message: trapData.triggerMessage
        };
    },
    
    disarmTrap: (trapId) => {
        const { explorationState } = get();
        set({
            explorationState: {
                ...explorationState,
                traps: explorationState.traps.map(t =>
                    t.id === trapId ? { ...t, isArmed: false } : t
                )
            }
        });
    },
    
    startEncounter: (player, enemy) => {
        set({
            versusState: {
                isActive: true,
                playerEntity: player,
                enemyEntity: {
                    id: enemy.id,
                    name: enemy.name,
                    type: 'ENEMY',
                    stats: {
                        level: 1,
                        class: 'FIGHTER' as any,
                        hp: enemy.hp,
                        maxHp: enemy.hp,
                        xp: enemy.xpReward,
                        xpToNextLevel: 1000,
                        stamina: 20,
                        maxStamina: 20,
                        ac: enemy.ac,
                        initiativeBonus: enemy.initiativeBonus,
                        speed: 30,
                        movementType: 'WALK' as any,
                        attributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
                        baseAttributes: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
                        spellSlots: { current: 0, max: 0 },
                        activeCooldowns: {},
                        activeStatusEffects: [],
                        resistances: enemy.resistances || [],
                        vulnerabilities: enemy.vulnerabilities || [],
                        immunities: enemy.immunities || [],
                        creatureType: enemy.type
                    },
                    visual: { color: '#ef4444', modelType: 'billboard', spriteUrl: enemy.sprite },
                    equipment: {}
                } as Entity,
                playerCurrentHp: player.stats.hp,
                enemyCurrentHp: enemy.hp,
                turn: 'PLAYER',
                battleLog: [`¡Un ${enemy.name} aparece!`]
            },
            gameState: GameState.BATTLE_VERSUS
        });
    },
    
    executeBattleAction: (action, skillId) => {
        const { versusState } = get();
        if (!versusState.isActive || versusState.turn !== 'PLAYER') return;
        
        let newLog = [...versusState.battleLog];
        let newEnemyHp = versusState.enemyCurrentHp;
        
        if (action === BattleAction.ATTACK) {
            const damage = Math.floor(Math.random() * 20) + 10;
            newEnemyHp = Math.max(0, versusState.enemyCurrentHp - damage);
            newLog.push(`¡Atacas! -${damage} HP`);
        } else if (action === BattleAction.SKILL && skillId) {
            const damage = Math.floor(Math.random() * 30) + 15;
            newEnemyHp = Math.max(0, versusState.enemyCurrentHp - damage);
            newLog.push(`¡Usas ${skillId}! -${damage} HP`);
        }
        
        if (newEnemyHp <= 0) {
            set({
                versusState: {
                    ...versusState,
                    battleLog: [...newLog, '¡Has vencido al enemigo!']
                }
            });
            setTimeout(() => get().endVersusBattle(true), 1500);
            return;
        }
        
        set({
            versusState: {
                ...versusState,
                enemyCurrentHp: newEnemyHp,
                turn: 'ENEMY',
                battleLog: newLog
            }
        });
        
        setTimeout(() => {
            const enemyDamage = Math.floor(Math.random() * 15) + 5;
            const newPlayerHp = Math.max(0, versusState.playerCurrentHp - enemyDamage);
            
            let finalLog = [...newLog];
            finalLog.push(`¡El enemigo ataca! -${enemyDamage} HP`);
            
            if (newPlayerHp <= 0) {
                finalLog.push('¡Has sido derrotado!');
                set({
                    versusState: {
                        ...versusState,
                        playerCurrentHp: newPlayerHp,
                        battleLog: finalLog
                    }
                });
                setTimeout(() => get().endVersusBattle(false), 1500);
                return;
            }
            
            set({
                versusState: {
                    ...versusState,
                    playerCurrentHp: newPlayerHp,
                    turn: 'PLAYER',
                    battleLog: finalLog
                }
            });
        }, 1500);
    },
    
    endVersusBattle: (victory) => {
        const { party } = get();
        const { versusState } = get();
        
        if (victory && versusState.enemyEntity) {
            const xpReward = versusState.enemyEntity.stats.xp || 100;
            get().addPartyXp(xpReward);
        }
        
        set({
            versusState: {
                isActive: false,
                playerEntity: null,
                enemyEntity: null,
                playerCurrentHp: 0,
                enemyCurrentHp: 0,
                turn: 'PLAYER',
                battleLog: []
            },
            gameState: GameState.EXPLORATION_3D
        });
    },
    
    fleeFromBattle: () => {
        const { versusState } = get();
        const success = Math.random() < 0.5;
        
        if (success) {
            set({
                versusState: {
                    ...versusState,
                    battleLog: [...versusState.battleLog, '¡Escapas exitosamente!']
                }
            });
            setTimeout(() => get().fleeFromBattle(), 1000);
        } else {
            set({
                versusState: {
                    ...versusState,
                    battleLog: [...versusState.battleLog, '¡No puedes escapar!']
                }
            });
            
            setTimeout(() => {
                const enemyDamage = Math.floor(Math.random() * 15) + 5;
                const newPlayerHp = Math.max(0, versusState.playerCurrentHp - enemyDamage);
                
                set({
                    versusState: {
                        ...versusState,
                        playerCurrentHp: newPlayerHp,
                        turn: 'PLAYER',
                        battleLog: [...versusState.battleLog, `¡El enemigo ataca! -${enemyDamage} HP`]
                    }
                });
            }, 1000);
        }
    }
});
