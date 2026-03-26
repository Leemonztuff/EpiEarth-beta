import { StateCreator } from 'zustand';
import {
    BattleAction,
    DungeonRuntimeState,
    CameraMode,
    Mode3DState,
    DoorState,
    DungeonRoomGraph,
    EnemyAiState,
    EncounterContext,
    EncounterLossPolicy,
    EncounterOutcome,
    EncounterReturnPolicy,
    Entity,
    GameState,
    InputMode,
    PositionComponent,
    TacticalAction,
    TacticalUiState,
    Trap,
    TrapType,
    ZoneContext
} from '../../types';
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
import { getDungeonBlueprint } from '../../data/dungeonBlueprints';
import { createDungeonRuntime, markDungeonRoomResolved, openDungeonDoor } from '../../services/dungeonRuntime';

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
    aiState: EnemyAiState;
    lastKnownPlayerPos: TacticalPosition | null;
    investigateStepsLeft: number;
    patrolSeed: number;
    decoyTurns: number;
    isElite?: boolean;
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
    zoneContext: ZoneContext;
    dungeonRoomId: string | null;
    dungeonObjectiveType: string | null;
    roomObjectiveResolved: boolean;
    roomObjectiveTile: TacticalPosition | null;
    mode3DState: Mode3DState;
    cameraMode: CameraMode;
    currentRoomId: string | null;
    doorStates: Record<string, DoorState>;
    roomGraphRef: DungeonRoomGraph | null;
    stepBudget: number;
    lineOfSightMask: string[];
    eliteContactPending: string | null;
    trapAimTarget: TacticalPosition | null;
    showMinimap: boolean;
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

    initZone: (biome?: string, origin?: PositionComponent | null, zoneContext?: ZoneContext) => void;
    setInputMode: (mode: InputMode) => void;
    dispatchTacticalAction: (action: TacticalAction) => void;
    resolveEncounterOutcome: (outcome: EncounterOutcome) => void;
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
    openDoor: (doorId: string) => void;
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
            aiState: EnemyAiState.PATROL,
            lastKnownPlayerPos: null,
            investigateStepsLeft: 0,
            patrolSeed: randomInt(1, 999_999),
            decoyTurns: 0,
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

function createEncounterContext(
    sourceMode: GameState,
    originTile: PositionComponent | null,
    enemyId: string | null = null,
    returnPolicy: EncounterReturnPolicy = 'RETURN_TO_OVERWORLD',
    lossPolicy: EncounterLossPolicy = 'DROP_LOOT'
): EncounterContext {
    return {
        sourceMode,
        originTile,
        enemyId,
        returnPolicy,
        lossPolicy,
    };
}

function createInitialVersusState(): VersusState {
    return {
        isActive: false,
        playerIndex: 0,
        playerCurrentHp: 0,
        playerMaxHp: 0,
        enemyCurrentHp: 0,
        enemyMaxHp: 0,
        turn: 'PLAYER',
        battleLog: [],
        isPlayerTurn: true,
    };
}

function getInputHints(inputMode: InputMode): string[] {
    if (inputMode === 'mobile') {
        return ['Pad: mover', 'Tap en tile: colocar', 'Tap Pausa: plan tactico'];
    }

    return ['WASD/Flechas: mover', 'Click: colocar/interactuar', 'P: pausa tactica'];
}

function buildTacticalUiState(
    explorationState: ExplorationState,
    inputMode: InputMode = 'desktop',
    blockReason: string | null = null,
    dungeonRuntime: DungeonRuntimeState | null = null
): TacticalUiState {
    const objectiveLabel = explorationState.dungeonObjectiveType
        ? `Objetivo: ${explorationState.dungeonObjectiveType}`
        : null;
    const riskLabel = dungeonRuntime
        ? `Riesgo ${Math.min(10, dungeonRuntime.threatLevel)}/10`
        : null;
    const timelineLabel = dungeonRuntime
        ? `Dia ${dungeonRuntime.timelineDay} · Loot T${dungeonRuntime.remainingLootTier}`
        : null;
    const twistLabel = dungeonRuntime?.activeTwists?.length
        ? dungeonRuntime.activeTwists[dungeonRuntime.activeTwists.length - 1]
        : null;

    return {
        zoneName: explorationState.zoneName,
        message: explorationState.tacticalMessage,
        blockReason,
        inputHints: getInputHints(inputMode),
        turnStep: explorationState.turnStep,
        trapCount: explorationState.traps.length,
        maxTraps: explorationState.maxTraps,
        enemyCount: explorationState.zoneEnemies.filter(enemy => !enemy.isDefeated).length,
        selectedTrapType: explorationState.selectedTrapType,
        selectedTrapRange: explorationState.selectedTrapType ? explorationState.placementRange : null,
        tacticalPaused: explorationState.tacticalPaused,
        placementMode: explorationState.placementMode,
        objectiveLabel,
        riskLabel,
        timelineLabel,
        twistLabel,
        poiStateTag: dungeonRuntime?.stateTag ?? null,
        mode3DState: explorationState.mode3DState,
        currentRoomId: explorationState.currentRoomId,
        stepBudget: explorationState.stepBudget,
    };
}

function buildPatrolStep(
    map: TacticalMapCell[][],
    enemy: ZoneEnemy,
    blocked: Set<string>,
    turnStep: number,
    playerMapPos: TacticalPosition
): TacticalPosition {
    const neighbors = getNeighbors(map, { x: enemy.x, z: enemy.z }).filter(
        next => !blocked.has(`${next.x},${next.z}`) && !(next.x === playerMapPos.x && next.z === playerMapPos.z)
    );

    if (neighbors.length === 0) {
        return { x: enemy.x, z: enemy.z };
    }

    neighbors.sort((left, right) => {
        const leftScore = ((left.x * 31 + left.z * 17 + enemy.patrolSeed + turnStep) % 97 + 97) % 97;
        const rightScore = ((right.x * 31 + right.z * 17 + enemy.patrolSeed + turnStep) % 97 + 97) % 97;
        return leftScore - rightScore;
    });

    return neighbors[0];
}

function pickRoomObjectiveTile(map: TacticalMapCell[][], playerStart: TacticalPosition): TacticalPosition | null {
    const candidates = findFreeSpawnPositions(map, playerStart, 24).filter(
        pos => manhattanDistance(pos, playerStart) >= 3
    );
    if (candidates.length === 0) {
        return null;
    }
    return randomElement(candidates) ?? null;
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
        zoneContext: { kind: 'biome' },
        dungeonRoomId: null,
        dungeonObjectiveType: null,
        roomObjectiveResolved: false,
        roomObjectiveTile: null,
        mode3DState: 'FREE_MOVE',
        cameraMode: 'OVER_SHOULDER',
        currentRoomId: null,
        doorStates: {},
        roomGraphRef: null,
        stepBudget: 1,
        lineOfSightMask: [],
        eliteContactPending: null,
        trapAimTarget: null,
        showMinimap: false,
    },
    versusState: createInitialVersusState(),

    setInputMode: (mode) =>
        set(state => ({
            inputMode: mode,
            tacticalUiState: buildTacticalUiState(
                state.explorationState,
                mode,
                state.tacticalUiState?.blockReason ?? null,
                state.activeDungeonId ? state.dungeonRuntimeById[state.activeDungeonId] ?? null : null
            ),
        })),

    dispatchTacticalAction: (action) => {
        const state = get();
        const playerPos = state.explorationState.playerMapPos;

        switch (action.type) {
            case 'MoveStep':
                get().movePlayer(playerPos.x + action.dx, playerPos.z + action.dz);
                break;
            case 'MoveToTile':
                get().movePlayer(action.x, action.z);
                break;
            case 'ToggleTacticalPause':
                get().togglePlacementPause(action.forced);
                break;
            case 'SelectTrap':
                get().selectTrapType(action.trapType);
                break;
            case 'EnterTrapAim':
                if (state.explorationState.selectedTrapType) {
                    get().togglePlacementPause(true);
                }
                break;
            case 'AimTrapAt': {
                const range = state.explorationState.selectedTrapType
                    ? TRAP_DATA[state.explorationState.selectedTrapType].range
                    : state.explorationState.placementRange;
                const clamped = clampPlacementToRange(
                    state.explorationState.playerMapPos,
                    { x: action.x, z: action.z },
                    range
                );
                const nextExplorationState: ExplorationState = {
                    ...state.explorationState,
                    trapAimTarget: clamped ?? null,
                };
                set({
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode),
                });
                break;
            }
            case 'PlaceTrap': {
                const trapType = action.trapType ?? state.explorationState.selectedTrapType;
                if (!trapType) {
                    set({
                        explorationState: {
                            ...state.explorationState,
                            tacticalMessage: 'Selecciona una trampa antes de colocar.',
                        },
                        tacticalUiState: buildTacticalUiState({
                            ...state.explorationState,
                            tacticalMessage: 'Selecciona una trampa antes de colocar.',
                        }, state.inputMode, 'Selecciona una trampa antes de colocar.'),
                    });
                    return;
                }
                get().placeTrap(trapType, action.x, action.z);
                break;
            }
            case 'ConfirmTrapPlacement': {
                const trapType = state.explorationState.selectedTrapType;
                const target = state.explorationState.trapAimTarget;
                if (trapType && target) {
                    get().placeTrap(trapType, target.x, target.z);
                }
                break;
            }
            case 'CancelTrapAim': {
                const nextExplorationState: ExplorationState = {
                    ...state.explorationState,
                    placementMode: false,
                    tacticalPaused: false,
                    mode3DState: 'FREE_MOVE',
                    cameraMode: 'OVER_SHOULDER',
                    trapAimTarget: null,
                };
                set({
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode),
                });
                break;
            }
            case 'OpenDoor':
                get().openDoor(action.doorId);
                break;
            case 'ToggleMinimap': {
                const nextExplorationState: ExplorationState = {
                    ...state.explorationState,
                    showMinimap: !state.explorationState.showMinimap,
                };
                set({
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode),
                });
                break;
            }
            case 'SetCameraMode': {
                const nextExplorationState: ExplorationState = {
                    ...state.explorationState,
                    cameraMode: action.cameraMode,
                };
                set({
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode),
                });
                break;
            }
            case 'ExitTrapZone':
                get().exitTrapZone();
                break;
            default:
                break;
        }
    },

    initZone: (biome = 'forest', origin = null, zoneContext = { kind: 'biome' }) => {
        const seed = `${biome}:${origin?.x ?? 0},${origin?.y ?? 0}:${Date.now()}`;
        const map = generateTacticalMap(seed);
        const playerStart = { ...DEFAULT_PLAYER_START };
        const state = get();
        const isDungeon = zoneContext.kind === 'dungeon';
        const dungeonId = zoneContext.poiId || null;
        const existingRuntime = dungeonId ? state.dungeonRuntimeById[dungeonId] : null;
        const dungeonRuntime = isDungeon && dungeonId
            ? (existingRuntime ?? createDungeonRuntime(
                dungeonId,
                zoneContext.blueprintId || 'dorgotar-crypt',
                state.worldDay || 0,
                zoneContext.layoutVariantSeed
            ))
            : null;
        const blueprint = dungeonRuntime ? getDungeonBlueprint(dungeonRuntime.blueprintId) : null;
        const roomId = dungeonRuntime?.activeRoomId || zoneContext.entryRoomId || null;
        const room = (blueprint && dungeonRuntime)
            ? (roomId
                ? blueprint.rooms.find(item => item.id === roomId) ?? blueprint.rooms[Math.min(dungeonRuntime.roomCursor, blueprint.rooms.length - 1)]
                : blueprint.rooms[Math.min(dungeonRuntime.roomCursor, blueprint.rooms.length - 1)])
            : null;
        const roomObjectiveTile = isDungeon && (room?.objective === 'disarm_trap' || room?.objective === 'investigate')
            ? pickRoomObjectiveTile(map, playerStart)
            : null;
        const enemies = createZoneEnemies(map, playerStart).map((enemy, index) => {
            if (!isDungeon) return enemy;
            const tier = zoneContext.tier || 1;
            const threatBoost = dungeonRuntime?.threatLevel ?? 0;
            const eliteBoost = room?.elite ? 24 : 0;
            const hpBonus = tier * 6 + threatBoost * 4 + eliteBoost;
            const movement = room?.objective === 'survive_n_rounds' ? 2 : enemy.movement;
            return {
                ...enemy,
                hp: enemy.hp + hpBonus,
                maxHp: enemy.maxHp + hpBonus,
                movement,
                isElite: !!room?.elite && index === 0,
                name: room?.elite && index === 0 ? `${enemy.name} Elite` : enemy.name,
            };
        });
        const nextExplorationState: ExplorationState = {
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
            zoneName: isDungeon ? (blueprint?.name || 'Dungeon') : getZoneName(biome),
            wasZoneCompletedBeforeLevelUp: false,
            selectedTrapType: null,
            placementMode: false,
            placementRange: 1,
            highlightedTiles: [],
            turnStep: 0,
            isResolvingTurn: false,
            tacticalPaused: false,
            tacticalMessage: isDungeon
                ? `${blueprint?.hook || 'Adentrate con cuidado.'} Objetivo actual: ${room?.label || 'asegurar la sala'}.`
                : 'Pausa tactica: coloca trampas y mueve al enemigo a tu terreno.',
            returnOverworldPos: origin,
            zoneContext,
            dungeonRoomId: room?.id || null,
            dungeonObjectiveType: room?.objective || null,
            roomObjectiveResolved: false,
            roomObjectiveTile,
            mode3DState: 'FREE_MOVE',
            cameraMode: 'OVER_SHOULDER',
            currentRoomId: room?.id || null,
            doorStates: dungeonRuntime?.doorStates || {},
            roomGraphRef: dungeonRuntime?.roomGraph || null,
            stepBudget: 1,
            lineOfSightMask: [],
            eliteContactPending: null,
            trapAimTarget: null,
            showMinimap: false,
        };

        set({
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, null, dungeonRuntime),
            activeDungeonId: dungeonId,
            dungeonRuntimeById: dungeonRuntime && dungeonId
                ? {
                    ...state.dungeonRuntimeById,
                    [dungeonId]: dungeonRuntime,
                }
                : state.dungeonRuntimeById,
            encounterContext: createEncounterContext(
                get().gameState,
                origin,
                null,
                'RETURN_TO_OVERWORLD',
                'DROP_LOOT'
            ),
            gameState: GameState.EXPLORATION_3D,
        });
    },

    selectTrapType: (type) => {
        const { explorationState } = get();
        const range = type ? TRAP_DATA[type].range : 1;
        const nextExplorationState: ExplorationState = {
            ...explorationState,
            selectedTrapType: type,
            placementMode: !!type,
            tacticalPaused: !!type,
            mode3DState: type ? 'TRAP_AIM' : 'FREE_MOVE',
            cameraMode: type ? 'TACTICAL_ZOOM' : 'OVER_SHOULDER',
            placementRange: range,
            highlightedTiles: type
                ? buildTrapHighlights(explorationState.playerMapPos, range, explorationState.map)
                : [],
            trapAimTarget: type ? explorationState.playerMapPos : null,
            tacticalMessage: type
                ? `Coloca ${TRAP_DATA[type].name} dentro de alcance ${range}.`
                : null,
        };

        set({
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
        });
    },

    togglePlacementPause: (forced) => {
        const { explorationState } = get();
        const nextPaused = typeof forced === 'boolean' ? forced : !explorationState.tacticalPaused;
        const nextExplorationState: ExplorationState = {
            ...explorationState,
            tacticalPaused: nextPaused,
            placementMode: nextPaused && !!explorationState.selectedTrapType,
            mode3DState: nextPaused
                ? (explorationState.selectedTrapType ? 'TRAP_AIM' : 'TACTICAL_PAUSE')
                : 'FREE_MOVE',
            cameraMode: nextPaused ? 'TACTICAL_ZOOM' : 'OVER_SHOULDER',
            tacticalMessage: nextPaused ? 'Tiempo detenido: coloca trampas o reanuda la caceria.' : null,
        };
        set({
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
        });
    },

    placeTrap: (type, x, z) => {
        const { explorationState } = get();
        if (explorationState.traps.length >= explorationState.maxTraps) {
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'No puedes colocar mas trampas en esta zona.',
            };
            set({
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, 'No puedes colocar mas trampas en esta zona.'),
            });
            return false;
        }

        if (!isWalkable(explorationState.map, x, z)) {
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'Celda invalida: solo puedes colocar en terreno caminable.',
            };
            set({
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, 'Celda invalida para trampa.'),
            });
            return false;
        }

        const clamped = clampPlacementToRange(explorationState.playerMapPos, { x, z }, TRAP_DATA[type].range);
        if (!clamped) {
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                tacticalMessage: `Fuera de alcance (${TRAP_DATA[type].range}).`,
            };
            set({
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, `Fuera de alcance (${TRAP_DATA[type].range}).`),
            });
            return false;
        }

        const occupied = explorationState.traps.some(trap => trap.position.x === x && trap.position.z === z && trap.isArmed);
        if (occupied) {
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'Ya hay una trampa activa en esa celda.',
            };
            set({
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, 'Ya hay una trampa activa en esa celda.'),
            });
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

        const nextExplorationState: ExplorationState = {
            ...explorationState,
            traps: [...explorationState.traps, trap],
            selectedTrapType: null,
            placementMode: false,
            tacticalPaused: false,
            mode3DState: 'FREE_MOVE',
            cameraMode: 'OVER_SHOULDER',
            placementRange: 1,
            highlightedTiles: [],
            trapAimTarget: null,
            tacticalMessage: `${trapData.name} colocada en ${x},${z}.`,
        };
        set({
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
        });

        return true;
    },

    removeTrap: (trapId) => {
        const { explorationState } = get();
        const nextExplorationState: ExplorationState = {
            ...explorationState,
            traps: explorationState.traps.filter(trap => trap.id !== trapId),
        };
        set({
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
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
                nextEnemy.aiState = EnemyAiState.STUNNED;
            }

            if (trap.type === TrapType.POISON) {
                nextEnemy.poisonTurns = 2;
            }

            if (trap.type === TrapType.DECOY) {
                nextEnemy.decoyTurns = Math.max(nextEnemy.decoyTurns, 2);
                nextEnemy.aiState = EnemyAiState.DECOYED;
            }

            if (trap.type === TrapType.TELEPORT) {
                const destinations = findFreeSpawnPositions(explorationState.map, explorationState.playerMapPos, 12);
                const nextDestination = randomElement(destinations.filter(pos => pos.x !== enemy.x || pos.z !== enemy.z));
                if (nextDestination) {
                    nextEnemy.x = nextDestination.x;
                    nextEnemy.z = nextDestination.z;
                    nextEnemy.aiState = EnemyAiState.INVESTIGATE;
                    nextEnemy.lastKnownPlayerPos = { ...explorationState.playerMapPos };
                    nextEnemy.investigateStepsLeft = 2;
                    message = 'La trampa desvia al enemigo a otro sector del mapa.';
                }
            }

            if (nextEnemy.hp <= 0) {
                nextEnemy = { ...nextEnemy, hp: 0, isDefeated: true, x: -99, z: -99 };
            }

            return nextEnemy;
        });

        const nextExplorationState: ExplorationState = {
            ...explorationState,
            zoneEnemies: enemies,
            traps: explorationState.traps
                .map(item => item.id === trapId ? { ...item, isArmed: false, isTriggered: true, duration: 0 } : item)
                .filter(item => item.isArmed),
            tacticalMessage: message,
        };
        set({
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
        });

        return { damage: trapData.damage, message };
    },

    movePlayer: (newX, newZ) => {
        const state = get();
        const { explorationState } = state;
        if (explorationState.stepBudget <= 0) {
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'Sin acciones disponibles en este paso.',
            };
            set({
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, 'Sin acciones disponibles.'),
            });
            return;
        }
        const isSameTile =
            newX === explorationState.playerMapPos.x && newZ === explorationState.playerMapPos.z;

        if (
            isSameTile &&
            explorationState.zoneContext.kind === 'dungeon' &&
            explorationState.dungeonObjectiveType === 'disarm_trap' &&
            !explorationState.roomObjectiveResolved
        ) {
            const objectiveTile = explorationState.roomObjectiveTile;
            if (objectiveTile && objectiveTile.x === newX && objectiveTile.z === newZ) {
                const nextExplorationState: ExplorationState = {
                    ...explorationState,
                    roomObjectiveResolved: true,
                    zoneCompleted: true,
                    tacticalMessage: 'Desactivaste la trampa de la sala.',
                };
                let nextDungeonRuntime =
                    nextExplorationState.zoneContext.kind === 'dungeon' && get().activeDungeonId
                        ? get().dungeonRuntimeById[get().activeDungeonId]
                        : null;

                if (
                    nextDungeonRuntime &&
                    nextExplorationState.dungeonRoomId &&
                    !nextDungeonRuntime.resolvedRooms.includes(nextExplorationState.dungeonRoomId)
                ) {
                    nextDungeonRuntime = markDungeonRoomResolved(nextDungeonRuntime, nextExplorationState.dungeonRoomId);
                    set({
                        dungeonRuntimeById: {
                            ...get().dungeonRuntimeById,
                            [nextDungeonRuntime.dungeonId]: nextDungeonRuntime,
                        },
                    });
                }

                set({
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, null, nextDungeonRuntime),
                });
                return;
            }

            const blockedState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'Interaccion invalida: ve a la celda de desarme para desactivar la trampa.',
            };
            set({
                explorationState: blockedState,
                tacticalUiState: buildTacticalUiState(blockedState, get().inputMode, 'Debes estar sobre la celda objetivo para desarmar.'),
            });
            return;
        }

        if (explorationState.isResolvingTurn || explorationState.placementMode || explorationState.tacticalPaused) {
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'Accion bloqueada: reanuda la caceria para mover.',
            };
            set({
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, 'Accion bloqueada: reanuda la caceria para mover.'),
            });
            return;
        }

        if (!isWalkable(explorationState.map, newX, newZ)) {
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'Accion bloqueada: celda no caminable.',
            };
            set({
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, 'Accion bloqueada: celda no caminable.'),
            });
            return;
        }

        if (manhattanDistance(explorationState.playerMapPos, { x: newX, z: newZ }) !== 1) {
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'Accion bloqueada: solo puedes moverte 1 casillero por paso.',
            };
            set({
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, 'Accion bloqueada: solo puedes moverte 1 casillero por paso.'),
            });
            return;
        }

        const directContact = explorationState.zoneEnemies.find(enemy => !enemy.isDefeated && enemy.x === newX && enemy.z === newZ);
        if (directContact) {
            if (directContact.isElite) {
                get().startEncounter(directContact.id);
            } else {
                const leader = (get().party || [])[0];
                if (leader) {
                    const updatedParty = get().party.map((member: Entity, index: number) =>
                        index === 0
                            ? { ...member, stats: { ...member.stats, hp: Math.max(1, member.stats.hp - 4) } }
                            : member
                    );
                    set({
                        party: updatedParty,
                        explorationState: {
                            ...explorationState,
                            tacticalMessage: `${directContact.name} te impacta y sigue la persecucion.`,
                            mode3DState: 'CONTACT_RESOLVE',
                            stepBudget: 0,
                        },
                        tacticalUiState: buildTacticalUiState({
                            ...explorationState,
                            tacticalMessage: `${directContact.name} te impacta y sigue la persecucion.`,
                            mode3DState: 'CONTACT_RESOLVE',
                            stepBudget: 0,
                        }, get().inputMode),
                    });
                }
            }
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

            // Effect resolution order: poison -> stun -> decoy -> chase/investigate/patrol.
            if (nextEnemy.poisonTurns > 0) {
                nextEnemy.poisonTurns -= 1;
                nextEnemy.hp = Math.max(0, nextEnemy.hp - 6);
                if (nextEnemy.hp <= 0) {
                    return { ...nextEnemy, hp: 0, isDefeated: true, x: -99, z: -99 };
                }
            }

            if (nextEnemy.stunnedTurns > 0) {
                nextEnemy.stunnedTurns -= 1;
                nextEnemy.aiState = EnemyAiState.STUNNED;
                blockedPositions.add(`${nextEnemy.x},${nextEnemy.z}`);
                return nextEnemy;
            }

            const activeDecoy = explorationState.traps.find(
                trap =>
                    trap.isArmed &&
                    trap.type === TrapType.DECOY &&
                    (trap.duration ?? 0) > 0
            );

            const distanceToPlayer = manhattanDistance({ x: nextEnemy.x, z: nextEnemy.z }, playerMapPos);
            const canSeePlayer = distanceToPlayer <= nextEnemy.alertRange;

            let target: TacticalPosition | null = null;

            if (activeDecoy && manhattanDistance({ x: nextEnemy.x, z: nextEnemy.z }, { x: activeDecoy.position.x, z: activeDecoy.position.z }) <= nextEnemy.alertRange) {
                nextEnemy.aiState = EnemyAiState.DECOYED;
                nextEnemy.decoyTurns = Math.max(nextEnemy.decoyTurns, 1);
                target = { x: activeDecoy.position.x, z: activeDecoy.position.z };
            } else if (canSeePlayer) {
                nextEnemy.aiState = EnemyAiState.CHASE;
                nextEnemy.lastKnownPlayerPos = { ...playerMapPos };
                nextEnemy.investigateStepsLeft = 2;
                nextEnemy.decoyTurns = 0;
                target = playerMapPos;
            } else if (nextEnemy.lastKnownPlayerPos && nextEnemy.investigateStepsLeft > 0) {
                nextEnemy.aiState = EnemyAiState.INVESTIGATE;
                target = { ...nextEnemy.lastKnownPlayerPos };
            } else {
                nextEnemy.aiState = EnemyAiState.PATROL;
                nextEnemy.lastKnownPlayerPos = null;
                nextEnemy.investigateStepsLeft = 0;
                target = null;
            }

            for (let step = 0; step < nextEnemy.movement; step++) {
                const dynamicBlocked = new Set([...blockedPositions, `${playerMapPos.x},${playerMapPos.z}`]);
                let nextStep = { x: nextEnemy.x, z: nextEnemy.z };

                if (nextEnemy.aiState === EnemyAiState.PATROL) {
                    nextStep = buildPatrolStep(explorationState.map, nextEnemy, dynamicBlocked, explorationState.turnStep + 1, playerMapPos);
                } else if (target) {
                    nextStep = findClosestStepTowards(
                        explorationState.map,
                        { x: nextEnemy.x, z: nextEnemy.z },
                        target,
                        dynamicBlocked
                    );
                }

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

            if (nextEnemy.aiState === EnemyAiState.INVESTIGATE) {
                nextEnemy.investigateStepsLeft = Math.max(0, nextEnemy.investigateStepsLeft - 1);
                if (nextEnemy.investigateStepsLeft <= 0) {
                    nextEnemy.aiState = EnemyAiState.PATROL;
                    nextEnemy.lastKnownPlayerPos = null;
                }
            }

            if (!nextEnemy.isDefeated) {
                if (nextEnemy.aiState !== EnemyAiState.DECOYED) {
                    nextEnemy.decoyTurns = 0;
                }
                blockedPositions.add(`${nextEnemy.x},${nextEnemy.z}`);
            }

            return nextEnemy;
        });

        const aliveEnemies = enemies.filter(enemy => !enemy.isDefeated);
        const nextTurnStep = explorationState.turnStep + 1;
        const objectiveTileReached =
            !!explorationState.roomObjectiveTile &&
            explorationState.roomObjectiveTile.x === playerMapPos.x &&
            explorationState.roomObjectiveTile.z === playerMapPos.z;
        let roomObjectiveResolved = explorationState.roomObjectiveResolved;
        let zoneCompleted = aliveEnemies.length === 0;
        if (explorationState.zoneContext.kind === 'dungeon') {
            if (explorationState.dungeonObjectiveType === 'survive_n_rounds' && nextTurnStep >= 4) {
                roomObjectiveResolved = true;
                zoneCompleted = true;
            }
            if (explorationState.dungeonObjectiveType === 'investigate' && objectiveTileReached) {
                roomObjectiveResolved = true;
                zoneCompleted = true;
            }
            if (explorationState.dungeonObjectiveType === 'disarm_trap' && roomObjectiveResolved) {
                zoneCompleted = true;
            }
        }
        const reactionSummary = aliveEnemies.length > 0
            ? `Reaccion enemiga: ${aliveEnemies.length} hostiles activos.`
            : 'Sin hostiles en la zona.';

        const nextExplorationState: ExplorationState = {
            ...get().explorationState,
            zoneEnemies: enemies,
            playerMapPos,
            currentEnemyId,
            turnStep: nextTurnStep,
            mode3DState: currentEnemyId ? 'CONTACT_RESOLVE' : 'ROOM_RESULT',
            zoneCompleted,
            roomObjectiveResolved,
            stepBudget: 1,
            traps: decayTrapDurations(get().explorationState.traps),
            tacticalMessage: zoneCompleted
                ? 'La zona quedo limpia. Puedes volver al mapa hex.'
                : triggeredMessage ?? reactionSummary,
        };
        let nextDungeonRuntime =
            nextExplorationState.zoneContext.kind === 'dungeon' && get().activeDungeonId
                ? get().dungeonRuntimeById[get().activeDungeonId]
                : null;

        if (
            zoneCompleted &&
            nextDungeonRuntime &&
            nextExplorationState.dungeonRoomId &&
            !nextDungeonRuntime.resolvedRooms.includes(nextExplorationState.dungeonRoomId)
        ) {
            nextDungeonRuntime = markDungeonRoomResolved(nextDungeonRuntime, nextExplorationState.dungeonRoomId);
            set({
                dungeonRuntimeById: {
                    ...get().dungeonRuntimeById,
                    [nextDungeonRuntime.dungeonId]: nextDungeonRuntime,
                },
            });
        }

        set({
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, null, nextDungeonRuntime),
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
        const nextExplorationState: ExplorationState = {
            ...explorationState,
            currentEnemyId: enemyId,
            tacticalMessage: `Contacto con ${enemy.name}.`,
            mode3DState: 'CONTACT_RESOLVE',
            eliteContactPending: enemyId,
        };
        set({
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
            encounterContext: {
                ...(get().encounterContext ?? createEncounterContext(GameState.OVERWORLD, explorationState.returnOverworldPos, null)),
                enemyId,
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

    resolveEncounterOutcome: (outcome) => {
        const state = get();
        const { explorationState, versusState, party, encounterContext } = state;
        const currentEnemyId = outcome.enemyId ?? encounterContext?.enemyId ?? explorationState.currentEnemyId;
        const defeatedEnemy = explorationState.zoneEnemies.find(enemy => enemy.id === currentEnemyId);
        const resetVersusState = createInitialVersusState();
        const returnPolicy = encounterContext?.returnPolicy ?? 'RETURN_TO_OVERWORLD';
        const lossPolicy = encounterContext?.lossPolicy ?? 'DROP_LOOT';

        const updatedParty = party.map((member, index) =>
            index === versusState.playerIndex
                ? {
                    ...member,
                    stats: {
                        ...member.stats,
                        hp: outcome.type === 'VICTORY' ? versusState.playerCurrentHp : 0,
                    },
                }
                : member
        );

        if (outcome.type === 'VICTORY' && currentEnemyId) {
            const enemies = explorationState.zoneEnemies.map(enemy =>
                enemy.id === currentEnemyId
                    ? { ...enemy, isDefeated: true, hp: 0, x: -99, z: -99 }
                    : enemy
            );
            const allEnemiesDefeated = enemies.every(enemy => enemy.isDefeated);
            const roomResolvedByVs =
                explorationState.zoneContext.kind === 'dungeon' &&
                (explorationState.dungeonObjectiveType === 'elite_contact' || allEnemiesDefeated);
            const zoneCompleted = explorationState.zoneCompleted || allEnemiesDefeated || roomResolvedByVs;
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                zoneEnemies: enemies,
                currentEnemyId: null,
                zoneCompleted,
                roomObjectiveResolved: explorationState.roomObjectiveResolved || roomResolvedByVs,
                wasZoneCompletedBeforeLevelUp: zoneCompleted,
                eliteContactPending: null,
                mode3DState: 'FREE_MOVE',
                tacticalMessage: zoneCompleted
                    ? 'Has limpiado la zona. Regresa al overworld cuando quieras.'
                    : `${defeatedEnemy?.name || 'El enemigo'} ya no esta en el mapa.`,
            };

            let nextDungeonRuntime =
                nextExplorationState.zoneContext.kind === 'dungeon' && get().activeDungeonId
                    ? get().dungeonRuntimeById[get().activeDungeonId]
                    : null;
            if (
                zoneCompleted &&
                nextDungeonRuntime &&
                nextExplorationState.dungeonRoomId &&
                !nextDungeonRuntime.resolvedRooms.includes(nextExplorationState.dungeonRoomId)
            ) {
                nextDungeonRuntime = markDungeonRoomResolved(nextDungeonRuntime, nextExplorationState.dungeonRoomId);
                set({
                    dungeonRuntimeById: {
                        ...get().dungeonRuntimeById,
                        [nextDungeonRuntime.dungeonId]: nextDungeonRuntime,
                    },
                });
            }

            set({
                party: updatedParty,
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, null, nextDungeonRuntime),
                encounterContext: encounterContext ? { ...encounterContext, enemyId: null } : null,
                versusState: resetVersusState,
                gameState: GameState.EXPLORATION_3D,
            });

            if (defeatedEnemy) {
                get().addPartyXp(Math.max(20, Math.floor(defeatedEnemy.maxHp / 2)));
            }

            return;
        }

        if (outcome.type === 'DEFEAT') {
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                currentEnemyId: null,
                eliteContactPending: null,
                mode3DState: 'FREE_MOVE',
                tacticalMessage: 'Derrota. Regresas al mapa hex sin loot.',
            };
            const shouldReturnToTrap = returnPolicy === 'RETURN_TO_TRAP_HUNT';
            const nextGameState = shouldReturnToTrap ? GameState.EXPLORATION_3D : GameState.OVERWORLD;

            if (lossPolicy === 'DROP_LOOT') {
                const penalty = applyLootPenalty(state);
                set({
                    ...penalty,
                    party: penalty.party,
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
                    encounterContext: null,
                    versusState: resetVersusState,
                    gameState: nextGameState,
                });
            } else if (lossPolicy === 'LIGHT_PENALTY') {
                set({
                    party: updatedParty.map(member => ({
                        ...member,
                        stats: {
                            ...member.stats,
                            hp: Math.max(1, member.stats.hp),
                        },
                    })),
                    gold: Math.max(0, state.gold - 25),
                    fatigue: Math.min(100, state.fatigue + 6),
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
                    encounterContext: null,
                    versusState: resetVersusState,
                    gameState: nextGameState,
                });
            } else {
                set({
                    party: updatedParty,
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
                    encounterContext: null,
                    versusState: resetVersusState,
                    gameState: nextGameState,
                });
            }

            if (!shouldReturnToTrap) {
                get().syncOverworldEnemies();
            }
            get().addLog('Has sido derrotado y pierdes el loot que llevabas encima.', 'narrative');
            return;
        }

        const nextExplorationState: ExplorationState = {
            ...explorationState,
            currentEnemyId: null,
            eliteContactPending: null,
            mode3DState: 'FREE_MOVE',
            tacticalMessage: 'Huyes y retomas la caceria con el enemigo aun activo.',
        };
        set({
            fatigue: Math.min(100, state.fatigue + 2),
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
            encounterContext: encounterContext ? { ...encounterContext, enemyId: null } : null,
            versusState: resetVersusState,
            gameState: GameState.EXPLORATION_3D,
        });
    },

    endVersusBattle: (victory) => {
        get().resolveEncounterOutcome({ type: victory ? 'VICTORY' : 'DEFEAT' });
    },

    fleeFromBattle: () => {
        get().resolveEncounterOutcome({ type: 'FLEE' });
    },

    nextCharacterTurn: () => {},

    openDoor: (doorId) => {
        const state = get();
        const { explorationState, activeDungeonId } = state;
        if (!activeDungeonId || !explorationState.roomGraphRef) {
            return;
        }

        const runtime = state.dungeonRuntimeById[activeDungeonId];
        if (!runtime?.roomGraph) {
            return;
        }

        const door = runtime.roomGraph.doors[doorId];
        if (!door) {
            return;
        }

        if (runtime.doorStates[doorId] === 'locked') {
            const nextExplorationState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'Puerta bloqueada. Requiere activar un mecanismo.',
            };
            set({
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode, 'Puerta bloqueada.'),
            });
            return;
        }

        const runtimeWithOpenDoor = openDungeonDoor(runtime, doorId);
        const currentRoom = explorationState.currentRoomId || runtimeWithOpenDoor.activeRoomId || runtimeWithOpenDoor.roomGraph.entryRoomId;
        const targetRoom = door.fromRoomId === currentRoom ? door.toRoomId : door.fromRoomId;
        const roomDefinition = getDungeonBlueprint(runtimeWithOpenDoor.blueprintId).rooms.find(room => room.id === targetRoom);

        const seed = `${runtimeWithOpenDoor.dungeonId}:${targetRoom}:${Date.now()}`;
        const map = generateTacticalMap(seed);
        const playerStart = { ...DEFAULT_PLAYER_START };
        const roomObjectiveTile = (roomDefinition?.objective === 'disarm_trap' || roomDefinition?.objective === 'investigate')
            ? pickRoomObjectiveTile(map, playerStart)
            : null;
        const zoneEnemies = createZoneEnemies(map, playerStart).map((enemy, index) => {
            if (!roomDefinition) return enemy;
            const elite = !!roomDefinition.elite && index === 0;
            return {
                ...enemy,
                isElite: elite,
                hp: enemy.hp + (elite ? 24 : 0),
                maxHp: enemy.maxHp + (elite ? 24 : 0),
                name: elite ? `${enemy.name} Elite` : enemy.name,
            };
        });

        const nextRuntime: DungeonRuntimeState = {
            ...runtimeWithOpenDoor,
            activeRoomId: targetRoom,
            roomStates: {
                ...runtimeWithOpenDoor.roomStates,
                [targetRoom]: runtimeWithOpenDoor.roomStates[targetRoom] === 'resolved'
                    ? 'resolved'
                    : 'active',
            },
            discoveredRooms: runtimeWithOpenDoor.discoveredRooms.includes(targetRoom)
                ? runtimeWithOpenDoor.discoveredRooms
                : [...runtimeWithOpenDoor.discoveredRooms, targetRoom],
        };

        const nextExplorationState: ExplorationState = {
            ...explorationState,
            map,
            zoneEnemies,
            playerMapPos: playerStart,
            entrancePos: playerStart,
            currentEnemyId: null,
            currentRoomId: targetRoom,
            dungeonRoomId: targetRoom,
            dungeonObjectiveType: roomDefinition?.objective || null,
            roomObjectiveResolved: false,
            roomObjectiveTile,
            doorStates: nextRuntime.doorStates,
            roomGraphRef: nextRuntime.roomGraph,
            tacticalMessage: `Abres una puerta y entras en ${roomDefinition?.label || targetRoom}.`,
            mode3DState: 'FREE_MOVE',
            stepBudget: 1,
        };

        set({
            dungeonRuntimeById: {
                ...state.dungeonRuntimeById,
                [activeDungeonId]: nextRuntime,
            },
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode, null, nextRuntime),
        });
    },

    exitTrapZone: () => {
        const { explorationState, encounterContext } = get();
        if (explorationState.zoneCompleted) {
            get().clearCurrentEncounter();
        }

        const nextExplorationState: ExplorationState = {
            ...explorationState,
            selectedTrapType: null,
            placementMode: false,
            tacticalPaused: false,
            highlightedTiles: [],
            tacticalMessage: null,
            mode3DState: 'FREE_MOVE',
            cameraMode: 'OVER_SHOULDER',
            trapAimTarget: null,
            eliteContactPending: null,
            stepBudget: 1,
        };
        set({
            gameState: GameState.OVERWORLD,
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
            encounterContext: encounterContext ? { ...encounterContext, enemyId: null } : null,
        });
        get().syncOverworldEnemies();
    },
});
