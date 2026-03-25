
import { StateCreator } from 'zustand';
import { GameState, Trap, TrapType, BattleAction, Entity } from '../../types';
import { TRAP_DATA, PLAYER_TRAP_LIMIT } from '../../data/trapsData';
import { generateId, randomInt, randomElement } from '../utils';

interface ZoneEnemy {
    id: string;
    name: string;
    sprite: string;
    hp: number;
    maxHp: number;
    x: number;
    z: number;
    isDefeated: boolean;
}

interface ExplorationState {
    traps: Trap[];
    maxTraps: number;
    currentBiome: string;
    encounterRate: number;
    zoneEnemies: ZoneEnemy[];
    currentEnemyId: string | null;
    zoneCompleted: boolean;
    zoneName: string;
    wasZoneCompletedBeforeLevelUp: boolean;
}

interface VersusState {
    isActive: boolean;
    playerIndex: number;
    playerCurrentHp: number;
    playerMaxHp: number;
    enemyCurrentHp: number;
    enemyMaxHp: number;
    turn: 'PLAYER' | 'ENEMY';
    battleLog: string[];
    isPlayerTurn: boolean;
}

export interface ExplorationSlice {
    explorationState: ExplorationState;
    versusState: VersusState;
    
    initZone: (biome?: string) => void;
    placeTrap: (type: TrapType, x: number, z: number) => boolean;
    removeTrap: (trapId: string) => void;
    triggerTrap: (trapId: string) => { damage: number; message: string };
    
    movePlayer: (newX: number, newZ: number) => void;
    startEncounter: (enemyId: string) => void;
    executeBattleAction: (action: BattleAction, skillId?: string) => void;
    endVersusBattle: (victory: boolean) => void;
    fleeFromBattle: () => void;
    nextCharacterTurn: () => void;
}

const ENEMY_TEMPLATES = [
    { name: 'Goblin', sprite: '/sprites/characters/goblin_01.png', hp: 30, xp: 50 },
    { name: 'Slime', sprite: '/sprites/characters/slime_01.png', hp: 20, xp: 30 },
    { name: 'Skeleton', sprite: '/sprites/characters/skeleton_01.png', hp: 40, xp: 80 },
    { name: 'Orco', sprite: '/sprites/characters/orc_01.png', hp: 50, xp: 100 },
    { name: 'Wolf', sprite: '/sprites/characters/werewolf_01.png', hp: 35, xp: 60 },
];

const generateZoneEnemies = (count: number = 5): ZoneEnemy[] => {
    const enemies: ZoneEnemy[] = [];
    const usedPositions = new Set<string>();
    
    for (let i = 0; i < count; i++) {
        let x: number, z: number, key: string;
        do {
            x = randomInt(2, 17);
            z = randomInt(2, 17);
            key = `${x},${z}`;
        } while (usedPositions.has(key));
        
        usedPositions.add(key);
        const template = randomElement(ENEMY_TEMPLATES)!;
        const level = randomInt(1, 3);
        
        enemies.push({
            id: `enemy_${i}`,
            name: `${template.name} Nv.${level}`,
            sprite: template.sprite,
            hp: template.hp * level,
            maxHp: template.hp * level,
            x,
            z,
            isDefeated: false
        });
    }
    
    return enemies;
};

export const createExplorationSlice: StateCreator<any, [], [], ExplorationSlice> = (set, get) => ({
    explorationState: {
        traps: [],
        maxTraps: PLAYER_TRAP_LIMIT,
        currentBiome: 'forest',
        encounterRate: 0.15,
        zoneEnemies: [],
        currentEnemyId: null,
        zoneCompleted: false,
        zoneName: 'Bosque Encantado',
        wasZoneCompletedBeforeLevelUp: false
    },
    versusState: {
        isActive: false,
        playerIndex: 0,
        playerCurrentHp: 0,
        playerMaxHp: 0,
        enemyCurrentHp: 0,
        enemyMaxHp: 0,
        turn: 'PLAYER',
        battleLog: [],
        isPlayerTurn: true
    },
    
    initZone: (biome = 'forest') => {
        const zoneNames: Record<string, string> = {
            forest: 'Bosque Encantado',
            desert: 'Desierto del Eternum',
            mountains: 'Montañas Oscuras',
            swamp: 'Ciénaga Maldita'
        };
        
        const enemies = generateZoneEnemies(5 + randomInt(0, 4));
        
        set({
            explorationState: {
                traps: [],
                maxTraps: PLAYER_TRAP_LIMIT,
                currentBiome: biome,
                encounterRate: 0.2,
                zoneEnemies: enemies,
                currentEnemyId: null,
                zoneCompleted: false,
                zoneName: zoneNames[biome] || 'Zona Desconocida'
            },
            gameState: GameState.EXPLORATION_3D
        });
    },
    
    placeTrap: (type, x, z) => {
        const { explorationState } = get();
        if (explorationState.traps.length >= explorationState.maxTraps) {
            return false;
        }
        
        const trapData = TRAP_DATA[type];
        const newTrap: Trap = {
            id: `trap_${Date.now()}_${generateId()}`,
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
    
    triggerTrap: (trapId) => {
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
    
    movePlayer: (newX, newZ) => {
        const { explorationState, party } = get();
        
        const enemyAtPos = explorationState.zoneEnemies.find(
            e => e.x === newX && e.z === newZ && !e.isDefeated
        );
        
        if (enemyAtPos) {
            get().startEncounter(enemyAtPos.id);
            return;
        }
        
        const trapAtPos = explorationState.traps.find(
            t => t.position.x === newX && t.position.z === newZ && t.isArmed
        );
        
        if (trapAtPos) {
            const result = get().triggerTrap(trapAtPos.id);
            if (result.damage > 0 && party[0]) {
                const currentHp = party[0].stats.hp - result.damage;
                if (currentHp <= 0) {
                    get().endVersusBattle(false);
                }
            }
        }
    },
    
    startEncounter: (enemyId) => {
        const { explorationState, party } = get();
        
        const enemy = explorationState.zoneEnemies.find(e => e.id === enemyId);
        if (!enemy || enemy.isDefeated) return;
        
        let playerIndex = 0;
        while (playerIndex < party.length && party[playerIndex].stats.hp <= 0) {
            playerIndex++;
        }
        
        if (playerIndex >= party.length) {
            return;
        }
        
        const player = party[playerIndex];
        
        set({
            explorationState: {
                ...explorationState,
                currentEnemyId: enemyId
            },
            versusState: {
                isActive: true,
                playerIndex,
                playerCurrentHp: player.stats.hp,
                playerMaxHp: player.stats.maxHp,
                enemyCurrentHp: enemy.hp,
                enemyMaxHp: enemy.maxHp,
                turn: 'PLAYER',
                battleLog: [`¡Un ${enemy.name} aparece!`, `¡${player.name} responde al llamado!`],
                isPlayerTurn: true
            },
            gameState: GameState.BATTLE_VERSUS
        });
    },
    
    executeBattleAction: (action, skillId) => {
        const { versusState, explorationState, party } = get();
        if (!versusState.isActive || !versusState.isPlayerTurn) return;
        
        let newLog = [...versusState.battleLog];
        let newEnemyHp = versusState.enemyCurrentHp;
        
        if (action === BattleAction.ATTACK) {
            const player = party[versusState.playerIndex];
            const damage = Math.floor(Math.random() * 15) + 10 + (player?.stats.attributes?.STR || 10);
            newEnemyHp = Math.max(0, versusState.enemyCurrentHp - damage);
            newLog.push(`¡Atacas! -${damage} HP`);
        } else if (action === BattleAction.SKILL && skillId) {
            const damage = Math.floor(Math.random() * 25) + 15;
            newEnemyHp = Math.max(0, versusState.enemyCurrentHp - damage);
            newLog.push(`¡Usas ${skillId}! -${damage} HP!`);
        }
        
        if (newEnemyHp <= 0) {
            set({
                versusState: {
                    ...versusState,
                    enemyCurrentHp: 0,
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
                isPlayerTurn: false,
                battleLog: newLog
            }
        });
        
        setTimeout(() => {
            const enemyDamage = Math.floor(Math.random() * 12) + 5;
            const newPlayerHp = Math.max(0, versusState.playerCurrentHp - enemyDamage);
            
            let finalLog = [...newLog];
            finalLog.push(`¡${explorationState.zoneEnemies.find(e => e.id === explorationState.currentEnemyId)?.name || 'Enemigo'} ataca! -${enemyDamage} HP`);
            
            if (newPlayerHp <= 0) {
                finalLog.push(`¡${party[versusState.playerIndex]?.name || 'Personaje'} ha sido derrotado!`);
                set({
                    versusState: {
                        ...versusState,
                        playerCurrentHp: 0,
                        battleLog: finalLog
                    }
                });
                setTimeout(() => get().endVersusBattle(false), 2000);
                return;
            }
            
            set({
                versusState: {
                    ...versusState,
                    playerCurrentHp: newPlayerHp,
                    turn: 'PLAYER',
                    isPlayerTurn: true,
                    battleLog: finalLog
                }
            });
        }, 1200);
    },
    
    endVersusBattle: (victory) => {
        const { explorationState, party, versusState } = get();
        
        if (victory && explorationState.currentEnemyId) {
            const enemy = explorationState.zoneEnemies.find(e => e.id === explorationState.currentEnemyId);
            if (enemy) {
                const xpReward = Math.floor(enemy.maxHp / 2);
                get().addPartyXp(xpReward);
            }
            
            set({
                explorationState: {
                    ...explorationState,
                    zoneEnemies: explorationState.zoneEnemies.map(e =>
                        e.id === explorationState.currentEnemyId ? { ...e, isDefeated: true, x: -1, z: -1 } : e
                    ),
                    currentEnemyId: null
                }
            });
        } else {
            if (party[versusState.playerIndex]) {
                set({
                    party: party.map((p, i) =>
                        i === versusState.playerIndex
                            ? { ...p, stats: { ...p.stats, hp: 0 } }
                            : p
                    )
                });
            }
            
            const nextAliveIndex = party.findIndex((p, i) => i > versusState.playerIndex && p.stats.hp > 0);
            if (nextAliveIndex !== -1) {
                const nextPlayer = party[nextAliveIndex];
                const enemy = explorationState.zoneEnemies.find(e => e.id === explorationState.currentEnemyId);
                
                set({
                    versusState: {
                        ...versusState,
                        playerIndex: nextAliveIndex,
                        playerCurrentHp: nextPlayer.stats.hp,
                        playerMaxHp: nextPlayer.stats.maxHp,
                        battleLog: [...versusState.battleLog, `¡${nextPlayer.name} entra en combate!`],
                        isPlayerTurn: true,
                        turn: 'PLAYER'
                    }
                });
                return;
            }
            
            set({
                versusState: {
                    ...versusState,
                    battleLog: [...versusState.battleLog, '¡Todo el party ha sido derrotado!']
                }
            });
        }
        
        const aliveEnemies = explorationState.zoneEnemies.filter(e => !e.isDefeated);
        const zoneCompleted = aliveEnemies.length === 0;
        
        if (zoneCompleted) {
            set({
                explorationState: {
                    ...explorationState,
                    zoneCompleted: true,
                    currentEnemyId: null,
                    wasZoneCompletedBeforeLevelUp: true
                }
            });
        } else {
            set({
                explorationState: {
                    ...explorationState,
                    wasZoneCompletedBeforeLevelUp: false
                }
            });
        }
        
        set({
            versusState: {
                isActive: false,
                playerIndex: 0,
                playerCurrentHp: 0,
                playerMaxHp: 0,
                enemyCurrentHp: 0,
                enemyMaxHp: 0,
                turn: 'PLAYER',
                battleLog: [],
                isPlayerTurn: true
            },
            gameState: zoneCompleted ? GameState.LEVEL_UP : GameState.EXPLORATION_3D
        });
    },
    
    fleeFromBattle: () => {
        const { versusState, explorationState } = get();
        const success = Math.random() < 0.4;
        
        if (success) {
            set({
                versusState: {
                    ...versusState,
                    battleLog: [...versusState.battleLog, '¡Escapas exitosamente!']
                }
            });
            setTimeout(() => {
                set({
                    versusState: {
                        ...versusState,
                        isActive: false,
                        battleLog: []
                    },
                    gameState: GameState.EXPLORATION_3D
                });
            }, 1000);
        } else {
            set({
                versusState: {
                    ...versusState,
                    battleLog: [...versusState.battleLog, '¡No puedes escapar!']
                }
            });
            
            setTimeout(() => {
                const enemyDamage = Math.floor(Math.random() * 15) + 8;
                const newPlayerHp = Math.max(0, versusState.playerCurrentHp - enemyDamage);
                
                if (newPlayerHp <= 0) {
                    set({
                        versusState: {
                            ...versusState,
                            playerCurrentHp: 0,
                            battleLog: [...versusState.battleLog, `¡El enemigo ataca! -${enemyDamage} HP`, '¡Derrotado!']
                        }
                    });
                    setTimeout(() => get().endVersusBattle(false), 1500);
                } else {
                    set({
                        versusState: {
                            ...versusState,
                            playerCurrentHp: newPlayerHp,
                            turn: 'PLAYER',
                            isPlayerTurn: true,
                            battleLog: [...versusState.battleLog, `¡El enemigo ataca! -${enemyDamage} HP`]
                        }
                    });
                }
            }, 1000);
        }
    },
    
    nextCharacterTurn: () => {
        const { versusState, party, explorationState } = get();
        
        let nextIndex = versusState.playerIndex + 1;
        while (nextIndex < party.length && party[nextIndex].stats.hp <= 0) {
            nextIndex++;
        }
        
        if (nextIndex >= party.length) {
            get().endVersusBattle(false);
            return;
        }
        
        const nextPlayer = party[nextIndex];
        
        set({
            versusState: {
                ...versusState,
                playerIndex: nextIndex,
                playerCurrentHp: nextPlayer.stats.hp,
                playerMaxHp: nextPlayer.stats.maxHp,
                battleLog: [...versusState.battleLog, `¡${nextPlayer.name} entra en combate!`]
            }
        });
    }
});
