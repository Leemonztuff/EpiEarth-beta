
import { create } from 'zustand';
import { GameStateData, GameState, Dimension, Difficulty, TrapType } from '../types';
import { createPlayerSlice, PlayerSlice } from './slices/playerSlice';
import { createInventorySlice, InventorySlice } from './slices/inventorySlice';
import { createOverworldSlice, OverworldSlice } from './slices/overworldSlice';
import { createCommonSlice, CommonSlice } from './slices/commonSlice';
import { createExplorationSlice, ExplorationSlice } from './slices/explorationSlice';
import { TRAP_DATA } from '../data/trapsData';

// Compose the store type from all slices
export type GameStore = PlayerSlice & InventorySlice & OverworldSlice & CommonSlice & ExplorationSlice & GameStateData;

export const useGameStore = create<GameStore>((set, get, api) => {
    const common = createCommonSlice(set, get, api);
    const player = createPlayerSlice(set, get, api);
    const inventory = createInventorySlice(set, get, api);
    const overworld = createOverworldSlice(set, get, api);
    const exploration = createExplorationSlice(set, get, api);

    const trapMasteryDefaults = Object.fromEntries(
        (Object.keys(TRAP_DATA) as TrapType[]).map(type => [
            type,
            {
                unlocked: (TRAP_DATA[type].unlockCost ?? 0) === 0,
                level: 1,
                uses: 0,
                kills: 0,
            },
        ])
    ) as Record<TrapType, { unlocked: boolean; level: number; uses: number; kills: number }>;

    return {
        ...common,
        ...player,
        ...inventory,
        ...overworld,
        ...exploration,
        // Explicitly ensuring GameStateData compliance if any field is missing in creators
        gameState: GameState.TITLE,
        inputMode: 'desktop',
        dimension: Dimension.NORMAL,
        difficulty: Difficulty.NORMAL,
        exploredTiles: { [Dimension.NORMAL]: new Set(), [Dimension.UPSIDE_DOWN]: new Set() },
        visitedTowns: new Set(),
        clearedEncounters: new Set(),
        townMapData: null,
        playerPos: { x: 0, y: 0 },
        isPlayerMoving: false,
        lastOverworldPos: null,
        mapDimensions: { width: 40, height: 30 },
        quests: {}, 
        standingOnPortal: false,
        standingOnSettlement: false,
        standingOnTemple: false,
        standingOnDungeon: false,
        isMapOpen: false,
        isScreenShaking: false, 
        isScreenFlashing: false, 
        gracePeriodEndTime: 0,
        supplies: 20,
        fatigue: 0,
        worldTime: 480,
        worldDay: 0,
        currentRegionName: null,
        currentSettlementName: null,
        activeNarrativeEvent: null,
        activeIncursion: null,
        activeDungeonId: null,
        dungeonRuntimeById: {},
        encounterContext: null,
        tacticalUiState: {
            zoneName: 'Bosque de Caceria',
            message: null,
            blockReason: null,
            inputHints: ['WASD/Flechas: mover', 'P: pausa tactica'],
            turnStep: 0,
            trapCount: 0,
            maxTraps: 5,
            enemyCount: 0,
            selectedTrapType: null,
            selectedTrapRange: null,
            tacticalPaused: false,
            placementMode: false,
            objectiveLabel: null,
            riskLabel: null,
            timelineLabel: null,
            twistLabel: null,
            poiStateTag: null,
            mode3DState: 'FREE_MOVE',
            currentRoomId: null,
            stepBudget: 1,
            stepPhase: 'PLAYER_STEP',
            comboChain: 0,
            comboMultiplier: 1,
            trapCurrency: 0,
        },
        standingOnPort: false,
        inspectedEntityId: null,
        explorationState: {
            map: [],
            mapSize: 18,
            playerMapPos: { x: 3, z: 9 },
            entrancePos: { x: 3, z: 9 },
            traps: [],
            maxTraps: 5,
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
            smoothedWorldPos: { x: 3, z: 9 },
            lastStableGridPos: { x: 3, z: 9 },
            snapState: 'SNAPPED',
            stepPhase: 'PLAYER_STEP',
            contactCooldown: 0,
            comboChain: 0,
            comboMultiplier: 1,
            comboExpiresAtStep: 0,
            trapCurrency: 0,
            arkCurrency: 0,
            trapOrientation: 'N',
            trapCooldowns: {},
            trapMastery: trapMasteryDefaults,
            environmentTraps: [],
            roomEntrances: [],
        },
        versusState: {
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
            isPlayerTurn: true
        }
    };
});
