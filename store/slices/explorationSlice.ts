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
    TacticalStepPhase,
    TacticalUiState,
    Trap,
    TrapOrientation,
    TrapPlacementSurface,
    TrapType,
    ZoneContext,
    SnapState
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
    generateDungeonRoomMap,
    generateTacticalMap,
    getNeighbors,
    isWalkable,
    manhattanDistance,
    TacticalEnvironmentTrap,
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
    resistances: {
        floor: number;
        wall: number;
        ceiling: number;
    };
    intelligenceLevel: number;
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
    movementIntent: TacticalPosition | null;
    smoothedWorldPos: TacticalPosition;
    lastStableGridPos: TacticalPosition;
    snapState: SnapState;
    stepPhase: TacticalStepPhase;
    contactCooldown: number;
    comboChain: number;
    comboMultiplier: number;
    comboExpiresAtStep: number;
    trapCurrency: number;
    arkCurrency: number;
    trapOrientation: TrapOrientation;
    trapCooldowns: Partial<Record<TrapType, number>>;
    trapMastery: Record<TrapType, { unlocked: boolean; level: number; uses: number; kills: number }>;
    environmentTraps: TacticalEnvironmentTrap[];
    roomEntrances: TacticalPosition[];
}

interface VersusState {
    isActive: boolean;
    playerIndex: number;
    playerCurrentHp: number;
    playerMaxHp: number;
    enemyCurrentHp: number;
    enemyMaxHp: number;
    enemyName: string;
    enemySprite: string;
    turn: 'PLAYER' | 'ENEMY';
    battleLog: string[];
    isPlayerTurn: boolean;
}

export interface ExplorationSlice {
    explorationState: ExplorationState;
    versusState: VersusState;

    initZone: (biome?: string, origin?: PositionComponent | null, zoneContext?: ZoneContext) => void;
    startDirectEncounter: (enemyId: string, enemyName: string, enemySprite: string, enemyHp: number, enemyMaxHp: number) => void;
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
const COMMON_CONTACT_DAMAGE = 4;
const COMMON_CONTACT_KNOCKBACK = 1;
const COMMON_CONTACT_COOLDOWN_STEPS = 1;
const SNAP_DEADZONE = 0.2;
const CHAIN_WINDOW_STEPS = 3;
const DEFAULT_TRAP_ORIENTATION: TrapOrientation = 'N';

function initialTrapMastery(): Record<TrapType, { unlocked: boolean; level: number; uses: number; kills: number }> {
    const mastery = {} as Record<TrapType, { unlocked: boolean; level: number; uses: number; kills: number }>;
    (Object.keys(TRAP_DATA) as TrapType[]).forEach(type => {
        mastery[type] = {
            unlocked: (TRAP_DATA[type].unlockCost ?? 0) === 0,
            level: 1,
            uses: 0,
            kills: 0,
        };
    });
    return mastery;
}

function orientationToVector(orientation: TrapOrientation): TacticalPosition {
    if (orientation === 'N') return { x: 0, z: -1 };
    if (orientation === 'E') return { x: 1, z: 0 };
    if (orientation === 'S') return { x: 0, z: 1 };
    return { x: -1, z: 0 };
}

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
            if (manhattanDistance(origin, { x, z }) <= range) {
                highlights.push({ x, z });
            }
        }
    }

    return highlights;
}

function isPlacementValidForSurface(
    map: TacticalMapCell[][],
    x: number,
    z: number,
    surface: TrapPlacementSurface
): boolean {
    const cell = map[x]?.[z];
    if (!cell) return false;
    const isRoom = cell.zone === 'ROOM';
    if (!isRoom) return false;

    if (surface === 'floor' || surface === 'ceiling') {
        return !!cell.walkable;
    }

    return cell.type === 'WALL' || cell.type === 'STONE';
}

function clampIntent(dx: number, dz: number): TacticalPosition {
    if (Math.abs(dx) > Math.abs(dz)) {
        return { x: dx > 0 ? 1 : -1, z: 0 };
    }
    if (Math.abs(dz) > 0) {
        return { x: 0, z: dz > 0 ? 1 : -1 };
    }
    return { x: 0, z: 0 };
}

function computeLineOfSightMask(
    map: TacticalMapCell[][],
    origin: TacticalPosition,
    roomGraph: DungeonRoomGraph | null,
    currentRoomId: string | null,
    doorStates: Record<string, DoorState>
): string[] {
    const radius = roomGraph && currentRoomId ? 7 : 6;
    const allowedRooms = new Set<string>();

    if (roomGraph && currentRoomId) {
        allowedRooms.add(currentRoomId);
        Object.values(roomGraph.doors).forEach(door => {
            const state = doorStates[door.id] ?? door.state;
            if (state !== 'open') return;
            if (door.fromRoomId === currentRoomId) allowedRooms.add(door.toRoomId);
            if (door.toRoomId === currentRoomId) allowedRooms.add(door.fromRoomId);
        });
    }

    const mask: string[] = [];
    for (let x = 0; x < map.length; x++) {
        for (let z = 0; z < map[x].length; z++) {
            if (manhattanDistance(origin, { x, z }) > radius) continue;
            if (!isWalkable(map, x, z)) continue;
            if (allowedRooms.size > 0 && !allowedRooms.has(currentRoomId || '')) continue;
            mask.push(`${x},${z}`);
        }
    }
    return mask;
}

function computeKnockbackTarget(
    map: TacticalMapCell[][],
    origin: TacticalPosition,
    from: TacticalPosition,
    blocked: Set<string>
): TacticalPosition {
    const dx = origin.x - from.x;
    const dz = origin.z - from.z;
    const intent = clampIntent(dx, dz);
    const candidate = {
        x: origin.x + intent.x * COMMON_CONTACT_KNOCKBACK,
        z: origin.z + intent.z * COMMON_CONTACT_KNOCKBACK,
    };
    if (!isWalkable(map, candidate.x, candidate.z)) return origin;
    if (blocked.has(`${candidate.x},${candidate.z}`)) return origin;
    return candidate;
}

function getSurfaceResistance(enemy: ZoneEnemy, surface: Trap['placementSurface']): number {
    if (surface === 'wall') return enemy.resistances.wall;
    if (surface === 'ceiling') return enemy.resistances.ceiling;
    return enemy.resistances.floor;
}

function shouldExtendCombo(enemy: ZoneEnemy): boolean {
    return enemy.aiState === EnemyAiState.STUNNED || enemy.aiState === EnemyAiState.DECOYED || enemy.poisonTurns > 0;
}

function computeComboMultiplier(chainLength: number): number {
    return Math.max(1, 1 + (chainLength - 1) * 0.35);
}

function createZoneEnemies(map: TacticalMapCell[][], playerStart: TacticalPosition, entrances: TacticalPosition[] = []): ZoneEnemy[] {
    const enemyCount = 4 + randomInt(0, 2);
    const entranceSpawns = entrances
        .filter(pos => isWalkable(map, pos.x, pos.z))
        .filter(pos => manhattanDistance(pos, playerStart) >= 4)
        .slice(0, enemyCount);
    const fallback = findFreeSpawnPositions(map, playerStart, enemyCount);
    const spawns = [...entranceSpawns, ...fallback].slice(0, enemyCount);

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
            resistances: {
                floor: Math.min(0.75, Math.max(0.05, randomInt(10, 45) / 100)),
                wall: Math.min(0.75, Math.max(0.05, randomInt(5, 35) / 100)),
                ceiling: Math.min(0.75, Math.max(0.05, randomInt(5, 40) / 100)),
            },
            intelligenceLevel: randomInt(1, 10),
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

function decayTrapCooldowns(cooldowns: Partial<Record<TrapType, number>>): Partial<Record<TrapType, number>> {
    const next: Partial<Record<TrapType, number>> = {};
    (Object.keys(cooldowns) as TrapType[]).forEach(type => {
        const value = cooldowns[type] ?? 0;
        next[type] = Math.max(0, value - 1);
    });
    return next;
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
        enemyName: '',
        enemySprite: '',
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
        stepPhase: explorationState.stepPhase,
        comboChain: explorationState.comboChain,
        comboMultiplier: explorationState.comboMultiplier,
        trapCurrency: explorationState.arkCurrency,
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
        movementIntent: null,
        smoothedWorldPos: { ...DEFAULT_PLAYER_START },
        lastStableGridPos: { ...DEFAULT_PLAYER_START },
        snapState: 'SNAPPED',
        stepPhase: 'PLAYER_STEP',
        contactCooldown: 0,
        comboChain: 0,
        comboMultiplier: 1,
        comboExpiresAtStep: 0,
        trapCurrency: 0,
        arkCurrency: 0,
        trapOrientation: DEFAULT_TRAP_ORIENTATION,
        trapCooldowns: {},
        trapMastery: initialTrapMastery(),
        environmentTraps: [],
        roomEntrances: [],
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
                get().dispatchTacticalAction({ type: 'UpdateMovementIntent', dx: action.dx, dz: action.dz });
                get().dispatchTacticalAction({ type: 'CommitStep' });
                break;
            case 'MoveToTile':
                if (
                    action.x === playerPos.x &&
                    action.z === playerPos.z &&
                    state.explorationState.zoneContext.kind === 'dungeon' &&
                    state.explorationState.dungeonObjectiveType === 'disarm_trap' &&
                    !state.explorationState.roomObjectiveResolved
                ) {
                    const objective = state.explorationState.roomObjectiveTile;
                    if (objective && objective.x === action.x && objective.z === action.z) {
                        const nextExplorationState: ExplorationState = {
                            ...state.explorationState,
                            roomObjectiveResolved: true,
                            zoneCompleted: true,
                            tacticalMessage: 'Desactivaste la trampa de la sala.',
                            stepPhase: 'END_STEP',
                        };
                        set({
                            explorationState: nextExplorationState,
                            tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode),
                        });
                    } else {
                        const blockedState: ExplorationState = {
                            ...state.explorationState,
                            tacticalMessage: 'Debes estar en la celda objetivo para desarmar.',
                            stepPhase: 'PLAYER_STEP',
                        };
                        set({
                            explorationState: blockedState,
                            tacticalUiState: buildTacticalUiState(blockedState, state.inputMode, 'Interaccion invalida.'),
                        });
                    }
                    return;
                }
                get().dispatchTacticalAction({
                    type: 'UpdateMovementIntent',
                    dx: action.x - playerPos.x,
                    dz: action.z - playerPos.z,
                });
                get().dispatchTacticalAction({ type: 'CommitStep' });
                break;
            case 'UpdateMovementIntent': {
                const currentExploration = state.explorationState;
                const intent = clampIntent(action.dx, action.dz);
                const nextSmoothed = {
                    x: currentExploration.smoothedWorldPos.x + intent.x * 0.35,
                    z: currentExploration.smoothedWorldPos.z + intent.z * 0.35,
                };
                const stableDelta = manhattanDistance(currentExploration.lastStableGridPos, {
                    x: Math.round(nextSmoothed.x),
                    z: Math.round(nextSmoothed.z),
                });
                const nextExplorationState: ExplorationState = {
                    ...currentExploration,
                    movementIntent: intent,
                    smoothedWorldPos: nextSmoothed,
                    snapState: stableDelta > 0 ? 'SMOOTHING' : 'SNAPPED',
                };
                set({
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode),
                });
                break;
            }
            case 'CommitStep': {
                const intent = state.explorationState.movementIntent;
                if (!intent || (intent.x === 0 && intent.z === 0)) {
                    const blockedState: ExplorationState = {
                        ...state.explorationState,
                        tacticalMessage: 'Sin direccion de movimiento.',
                    };
                    set({
                        explorationState: blockedState,
                        tacticalUiState: buildTacticalUiState(blockedState, state.inputMode, 'Sin direccion de movimiento.'),
                    });
                    return;
                }
                get().movePlayer(state.explorationState.playerMapPos.x + intent.x, state.explorationState.playerMapPos.z + intent.z);
                break;
            }
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
            case 'SetTrapOrientation': {
                const nextExplorationState: ExplorationState = {
                    ...state.explorationState,
                    trapOrientation: action.orientation,
                    tacticalMessage: `Orientacion de trampa: ${action.orientation}.`,
                };
                set({
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode),
                });
                break;
            }
            case 'TriggerTrapSurface': {
                const current = state.explorationState;
                const armed = current.traps.filter(trap => trap.isArmed && (trap.triggerMode ?? 'auto') === 'manual' && (trap.placementSurface ?? 'floor') === action.surface);
                if (armed.length === 0) {
                    const nextExplorationState: ExplorationState = {
                        ...current,
                        tacticalMessage: `No hay trampas manuales de ${action.surface}.`,
                    };
                    set({
                        explorationState: nextExplorationState,
                        tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode, 'Sin trampas manuales listas.'),
                    });
                    return;
                }

                let enemies = current.zoneEnemies.map(enemy => ({ ...enemy }));
                let traps = current.traps.map(trap => ({ ...trap }));
                let comboChain = current.turnStep <= current.comboExpiresAtStep ? current.comboChain : 0;
                let comboMultiplier = current.turnStep <= current.comboExpiresAtStep ? current.comboMultiplier : 1;
                let earnedArk = 0;
                let triggeredAny = false;
                let killedByTrap = 0;

                armed.forEach(armedTrap => {
                    const trapIndex = traps.findIndex(item => item.id === armedTrap.id);
                    if (trapIndex < 0) return;
                    const trapData = TRAP_DATA[armedTrap.type];
                    const force = armedTrap.forceVector ?? orientationToVector(current.trapOrientation);
                    enemies = enemies.map(enemy => {
                        if (enemy.isDefeated) return enemy;
                        const sameTile = enemy.x === armedTrap.position.x && enemy.z === armedTrap.position.z;
                        const nearTile = manhattanDistance({ x: enemy.x, z: enemy.z }, { x: armedTrap.position.x, z: armedTrap.position.z }) <= 1;
                        if (!sameTile && !(action.surface !== 'floor' && nearTile)) {
                            return enemy;
                        }
                        triggeredAny = true;
                        comboChain = shouldExtendCombo(enemy) ? comboChain + 1 : Math.max(1, comboChain + 1);
                        comboMultiplier = computeComboMultiplier(comboChain);
                        const resistance = getSurfaceResistance(enemy, armedTrap.placementSurface);
                        const scaledDamage = trapData.damage + ((current.trapMastery[armedTrap.type]?.level ?? 1) - 1) * (trapData.damagePerLevel ?? 0);
                        const perfectTiming =
                            typeof armedTrap.armedAtStep === 'number' &&
                            current.turnStep - armedTrap.armedAtStep <= Math.max(1, armedTrap.activationDelay ?? 0);
                        const timingBonus = perfectTiming ? 1.2 : 1;
                        const finalDamage = Math.max(1, Math.round(scaledDamage * (1 - resistance) * comboMultiplier * timingBonus));
                        earnedArk += Math.max(1, Math.round(finalDamage / 3));
                        let nextEnemy = { ...enemy, hp: Math.max(0, enemy.hp - finalDamage) };

                        if (armedTrap.stateEffect === 'stun') {
                            nextEnemy.stunnedTurns = 1;
                            nextEnemy.aiState = EnemyAiState.STUNNED;
                        } else if (armedTrap.stateEffect === 'poison') {
                            nextEnemy.poisonTurns = Math.max(nextEnemy.poisonTurns, 2);
                        } else if (armedTrap.stateEffect === 'knockback' || armedTrap.stateEffect === 'launch') {
                            const pushed = {
                                x: nextEnemy.x + force.x,
                                z: nextEnemy.z + force.z,
                            };
                            if (isWalkable(current.map, pushed.x, pushed.z)) {
                                nextEnemy.x = pushed.x;
                                nextEnemy.z = pushed.z;
                            }
                        }

                        if (nextEnemy.hp <= 0) {
                            killedByTrap += 1;
                            nextEnemy = { ...nextEnemy, hp: 0, isDefeated: true, x: -99, z: -99 };
                        }
                        return nextEnemy;
                    });
                    traps[trapIndex] = {
                        ...traps[trapIndex],
                        isArmed: false,
                        isTriggered: true,
                        cooldownRemaining: trapData.cooldown,
                    };
                });

                if (!triggeredAny) {
                    const nextExplorationState: ExplorationState = {
                        ...current,
                        tacticalMessage: `Sin objetivo para activar trampas de ${action.surface}.`,
                    };
                    set({
                        explorationState: nextExplorationState,
                        tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode, 'No hay enemigos en zona de activacion.'),
                    });
                    return;
                }

                const updatedMastery = { ...current.trapMastery };
                traps.forEach(trap => {
                    if (trap.isTriggered) {
                        const prev = updatedMastery[trap.type];
                        updatedMastery[trap.type] = { ...prev, uses: prev.uses + 1, kills: prev.kills + killedByTrap };
                    }
                });

                const nextExplorationState: ExplorationState = {
                    ...current,
                    zoneEnemies: enemies,
                    traps: traps.filter(trap => trap.isArmed),
                    comboChain,
                    comboMultiplier,
                    comboExpiresAtStep: current.turnStep + CHAIN_WINDOW_STEPS,
                    trapCurrency: current.trapCurrency + earnedArk,
                    arkCurrency: current.arkCurrency + earnedArk,
                    trapMastery: updatedMastery,
                    tacticalMessage: `Activacion manual ${action.surface}: combo x${comboMultiplier.toFixed(2)} | Ark +${earnedArk}.`,
                };
                set({
                    gold: get().gold + earnedArk,
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode),
                });
                break;
            }
            case 'UpgradeTrap': {
                const current = state.explorationState;
                const trapData = TRAP_DATA[action.trapType];
                const entry = current.trapMastery[action.trapType];
                if (!entry) return;

                const unlockCost = trapData.unlockCost ?? 0;
                if (!entry.unlocked) {
                    if (current.arkCurrency < unlockCost) {
                        const blockedState: ExplorationState = {
                            ...current,
                            tacticalMessage: `Ark insuficiente para desbloquear ${trapData.name}.`,
                        };
                        set({
                            explorationState: blockedState,
                            tacticalUiState: buildTacticalUiState(blockedState, state.inputMode, 'Ark insuficiente.'),
                        });
                        return;
                    }
                    const nextMastery = {
                        ...current.trapMastery,
                        [action.trapType]: { ...entry, unlocked: true },
                    };
                    const nextExplorationState: ExplorationState = {
                        ...current,
                        arkCurrency: current.arkCurrency - unlockCost,
                        trapMastery: nextMastery,
                        tacticalMessage: `${trapData.name} desbloqueada.`,
                    };
                    set({
                        explorationState: nextExplorationState,
                        tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode),
                    });
                    return;
                }

                const upgradeCost = trapData.upgradeCost ?? 40;
                if (current.arkCurrency < upgradeCost) {
                    const blockedState: ExplorationState = {
                        ...current,
                        tacticalMessage: `Ark insuficiente para mejorar ${trapData.name}.`,
                    };
                    set({
                        explorationState: blockedState,
                        tacticalUiState: buildTacticalUiState(blockedState, state.inputMode, 'Ark insuficiente.'),
                    });
                    return;
                }

                const nextMastery = {
                    ...current.trapMastery,
                    [action.trapType]: { ...entry, level: Math.min(10, entry.level + 1) },
                };
                const nextExplorationState: ExplorationState = {
                    ...current,
                    arkCurrency: current.arkCurrency - upgradeCost,
                    trapMastery: nextMastery,
                    tacticalMessage: `${trapData.name} mejorada a nivel ${nextMastery[action.trapType].level}.`,
                };
                set({
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode),
                });
                break;
            }
            case 'ClearFeedback': {
                const nextExplorationState: ExplorationState = {
                    ...state.explorationState,
                    tacticalMessage: null,
                };
                set({
                    explorationState: nextExplorationState,
                    tacticalUiState: buildTacticalUiState(nextExplorationState, state.inputMode, null),
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
        let map = generateTacticalMap(seed);
        let playerStart = { ...DEFAULT_PLAYER_START };
        let roomEntrances: TacticalPosition[] = [];
        let environmentTraps: TacticalEnvironmentTrap[] = [];
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
        if (isDungeon) {
            const roomMap = generateDungeonRoomMap(
                `${seed}:${room?.id || 'room'}`,
                room?.kind || 'setup'
            );
            map = roomMap.map;
            playerStart = { ...roomMap.entrances[0] };
            roomEntrances = roomMap.entrances;
            environmentTraps = roomMap.environmentTraps;
        }
        const roomObjectiveTileFinal = isDungeon && (room?.objective === 'disarm_trap' || room?.objective === 'investigate')
            ? pickRoomObjectiveTile(map, playerStart)
            : null;
        const enemies = createZoneEnemies(map, playerStart, roomEntrances).map((enemy, index) => {
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
            roomObjectiveTile: roomObjectiveTileFinal,
            mode3DState: 'FREE_MOVE',
            cameraMode: 'OVER_SHOULDER',
            currentRoomId: room?.id || null,
            doorStates: dungeonRuntime?.doorStates || {},
            roomGraphRef: dungeonRuntime?.roomGraph || null,
            stepBudget: 1,
            lineOfSightMask: computeLineOfSightMask(
                map,
                playerStart,
                dungeonRuntime?.roomGraph || null,
                room?.id || null,
                dungeonRuntime?.doorStates || {}
            ),
            eliteContactPending: null,
            trapAimTarget: null,
            showMinimap: false,
            movementIntent: null,
            smoothedWorldPos: { ...playerStart },
            lastStableGridPos: { ...playerStart },
            snapState: 'SNAPPED',
            stepPhase: 'PLAYER_STEP',
            contactCooldown: 0,
            comboChain: 0,
            comboMultiplier: 1,
            comboExpiresAtStep: 0,
            trapCurrency: state.tacticalUiState?.trapCurrency ?? 0,
            arkCurrency: state.explorationState?.arkCurrency ?? 0,
            trapOrientation: state.explorationState?.trapOrientation ?? DEFAULT_TRAP_ORIENTATION,
            trapCooldowns: state.explorationState?.trapCooldowns ?? {},
            trapMastery: state.explorationState?.trapMastery ?? initialTrapMastery(),
            environmentTraps,
            roomEntrances,
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
        if (type && !explorationState.trapMastery[type]?.unlocked) {
            const blockedState: ExplorationState = {
                ...explorationState,
                tacticalMessage: `${TRAP_DATA[type].name} bloqueada. Usa Ark para desbloquear.`,
            };
            set({
                explorationState: blockedState,
                tacticalUiState: buildTacticalUiState(blockedState, get().inputMode, 'Trampa bloqueada.'),
            });
            return;
        }
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
        const mastery = explorationState.trapMastery[type];
        if (!mastery?.unlocked) {
            const blockedState: ExplorationState = {
                ...explorationState,
                tacticalMessage: `${TRAP_DATA[type].name} no esta desbloqueada.`,
            };
            set({
                explorationState: blockedState,
                tacticalUiState: buildTacticalUiState(blockedState, get().inputMode, 'Trampa bloqueada.'),
            });
            return false;
        }
        if ((explorationState.trapCooldowns[type] ?? 0) > 0) {
            const blockedState: ExplorationState = {
                ...explorationState,
                tacticalMessage: `${TRAP_DATA[type].name} en cooldown (${explorationState.trapCooldowns[type]}).`,
            };
            set({
                explorationState: blockedState,
                tacticalUiState: buildTacticalUiState(blockedState, get().inputMode, 'Cooldown activo.'),
            });
            return false;
        }
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

        const trapData = TRAP_DATA[type];
        const placementSurface = trapData.placementSurface ?? 'floor';
        if (explorationState.map[x]?.[z]?.zone !== 'ROOM') {
            const blockedState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'Solo puedes colocar trampas en habitaciones.',
            };
            set({
                explorationState: blockedState,
                tacticalUiState: buildTacticalUiState(blockedState, get().inputMode, 'Pasillos sin trampas.'),
            });
            return false;
        }
        if (!isPlacementValidForSurface(explorationState.map, x, z, placementSurface)) {
            const blockedState: ExplorationState = {
                ...explorationState,
                tacticalMessage:
                    placementSurface === 'wall'
                        ? 'Trampa de pared: coloca sobre muro o pilar de sala.'
                        : placementSurface === 'ceiling'
                            ? 'Trampa de techo: requiere celda caminable de sala.'
                            : 'Trampa de piso: requiere celda caminable de sala.',
            };
            set({
                explorationState: blockedState,
                tacticalUiState: buildTacticalUiState(blockedState, get().inputMode, 'Celda invalida para superficie seleccionada.'),
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

        const trapLevel = mastery.level;
        const orientationVector = orientationToVector(explorationState.trapOrientation);
        const trap: Trap = {
            id: `trap_${Date.now()}_${generateId()}`,
            type,
            position: { x, y: 0, z },
            isArmed: true,
            isTriggered: false,
            duration: trapData.duration,
            description: trapData.description,
            placementSurface,
            triggerMode: trapData.triggerMode ?? 'auto',
            stateEffect: trapData.stateEffect ?? 'none',
            forceVector: trapData.forceVector ?? { x: 0, z: 0 },
            cooldownRemaining: 0,
            orientation: explorationState.trapOrientation,
            armedAtStep: explorationState.turnStep,
            activationDelay: trapData.activationDelay ?? 0,
            damage: trapData.damage + (trapLevel - 1) * (trapData.damagePerLevel ?? 0),
        };

        const nextExplorationState: ExplorationState = {
            ...explorationState,
            traps: [...explorationState.traps, trap],
            trapCooldowns: {
                ...explorationState.trapCooldowns,
                [type]: trapData.cooldown,
            },
            trapMastery: {
                ...explorationState.trapMastery,
                [type]: {
                    ...mastery,
                    uses: mastery.uses + 1,
                },
            },
            selectedTrapType: null,
            placementMode: false,
            tacticalPaused: false,
            mode3DState: 'FREE_MOVE',
            cameraMode: 'OVER_SHOULDER',
            placementRange: 1,
            highlightedTiles: [],
            trapAimTarget: null,
            tacticalMessage: `${trapData.name} colocada ${explorationState.trapOrientation} (${orientationVector.x},${orientationVector.z}).`,
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
        const withinWindow = explorationState.turnStep <= explorationState.comboExpiresAtStep;
        let nextChain = withinWindow ? explorationState.comboChain : 0;
        let nextMultiplier = withinWindow ? explorationState.comboMultiplier : 1;
        let earnedCurrency = 0;

        const enemies = explorationState.zoneEnemies.map(enemy => {
            if (!enemyId || enemy.id !== enemyId) {
                return enemy;
            }

            const resistance = getSurfaceResistance(enemy, trap.placementSurface);
            const baseDamage = Math.max(1, Math.round(trapData.damage * (1 - resistance)));
            if (shouldExtendCombo(enemy)) {
                nextChain += 1;
            } else {
                nextChain = Math.max(1, nextChain + 1);
            }
            nextMultiplier = computeComboMultiplier(nextChain);
            const finalDamage = Math.max(1, Math.round(baseDamage * nextMultiplier));
            earnedCurrency += Math.max(1, Math.round(finalDamage / 4));
            let nextEnemy = { ...enemy, hp: Math.max(0, enemy.hp - finalDamage) };

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
            tacticalMessage: `${message} Combo x${nextMultiplier.toFixed(2)}.`,
            comboChain: nextChain,
            comboMultiplier: nextMultiplier,
            comboExpiresAtStep: explorationState.turnStep + CHAIN_WINDOW_STEPS,
            trapCurrency: explorationState.trapCurrency + earnedCurrency,
            arkCurrency: explorationState.arkCurrency + earnedCurrency,
        };
        set({
            gold: get().gold + earnedCurrency,
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
        });

        return { damage: Math.max(0, Math.round(trapData.damage * nextMultiplier)), message };
    },

    movePlayer: (newX, newZ) => {
        const state = get();
        const { explorationState } = state;
        const block = (message: string) => {
            const blockedState: ExplorationState = {
                ...get().explorationState,
                tacticalMessage: message,
                stepPhase: 'PLAYER_STEP',
            };
            set({
                explorationState: blockedState,
                tacticalUiState: buildTacticalUiState(blockedState, get().inputMode, message),
            });
        };

        if (explorationState.stepBudget <= 0) {
            block('Sin acciones disponibles en este paso.');
            return;
        }
        if (explorationState.isResolvingTurn || explorationState.placementMode || explorationState.tacticalPaused) {
            block('Accion bloqueada: reanuda la caceria para mover.');
            return;
        }
        if (!isWalkable(explorationState.map, newX, newZ)) {
            block('Accion bloqueada: celda no caminable.');
            return;
        }
        if (manhattanDistance(explorationState.playerMapPos, { x: newX, z: newZ }) !== 1) {
            block('Accion bloqueada: solo puedes moverte 1 casillero por paso.');
            return;
        }

        const resolveStepCycle = (committedPos: TacticalPosition) => {
            const current = get().explorationState;
            let phase: TacticalStepPhase = 'PLAYER_STEP';
            let enemies = current.zoneEnemies.map(enemy => ({ ...enemy }));
            let traps = current.traps.map(trap => ({ ...trap, position: { ...trap.position } }));
            let playerMapPos = { ...committedPos };
            let tacticalMessage: string | null = null;
            let triggeredMessage: string | null = null;
            let contactEnemyId: string | null = null;
            let party = get().party;
            let earnedCurrency = 0;
            let comboChain = current.turnStep <= current.comboExpiresAtStep ? current.comboChain : 0;
            let comboMultiplier = current.turnStep <= current.comboExpiresAtStep ? current.comboMultiplier : 1;

            phase = 'ENEMY_REACT';
            const blockedPositions = new Set<string>();
            const activeDecoy = traps.find(trap => trap.isArmed && trap.type === TrapType.DECOY && (trap.duration ?? 0) > 0);

            enemies = enemies.map(enemy => {
                if (enemy.isDefeated) return enemy;
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
                    nextEnemy.aiState = EnemyAiState.STUNNED;
                    blockedPositions.add(`${nextEnemy.x},${nextEnemy.z}`);
                    return nextEnemy;
                }

                const distanceToPlayer = manhattanDistance({ x: nextEnemy.x, z: nextEnemy.z }, playerMapPos);
                const canSeePlayer = distanceToPlayer <= nextEnemy.alertRange;
                const tacticalAwareness = ((nextEnemy.patrolSeed + current.turnStep) % 10) + 1;
                let target: TacticalPosition | null = null;

                if (activeDecoy && manhattanDistance({ x: nextEnemy.x, z: nextEnemy.z }, { x: activeDecoy.position.x, z: activeDecoy.position.z }) <= nextEnemy.alertRange) {
                    nextEnemy.aiState = EnemyAiState.DECOYED;
                    nextEnemy.decoyTurns = Math.max(nextEnemy.decoyTurns, 1);
                    target = { x: activeDecoy.position.x, z: activeDecoy.position.z };
                } else if (canSeePlayer && tacticalAwareness <= nextEnemy.intelligenceLevel) {
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
                    const dynamicBlocked = new Set([...blockedPositions]);
                    let nextStep = { x: nextEnemy.x, z: nextEnemy.z };

                    if (nextEnemy.aiState === EnemyAiState.PATROL) {
                        nextStep = buildPatrolStep(current.map, nextEnemy, dynamicBlocked, current.turnStep + 1, playerMapPos);
                    } else if (target) {
                        nextStep = findClosestStepTowards(current.map, { x: nextEnemy.x, z: nextEnemy.z }, target, dynamicBlocked);
                    }

                    if (nextStep.x === nextEnemy.x && nextStep.z === nextEnemy.z) break;
                    nextEnemy.x = nextStep.x;
                    nextEnemy.z = nextStep.z;

                    phase = 'TRAP_RESOLVE';
                    const trapIndex = traps.findIndex(item => item.isArmed && item.position.x === nextEnemy.x && item.position.z === nextEnemy.z);
                    if (trapIndex >= 0) {
                        const trap = traps[trapIndex];
                        const trapData = TRAP_DATA[trap.type];
                        if ((trap.triggerMode ?? trapData.triggerMode ?? 'auto') === 'auto') {
                            const resistance = getSurfaceResistance(nextEnemy, trap.placementSurface ?? trapData.placementSurface ?? 'floor');
                            const baseDamage = Math.max(1, Math.round(trapData.damage * (1 - resistance)));
                            comboChain = shouldExtendCombo(nextEnemy) ? comboChain + 1 : Math.max(1, comboChain + 1);
                            comboMultiplier = computeComboMultiplier(comboChain);
                            const finalDamage = Math.max(1, Math.round(baseDamage * comboMultiplier));
                            earnedCurrency += Math.max(1, Math.round(finalDamage / 4));
                            nextEnemy.hp = Math.max(0, nextEnemy.hp - finalDamage);
                            triggeredMessage = `${trapData.triggerMessage} Combo x${comboMultiplier.toFixed(2)}.`;

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
                            if (nextEnemy.hp <= 0) {
                                nextEnemy = { ...nextEnemy, hp: 0, isDefeated: true, x: -99, z: -99 };
                            }
                            traps[trapIndex] = { ...trap, isArmed: false, isTriggered: true, duration: 0, cooldownRemaining: trapData.cooldown };
                        }
                    }

                    const envTrap = current.environmentTraps.find(env => env.position.x === nextEnemy.x && env.position.z === nextEnemy.z);
                    if (envTrap) {
                        comboChain = shouldExtendCombo(nextEnemy) ? comboChain + 1 : Math.max(1, comboChain + 1);
                        comboMultiplier = computeComboMultiplier(comboChain);
                        const finalDamage = Math.max(1, Math.round(envTrap.damage * comboMultiplier));
                        earnedCurrency += Math.max(1, Math.round(finalDamage / 4));
                        nextEnemy.hp = Math.max(0, nextEnemy.hp - finalDamage);
                        triggeredMessage = `Entorno ${envTrap.type} activo! Combo x${comboMultiplier.toFixed(2)}.`;
                        if (envTrap.stateEffect === 'stun') {
                            nextEnemy.stunnedTurns = 1;
                            nextEnemy.aiState = EnemyAiState.STUNNED;
                        } else if (envTrap.stateEffect === 'knockback' || envTrap.stateEffect === 'launch') {
                            const pushed = { x: nextEnemy.x + envTrap.forceVector.x, z: nextEnemy.z + envTrap.forceVector.z };
                            if (isWalkable(current.map, pushed.x, pushed.z)) {
                                nextEnemy.x = pushed.x;
                                nextEnemy.z = pushed.z;
                            }
                        }
                        if (nextEnemy.hp <= 0) {
                            nextEnemy = { ...nextEnemy, hp: 0, isDefeated: true, x: -99, z: -99 };
                        }
                    }

                    if (nextEnemy.isDefeated) break;
                    if (nextEnemy.x === playerMapPos.x && nextEnemy.z === playerMapPos.z) {
                        contactEnemyId = nextEnemy.id;
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
                    if (nextEnemy.aiState !== EnemyAiState.DECOYED) nextEnemy.decoyTurns = 0;
                    blockedPositions.add(`${nextEnemy.x},${nextEnemy.z}`);
                }
                return nextEnemy;
            });

            phase = 'CONTACT_CHECK';
            const contactEnemy = contactEnemyId ? enemies.find(enemy => enemy.id === contactEnemyId && !enemy.isDefeated) : null;
            if (contactEnemy) {
                if (contactEnemy.isElite) {
                    tacticalMessage = `Contacto elite con ${contactEnemy.name}.`;
                } else {
                    const blocked = new Set<string>(enemies.filter(enemy => !enemy.isDefeated).map(enemy => `${enemy.x},${enemy.z}`));
                    playerMapPos = computeKnockbackTarget(current.map, playerMapPos, { x: contactEnemy.x, z: contactEnemy.z }, blocked);
                    party = party.map((member: Entity, index: number) =>
                        index === 0
                            ? { ...member, stats: { ...member.stats, hp: Math.max(1, member.stats.hp - COMMON_CONTACT_DAMAGE) } }
                            : member
                    );
                    tacticalMessage = `${contactEnemy.name} te golpea (-${COMMON_CONTACT_DAMAGE}) y te empuja.`;
                    contactEnemyId = null;
                }
            }

            phase = 'END_STEP';
            const aliveEnemies = enemies.filter(enemy => !enemy.isDefeated);
            const nextTurnStep = current.turnStep + 1;
            const objectiveTileReached =
                !!current.roomObjectiveTile &&
                current.roomObjectiveTile.x === playerMapPos.x &&
                current.roomObjectiveTile.z === playerMapPos.z;
            let roomObjectiveResolved = current.roomObjectiveResolved;
            let zoneCompleted = aliveEnemies.length === 0;

            if (current.zoneContext.kind === 'dungeon') {
                if (current.dungeonObjectiveType === 'survive_n_rounds' && nextTurnStep >= 4) {
                    roomObjectiveResolved = true;
                    zoneCompleted = true;
                }
                if (current.dungeonObjectiveType === 'investigate' && objectiveTileReached) {
                    roomObjectiveResolved = true;
                    zoneCompleted = true;
                }
                if (current.dungeonObjectiveType === 'disarm_trap' && roomObjectiveResolved) {
                    zoneCompleted = true;
                }
            }

            const reactionSummary = aliveEnemies.length > 0
                ? `Reaccion enemiga: ${aliveEnemies.length} hostiles activos.`
                : 'Sin hostiles en la zona.';

            const snapped = {
                x: Math.abs(playerMapPos.x - current.smoothedWorldPos.x) <= SNAP_DEADZONE ? playerMapPos.x : current.smoothedWorldPos.x,
                z: Math.abs(playerMapPos.z - current.smoothedWorldPos.z) <= SNAP_DEADZONE ? playerMapPos.z : current.smoothedWorldPos.z,
            };

            const nextExplorationState: ExplorationState = {
                ...current,
                zoneEnemies: enemies,
                traps: decayTrapDurations(traps.filter(trap => trap.isArmed)),
                trapCooldowns: decayTrapCooldowns(current.trapCooldowns),
                playerMapPos,
                lastStableGridPos: { ...playerMapPos },
                smoothedWorldPos: snapped,
                snapState: 'SNAPPED',
                movementIntent: null,
                currentEnemyId: contactEnemyId,
                turnStep: nextTurnStep,
                mode3DState: contactEnemyId ? 'CONTACT_RESOLVE' : 'ROOM_RESULT',
                stepPhase: phase,
                zoneCompleted,
                roomObjectiveResolved,
                stepBudget: 1,
                contactCooldown: Math.max(0, current.contactCooldown - 1) || (tacticalMessage ? COMMON_CONTACT_COOLDOWN_STEPS : 0),
                comboChain,
                comboMultiplier,
                comboExpiresAtStep: comboChain > 0 ? nextTurnStep + CHAIN_WINDOW_STEPS : 0,
                trapCurrency: current.trapCurrency + earnedCurrency,
                arkCurrency: current.arkCurrency + earnedCurrency,
                lineOfSightMask: computeLineOfSightMask(current.map, playerMapPos, current.roomGraphRef, current.currentRoomId, current.doorStates),
                tacticalMessage: zoneCompleted
                    ? 'La zona quedo limpia. Puedes volver al mapa hex.'
                    : tacticalMessage ?? triggeredMessage ?? reactionSummary,
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
                party,
                gold: get().gold + earnedCurrency,
                explorationState: nextExplorationState,
                tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode, null, nextDungeonRuntime),
            });

            if (contactEnemyId) {
                get().startEncounter(contactEnemyId);
            }
        };

        resolveStepCycle({ x: newX, z: newZ });
    },

    startDirectEncounter: (enemyId, enemyName, enemySprite, enemyHp, enemyMaxHp) => {
        const { party, explorationState } = get();
        const playerIndex = party.findIndex(member => member.stats.hp > 0);
        if (playerIndex === -1) return;

        const player = party[playerIndex];
        set({
            explorationState: {
                ...explorationState,
                currentEnemyId: enemyId,
                tacticalMessage: `Contacto con ${enemyName}.`,
                mode3DState: 'CONTACT_RESOLVE',
                zoneCompleted: false,
            },
            encounterContext: {
                sourceGameState: GameState.OVERWORLD,
                returnOverworldPos: null,
                enemyId,
                returnPolicy: 'RETURN_TO_OVERWORLD',
                lossPolicy: 'DROP_LOOT',
            },
            versusState: {
                isActive: true,
                playerIndex,
                playerCurrentHp: player.stats.hp,
                playerMaxHp: player.stats.maxHp,
                enemyCurrentHp: enemyHp,
                enemyMaxHp: enemyMaxHp,
                enemyName: enemyName,
                enemySprite: enemySprite,
                turn: 'PLAYER',
                battleLog: [
                    `${enemyName} intercepta tu avance.`,
                    '¡Enfrentamiento!',
                ],
                isPlayerTurn: true,
            },
            gameState: GameState.BATTLE_VERSUS,
        });
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
                enemyName: enemy.name,
                enemySprite: enemy.sprite,
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
                gameState: returnPolicy === 'RETURN_TO_OVERWORLD' ? GameState.OVERWORLD : GameState.EXPLORATION_3D,
            });

            if (defeatedEnemy) {
                get().addPartyXp(Math.max(20, Math.floor(defeatedEnemy.maxHp / 2)));
            }
            
            if (returnPolicy === 'RETURN_TO_OVERWORLD') {
                get().clearCurrentEncounter();
                get().syncOverworldEnemies();
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
        const shouldReturnToOverworld = returnPolicy === 'RETURN_TO_OVERWORLD';
        set({
            fatigue: Math.min(100, state.fatigue + 2),
            explorationState: nextExplorationState,
            tacticalUiState: buildTacticalUiState(nextExplorationState, get().inputMode),
            encounterContext: encounterContext ? { ...encounterContext, enemyId: null } : null,
            versusState: resetVersusState,
            gameState: shouldReturnToOverworld ? GameState.OVERWORLD : GameState.EXPLORATION_3D,
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
        if (explorationState.stepBudget <= 0) {
            const blockedState: ExplorationState = {
                ...explorationState,
                tacticalMessage: 'Sin acciones disponibles para abrir puerta.',
                stepPhase: 'PLAYER_STEP',
            };
            set({
                explorationState: blockedState,
                tacticalUiState: buildTacticalUiState(blockedState, state.inputMode, 'Sin acciones disponibles.'),
            });
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
                stepPhase: 'PLAYER_STEP',
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
        const roomMap = generateDungeonRoomMap(seed, roomDefinition?.kind || 'setup');
        const map = roomMap.map;
        const playerStart = { ...(roomMap.entrances[0] ?? DEFAULT_PLAYER_START) };
        const roomObjectiveTile = (roomDefinition?.objective === 'disarm_trap' || roomDefinition?.objective === 'investigate')
            ? pickRoomObjectiveTile(map, playerStart)
            : null;
        const zoneEnemies = createZoneEnemies(map, playerStart, roomMap.entrances).map((enemy, index) => {
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
            turnStep: explorationState.turnStep + 1,
            lineOfSightMask: computeLineOfSightMask(
                map,
                playerStart,
                nextRuntime.roomGraph,
                targetRoom,
                nextRuntime.doorStates
            ),
            movementIntent: null,
            smoothedWorldPos: { ...playerStart },
            lastStableGridPos: { ...playerStart },
            snapState: 'SNAPPED',
            stepPhase: 'END_STEP',
            contactCooldown: Math.max(0, explorationState.contactCooldown - 1),
            comboChain: explorationState.comboChain,
            comboMultiplier: explorationState.comboMultiplier,
            comboExpiresAtStep: explorationState.comboExpiresAtStep,
            trapCurrency: explorationState.trapCurrency,
            arkCurrency: explorationState.arkCurrency,
            trapOrientation: explorationState.trapOrientation,
            trapCooldowns: explorationState.trapCooldowns,
            trapMastery: explorationState.trapMastery,
            environmentTraps: roomMap.environmentTraps,
            roomEntrances: roomMap.entrances,
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
            movementIntent: null,
            smoothedWorldPos: { ...explorationState.playerMapPos },
            lastStableGridPos: { ...explorationState.playerMapPos },
            snapState: 'SNAPPED',
            stepPhase: 'PLAYER_STEP',
            contactCooldown: 0,
            comboChain: 0,
            comboMultiplier: 1,
            comboExpiresAtStep: 0,
            trapCurrency: explorationState.trapCurrency,
            arkCurrency: explorationState.arkCurrency,
            trapOrientation: explorationState.trapOrientation,
            trapCooldowns: explorationState.trapCooldowns,
            trapMastery: explorationState.trapMastery,
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
