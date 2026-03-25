import { StateCreator } from 'zustand';
import { BattleAction, Entity, GameState, PositionComponent, Trap, TrapType } from '../../types';
import { TRAP_DATA, PLAYER_TRAP_LIMIT } from '../../data/trapsData';
import { generateId, randomElement, randomInt } from '../utils';
import {
    TacticalMapCell,
    TacticalPosition,
    TACTICAL_MAP_SIZE,
    clampPlacementToRange,
    findClosestStepTowards,
    findFreeSpawnPositions,
    generateTacticalMap,
    getNeighbors,
    isWalkable,
    manhattanDistance,
} from '../../services/trapHuntMap';

export interface ZoneEnemy {
    id: string;
    name: string;
    sprite: string;
    hp: number;
    maxHp: number;
    x: number;
    z: number;
    isDefeated: boolean;
    movement: number;
    alertRange: number;
    stunnedTurns: number;
    poisonTurns: number;
}

interface ExplorationState {
    map: TacticalMapCell[][];
    mapSize: number;
    playerMapPos: TacticalPosition;
    entrancePos: TacticalPosition;
    traps: Trap[];
    maxTraps: number;
    currentBiome: string;
    zoneEnemies: ZoneEnemy[];
    currentEnemyId: string | null;
    zoneCompleted: boolean;
    zoneName: string;
    wasZoneCompletedBeforeLevelUp: boolean;
    selectedTrapType: TrapType | null;
    placementMode: boolean;
    placementRange: number;
    highlightedTiles: TacticalPosition[];
    turnStep: number;
    isResolvingTurn: boolean;
    tacticalPaused: boolean;
    tacticalMessage: string | null;
    returnOverworldPos: PositionComponent | null;
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

    initZone: (biome?: string, origin?: PositionComponent | null) => void;
    selectTrapType: (type: TrapType | null) => void;
    togglePlacementPause: (forced?: boolean) => void;
    placeTrap: (type: TrapType, x: number, z: number) => boolean;
    removeTrap: (trapId: string) => void;
    triggerTrap: (trapId: string, enemyId?: string) => { damage: number; message: string };

    movePlayer: (newX: number, newZ: number) => void;
    startEncounter: (enemyId: string) => void;
    executeBattleAction: (action: BattleAction, skillId?: string) => void;
    endVersusBattle: (victory: boolean) => void;
    fleeFromBattle: () => void;
    nextCharacterTurn: () => void;
    exitTrapZone: () => void;
}

const ENEMY_TEMPLATES = [
    { name: 'Goblin', sprite: '/sprites/characters/goblin_01.png', hp: 30 },
    { name: 'Slime', sprite: '/sprites/characters/slime_01.png', hp: 22 },
    { name: 'Skeleton', sprite: '/sprites/characters/skeleton_01.png', hp: 38 },
    { name: 'Orco', sprite: '/sprites/characters/orc_01.png', hp: 50 },
    { name: 'Wolf', sprite: '/sprites/characters/werewolf_01.png', hp: 28 },
];

const DEFAULT_PLAYER_START: TacticalPosition = { x: 3, z: Math.floor(TACTICAL_MAP_SIZE / 2) };

function getZoneName(biome: string): string {
    const zoneNames: Record<string, string> = {
        forest: 'Bosque de Caceria',
        desert: 'Arena del Eternum',
        mountains: 'Paso del Colmillo',
        swamp: 'Cienaga Trampa',
    };

    return zoneNames[biome] || 'Zona de Caza';
}

function buildTrapHighlights(origin: TacticalPosition, range: number, map: TacticalMapCell[][]): TacticalPosition[] {
    const highlights: TacticalPosition[] = [];
    for (let x = 0; x < map.length; x++) {
        for (let z = 0; z < map[x].length; z++) {
            if (!isWalkable(map, x, z)) {
                continue;
            }

            if (manhattanDistance(origin, { x, z }) <= range) {
                highlights.push({ x, z });
            }
        }
    }

    return highlights;
}

function createZoneEnemies(map: TacticalMapCell[][], playerStart: TacticalPosition): ZoneEnemy[] {
    const enemyCount = 4 + randomInt(0, 2);
    const spawns = findFreeSpawnPositions(map, playerStart, enemyCount);

    return spawns.map((spawn, index) => {
        const template = randomElement(ENEMY_TEMPLATES)!;
        const level = randomInt(1, 3);
        return {
            id: `zone_enemy_${index}_${generateId()}`,
            name: `${template.name} Nv.${level}`,
            sprite: template.sprite,
            hp: template.hp + level * 8,
            maxHp: template.hp + level * 8,
            x: spawn.x,
            z: spawn.z,
            isDefeated: false,
            movement: 1,
            alertRange: 8,
            stunnedTurns: 0,
            poisonTurns: 0,
        };
    });
}

function applyLootPenalty(state: any) {
    const recoveredParty = state.party.map((member: Entity & { stats: any }) => ({
        ...member,
        stats: {
            ...member.stats,
            hp: Math.max(1, Math.floor(member.stats.maxHp * 0.35)),
        },
    }));

    return {
        party: recoveredParty,
        inventory: [],
        gold: 0,
    };
}

function decayTrapDurations(traps: Trap[]): Trap[] {
    return traps
        .map(trap => ({ ...trap, duration: Math.max(0, (trap.duration ?? 1) - 1) }))
        .filter(trap => trap.isArmed && (trap.duration ?? 0) > 0);
}

export const createExplorationSlice: StateCreator<any, [], [], ExplorationSlice> = (set, get) => ({
    explorationState: {
        map: [],
        mapSize: TACTICAL_MAP_SIZE,
        playerMapPos: DEFAULT_PLAYER_START,
        entrancePos: DEFAULT_PLAYER_START,
        traps: [],
        maxTraps: PLAYER_TRAP_LIMIT,
        currentBiome: 'forest',
        zoneEnemies: [],
        currentEnemyId: null,
        zoneCompleted: false,
        zoneName: 'Bosque de Caceria',
        wasZoneCompletedBeforeLevelUp: false,
        selectedTrapType: null,
        placementMode: false,
        placementRange: 1,
        highlightedTiles: [],
        turnStep: 0,
        isResolvingTurn: false,
        tacticalPaused: false,
        tacticalMessage: null,
        returnOverworldPos: null,
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
        isPlayerTurn: true,
    },

    initZone: (biome = 'forest', origin = null) => {
        const seed = `${biome}:${origin?.x ?? 0},${origin?.y ?? 0}:${Date.now()}`;
        const map = generateTacticalMap(seed);
        const playerStart = { ...DEFAULT_PLAYER_START };
        const enemies = createZoneEnemies(map, playerStart);

        set({
            explorationState: {
                map,
                mapSize: TACTICAL_MAP_SIZE,
                playerMapPos: playerStart,
                entrancePos: playerStart,
                traps: [],
                maxTraps: PLAYER_TRAP_LIMIT,
                currentBiome: biome,
                zoneEnemies: enemies,
                currentEnemyId: null,
                zoneCompleted: false,
                zoneName: getZoneName(biome),
                wasZoneCompletedBeforeLevelUp: false,
                selectedTrapType: null,
                placementMode: false,
                placementRange: 1,
                highlightedTiles: [],
                turnStep: 0,
                isResolvingTurn: false,
                tacticalPaused: false,
                tacticalMessage: 'Pausa tactica: coloca trampas y mueve al enemigo a tu terreno.',
                returnOverworldPos: origin,
            },
            gameState: GameState.EXPLORATION_3D,
        });
    },

    selectTrapType: (type) => {
        const { explorationState } = get();
        const range = type ? TRAP_DATA[type].range : 1;

        set({
            explorationState: {
                ...explorationState,
                selectedTrapType: type,
                placementMode: !!type,
                tacticalPaused: !!type,
                placementRange: range,
                highlightedTiles: type
                    ? buildTrapHighlights(explorationState.playerMapPos, range, explorationState.map)
                    : [],
                tacticalMessage: type
                    ? `Coloca ${TRAP_DATA[type].name} dentro de alcance ${range}.`
                    : null,
            },
        });
    },

    togglePlacementPause: (forced) => {
        const { explorationState } = get();
        const nextPaused = typeof forced === 'boolean' ? forced : !explorationState.tacticalPaused;
        set({
            explorationState: {
                ...explorationState,
                tacticalPaused: nextPaused,
                placementMode: nextPaused && !!explorationState.selectedTrapType,
                tacticalMessage: nextPaused ? 'Tiempo detenido: coloca trampas o reanuda la caceria.' : null,
            },
        });
    },

    placeTrap: (type, x, z) => {
        const { explorationState } = get();
        if (explorationState.traps.length >= explorationState.maxTraps) {
            return false;
        }

        if (!isWalkable(explorationState.map, x, z)) {
            return false;
        }

        const clamped = clampPlacementToRange(explorationState.playerMapPos, { x, z }, TRAP_DATA[type].range);
        if (!clamped) {
            return false;
        }

        const occupied = explorationState.traps.some(trap => trap.position.x === x && trap.position.z === z && trap.isArmed);
        if (occupied) {
            return false;
        }

        const trapData = TRAP_DATA[type];
        const trap: Trap = {
            id: `trap_${Date.now()}_${generateId()}`,
            type,
            position: { x, y: 0, z },
            isArmed: true,
            isTriggered: false,
            damage: trapData.damage,
            duration: trapData.duration,
            description: trapData.description,
        };

        set({
            explorationState: {
                ...explorationState,
                traps: [...explorationState.traps, trap],
                selectedTrapType: null,
                placementMode: false,
                tacticalPaused: false,
                placementRange: 1,
                highlightedTiles: [],
                tacticalMessage: `${trapData.name} colocada en ${x},${z}.`,
            },
        });

        return true;
    },

    removeTrap: (trapId) => {
        const { explorationState } = get();
        set({
            explorationState: {
                ...explorationState,
                traps: explorationState.traps.filter(trap => trap.id !== trapId),
            },
        });
    },

    triggerTrap: (trapId, enemyId) => {
        const { explorationState } = get();
        const trap = explorationState.traps.find(item => item.id === trapId);
        if (!trap || !trap.isArmed) {
            return { damage: 0, message: 'La trampa ya no esta activa.' };
        }

        const trapData = TRAP_DATA[trap.type];
        let message = trapData.triggerMessage;

        const enemies = explorationState.zoneEnemies.map(enemy => {
            if (!enemyId || enemy.id !== enemyId) {
                return enemy;
            }

            let nextEnemy = { ...enemy, hp: Math.max(0, enemy.hp - trapData.damage) };

            if (trap.type === TrapType.STUN || trap.type === TrapType.ICE) {
                nextEnemy.stunnedTurns = 1;
            }

            if (trap.type === TrapType.POISON) {
                nextEnemy.poisonTurns = 2;
            }

            if (trap.type === TrapType.TELEPORT) {
                const destinations = findFreeSpawnPositions(explorationState.map, explorationState.playerMapPos, 12);
                const nextDestination = randomElement(destinations.filter(pos => pos.x !== enemy.x || pos.z !== enemy.z));
                if (nextDestination) {
                    nextEnemy.x = nextDestination.x;
                    nextEnemy.z = nextDestination.z;
                    message = 'La trampa desvia al enemigo a otro sector del mapa.';
                }
            }

            if (nextEnemy.hp <= 0) {
                nextEnemy = { ...nextEnemy, hp: 0, isDefeated: true, x: -99, z: -99 };
            }

            return nextEnemy;
        });

        set({
            explorationState: {
                ...explorationState,
                zoneEnemies: enemies,
                traps: explorationState.traps
                    .map(item => item.id === trapId ? { ...item, isArmed: false, isTriggered: true, duration: 0 } : item)
                    .filter(item => item.isArmed),
                tacticalMessage: message,
            },
        });

        return { damage: trapData.damage, message };
    },

    movePlayer: (newX, newZ) => {
        const state = get();
        const { explorationState } = state;
        if (explorationState.isResolvingTurn || explorationState.placementMode || explorationState.tacticalPaused) {
            return;
        }

        if (!isWalkable(explorationState.map, newX, newZ)) {
            return;
        }

        if (manhattanDistance(explorationState.playerMapPos, { x: newX, z: newZ }) !== 1) {
            return;
        }

        const directContact = explorationState.zoneEnemies.find(enemy => !enemy.isDefeated && enemy.x === newX && enemy.z === newZ);
        if (directContact) {
            get().startEncounter(directContact.id);
            return;
        }

        let enemies = explorationState.zoneEnemies.map(enemy => ({ ...enemy }));
        const playerMapPos = { x: newX, z: newZ };
        let triggeredMessage: string | null = null;
        let currentEnemyId = explorationState.currentEnemyId;

        const blockedPositions = new Set<string>();

        enemies = enemies.map(enemy => {
            if (enemy.isDefeated) {
                return enemy;
            }

            let nextEnemy = { ...enemy };

            if (nextEnemy.poisonTurns > 0) {
                nextEnemy.poisonTurns -= 1;
                nextEnemy.hp = Math.max(0, nextEnemy.hp - 6);
                if (nextEnemy.hp <= 0) {
                    return { ...nextEnemy, hp: 0, isDefeated: true, x: -99, z: -99 };
                }
            }

            if (nextEnemy.stunnedTurns > 0) {
                nextEnemy.stunnedTurns -= 1;
                blockedPositions.add(`${nextEnemy.x},${nextEnemy.z}`);
                return nextEnemy;
            }

            const activeDecoy = explorationState.traps.find(trap => trap.isArmed && trap.type === TrapType.DECOY);
            const target = activeDecoy
                ? { x: activeDecoy.position.x, z: activeDecoy.position.z }
                : playerMapPos;

            if (manhattanDistance({ x: nextEnemy.x, z: nextEnemy.z }, target) <= nextEnemy.alertRange) {
                for (let step = 0; step < nextEnemy.movement; step++) {
                    const nextStep = findClosestStepTowards(
                        explorationState.map,
                        { x: nextEnemy.x, z: nextEnemy.z },
                        target,
                        new Set([...blockedPositions, `${playerMapPos.x},${playerMapPos.z}`])
                    );

                    if (nextStep.x === nextEnemy.x && nextStep.z === nextEnemy.z) {
                        break;
                    }

                    nextEnemy.x = nextStep.x;
                    nextEnemy.z = nextStep.z;

                    const trap = explorationState.traps.find(item => item.isArmed && item.position.x === nextEnemy.x && item.position.z === nextEnemy.z);
                    if (trap) {
                        const trapResult = get().triggerTrap(trap.id, nextEnemy.id);
                        triggeredMessage = trapResult.message;
                        const refreshedEnemy = get().explorationState.zoneEnemies.find(item => item.id === nextEnemy.id);
                        if (refreshedEnemy) {
                            nextEnemy = { ...refreshedEnemy };
                        }
                    }

                    if (nextEnemy.isDefeated) {
                        break;
                    }

                    if (nextEnemy.x === playerMapPos.x && nextEnemy.z === playerMapPos.z) {
                        currentEnemyId = nextEnemy.id;
                        break;
                    }
                }
            }

            if (!nextEnemy.isDefeated) {
                blockedPositions.add(`${nextEnemy.x},${nextEnemy.z}`);
            }

            return nextEnemy;
        });

        const aliveEnemies = enemies.filter(enemy => !enemy.isDefeated);
        const zoneCompleted = aliveEnemies.length === 0;

        set({
            explorationState: {
                ...get().explorationState,
                zoneEnemies: enemies,
                playerMapPos,
                currentEnemyId,
                turnStep: explorationState.turnStep + 1,
                zoneCompleted,
                traps: decayTrapDurations(get().explorationState.traps),
                tacticalMessage: zoneCompleted
                    ? 'La zona quedo limpia. Puedes volver al mapa hex.'
                    : triggeredMessage ?? 'Muevete, prepara emboscadas y no dejes que te rodeen.',
            },
        });

        if (currentEnemyId) {
            get().startEncounter(currentEnemyId);
        }
    },

    startEncounter: (enemyId) => {
        const { explorationState, party } = get();
        const enemy = explorationState.zoneEnemies.find(item => item.id === enemyId);
        if (!enemy || enemy.isDefeated) {
            return;
        }

        const playerIndex = party.findIndex(member => member.stats.hp > 0);
        if (playerIndex === -1) {
            return;
        }

        const player = party[playerIndex];
        set({
            explorationState: {
                ...explorationState,
                currentEnemyId: enemyId,
                tacticalMessage: `Contacto con ${enemy.name}.`,
            },
            versusState: {
                isActive: true,
                playerIndex,
                playerCurrentHp: player.stats.hp,
                playerMaxHp: player.stats.maxHp,
                enemyCurrentHp: enemy.hp,
                enemyMaxHp: enemy.maxHp,
                turn: 'PLAYER',
                battleLog: [
                    `${enemy.name} intercepta tu avance.`,
                    'La caza entra en duelo directo.',
                ],
                isPlayerTurn: true,
            },
            gameState: GameState.BATTLE_VERSUS,
        });
    },

    executeBattleAction: (action, skillId) => {
        const state = get();
        const { versusState, explorationState, party } = state;
        if (!versusState.isActive || !versusState.isPlayerTurn) {
            return;
        }

        const attacker = party[versusState.playerIndex];
        let enemyHp = versusState.enemyCurrentHp;
        const battleLog = [...versusState.battleLog];

        if (action === BattleAction.ATTACK) {
            const damage = Math.floor(Math.random() * 12) + 8 + (attacker?.stats.attributes?.STR || 10);
            enemyHp = Math.max(0, enemyHp - damage);
            battleLog.push(`Golpeas y causas ${damage} de dano.`);
        } else if (action === BattleAction.SKILL) {
            const damage = Math.floor(Math.random() * 18) + 12;
            enemyHp = Math.max(0, enemyHp - damage);
            battleLog.push(`Usas ${skillId || 'una tecnica'} y causas ${damage} de dano.`);
        } else if (action === BattleAction.ITEM) {
            battleLog.push('No hay objetos rapidos configurados para este duelo.');
        }

        if (enemyHp <= 0) {
            set({
                versusState: {
                    ...versusState,
                    enemyCurrentHp: 0,
                    battleLog: [...battleLog, 'Enemigo derribado.'],
                },
            });
            setTimeout(() => get().endVersusBattle(true), 700);
            return;
        }

        set({
            versusState: {
                ...versusState,
                enemyCurrentHp: enemyHp,
                turn: 'ENEMY',
                isPlayerTurn: false,
                battleLog,
            },
        });

        setTimeout(() => {
            const snapshot = get();
            const retaliation = Math.floor(Math.random() * 10) + 6;
            const playerHp = Math.max(0, snapshot.versusState.playerCurrentHp - retaliation);
            const nextLog = [...snapshot.versusState.battleLog, `El enemigo contraataca por ${retaliation}.`];

            if (playerHp <= 0) {
                set({
                    versusState: {
                        ...snapshot.versusState,
                        playerCurrentHp: 0,
                        battleLog: [...nextLog, 'Tu combatiente cae en batalla.'],
                    },
                });
                setTimeout(() => get().endVersusBattle(false), 900);
                return;
            }

            set({
                versusState: {
                    ...snapshot.versusState,
                    playerCurrentHp: playerHp,
                    turn: 'PLAYER',
                    isPlayerTurn: true,
                    battleLog: nextLog,
                },
            });
        }, 900);
    },

    endVersusBattle: (victory) => {
        const state = get();
        const { explorationState, versusState, party } = state;
        const currentEnemyId = explorationState.currentEnemyId;
        const defeatedEnemy = explorationState.zoneEnemies.find(enemy => enemy.id === currentEnemyId);

        const updatedParty = party.map((member, index) =>
            index === versusState.playerIndex
                ? {
                    ...member,
                    stats: {
                        ...member.stats,
                        hp: victory ? versusState.playerCurrentHp : 0,
                    },
                }
                : member
        );

        if (victory && currentEnemyId) {
            const enemies = explorationState.zoneEnemies.map(enemy =>
                enemy.id === currentEnemyId
                    ? { ...enemy, isDefeated: true, hp: 0, x: -99, z: -99 }
                    : enemy
            );
            const zoneCompleted = enemies.every(enemy => enemy.isDefeated);

            set({
                party: updatedParty,
                explorationState: {
                    ...explorationState,
                    zoneEnemies: enemies,
                    currentEnemyId: null,
                    zoneCompleted,
                    wasZoneCompletedBeforeLevelUp: zoneCompleted,
                    tacticalMessage: zoneCompleted
                        ? 'Has limpiado la zona. Regresa al overworld cuando quieras.'
                        : `${defeatedEnemy?.name || 'El enemigo'} ya no esta en el mapa.`,
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
                    isPlayerTurn: true,
                },
                gameState: GameState.EXPLORATION_3D,
            });

            if (defeatedEnemy) {
                get().addPartyXp(Math.max(20, Math.floor(defeatedEnemy.maxHp / 2)));
            }

            return;
        }

        const penalty = applyLootPenalty(state);
        set({
            ...penalty,
            party: penalty.party,
            explorationState: {
                ...explorationState,
                currentEnemyId: null,
                tacticalMessage: 'Derrota. Regresas al mapa hex sin loot.',
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
                isPlayerTurn: true,
            },
            gameState: GameState.OVERWORLD,
        });

        get().syncOverworldEnemies();
        get().addLog('Has sido derrotado y pierdes el loot que llevabas encima.', 'narrative');
    },

    fleeFromBattle: () => {
        const { versusState } = get();
        set({
            versusState: {
                ...versusState,
                isActive: false,
                battleLog: [],
            },
            gameState: GameState.EXPLORATION_3D,
        });
    },

    nextCharacterTurn: () => {},

    exitTrapZone: () => {
        const { explorationState } = get();
        if (explorationState.zoneCompleted) {
            get().clearCurrentEncounter();
        }

        set({
            gameState: GameState.OVERWORLD,
            explorationState: {
                ...explorationState,
                selectedTrapType: null,
                placementMode: false,
                tacticalPaused: false,
                highlightedTiles: [],
                tacticalMessage: null,
            },
        });
        get().syncOverworldEnemies();
    },
});
