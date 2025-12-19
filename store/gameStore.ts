
import { create } from 'zustand';
import { GameStateData, GameState, Dimension, Difficulty } from '../types';
import { createPlayerSlice, PlayerSlice } from './slices/playerSlice';
import { createInventorySlice, InventorySlice } from './slices/inventorySlice';
import { createOverworldSlice, OverworldSlice } from './slices/overworldSlice';
import { createBattleSlice, BattleSlice } from './slices/battleSlice';
import { createCommonSlice, CommonSlice } from './slices/commonSlice';

// Compose the store type from all slices
export type GameStore = PlayerSlice & InventorySlice & OverworldSlice & BattleSlice & CommonSlice & GameStateData;

export const useGameStore = create<GameStore>((set, get, api) => {
    const common = createCommonSlice(set, get, api);
    const player = createPlayerSlice(set, get, api);
    const inventory = createInventorySlice(set, get, api);
    const overworld = createOverworldSlice(set, get, api);
    const battle = createBattleSlice(set, get, api);

    return {
        ...common,
        ...player,
        ...inventory,
        ...overworld,
        ...battle,
        // Explicitly ensuring GameStateData compliance if any field is missing in creators
        gameState: GameState.TITLE,
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
        quests: [],
        standingOnPortal: false,
        standingOnSettlement: false,
        standingOnTemple: false,
        standingOnDungeon: false,
        isMapOpen: false,
        gracePeriodEndTime: 0,
        supplies: 20,
        fatigue: 0,
        worldTime: 480,
        currentRegionName: null,
        activeNarrativeEvent: null,
        activeIncursion: null,
        standingOnPort: false,
        inspectedEntityId: null
    };
});
