
// @ts-nocheck
import { StateCreator } from 'zustand';
import { GameState, Dimension, Difficulty, HexCell, PositionComponent, WeatherType, TerrainType, MovementType, Quest } from '../../types';
import { WorldGenerator } from '../../services/WorldGenerator';
import { findPath } from '../../services/pathfinding';
import { calculateVisionRange } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { getSupabase } from '../../services/supabaseClient';
import { TERRAIN_MOVEMENT_COST, ITEMS } from '../../constants';

export interface OverworldSlice {
  gameState: GameState;
  dimension: Dimension;
  difficulty: Difficulty;
  exploredTiles: Record<Dimension, Set<string>>;
  visitedTowns: Set<string>; 
  clearedEncounters: Set<string>;
  townMapData: HexCell[] | null;
  playerPos: PositionComponent;
  isPlayerMoving: boolean;
  lastOverworldPos: PositionComponent | null;
  fatigue: number;
  supplies: number; 
  worldTime: number; 
  quests: Quest[];
  currentRegionName: string | null;
  standingOnPortal: boolean;
  standingOnSettlement: boolean;
  standingOnTemple: boolean;
  standingOnDungeon: boolean;
  standingOnPort: boolean;
  gracePeriodEndTime: number;
  activeNarrativeEvent: any | null;
  activeIncursion: any | null;
  userSession: any | null;
  
  initializeWorld: () => void;
  movePlayerOverworld: (q: number, r: number) => Promise<void>;
  hireCarriage: (targetQ: number, targetR: number) => void;
  buySupplies: (amount: number, cost: number) => void;
  camp: () => Promise<void>;
  usePortal: () => void;
  enterSettlement: () => void;
  exitSettlement: () => void;
  setUserSession: (session: any) => void;
  logout: () => Promise<void>;
  resolveNarrativeOption: (optionIndex: number) => void;
  addQuest: (quest: Quest) => void;
}

export const createOverworldSlice: StateCreator<any, [], [], OverworldSlice> = (set, get) => ({
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
  fatigue: 0,
  supplies: 20, 
  worldTime: 480,
  quests: [],
  currentRegionName: null,
  standingOnPortal: false,
  standingOnSettlement: false,
  standingOnTemple: false,
  standingOnDungeon: false,
  standingOnPort: false,
  gracePeriodEndTime: 0,
  activeNarrativeEvent: null,
  activeIncursion: null,
  userSession: null,

  setUserSession: (session) => set({ userSession: session }),

  logout: async () => {
      const supabase = getSupabase();
      if (supabase) await supabase.auth.signOut();
      set({ userSession: null });
      sfx.playUiClick();
      get().addLog("Logged out.", "info");
  },

  initializeWorld: () => { WorldGenerator.init(12345); },

  buySupplies: (amount, cost) => {
    if (get().spendGold(cost)) {
        set(s => ({ supplies: s.supplies + amount }));
        sfx.playUiClick();
        get().addLog(`Bought ${amount} Supplies.`, "info");
    }
  },

  hireCarriage: (q, r) => {
    const cost = 50;
    if (get().spendGold(cost)) {
        set({ playerPos: { x: q, y: r }, worldTime: (get().worldTime + 180) % 1440, fatigue: Math.min(100, get().fatigue + 10) });
        get().addLog("The carriage ride was bumpy but fast.", "narrative");
        sfx.playStep();
    }
  },

  // ADD QUEST implementation
  addQuest: (quest) => {
    const { quests } = get();
    if (quests.find(q => q.id === quest.id)) return;
    set({ quests: [...quests, quest] });
    get().addLog(`New Quest Started: ${quest.title}`, "narrative");
  },

  movePlayerOverworld: async (q, r) => {
    const state = get();
    if (state.isPlayerMoving || state.party.length === 0) return;
    
    const leader = state.party[0];
    const moveType = leader.stats.movementType || MovementType.WALK;
    
    const path = findPath({q: state.playerPos.x, r: state.playerPos.y}, {q, r}, undefined, (qx, rx) => WorldGenerator.getTile(qx, rx, state.dimension), moveType);
    if (!path) return;

    set({ isPlayerMoving: true });
    
    let currentFatigue = state.fatigue;
    let currentSupplies = state.supplies;
    let currentTime = state.worldTime;

    for (const step of path) {
        if (get().gameState !== GameState.OVERWORLD) break;

        const tile = WorldGenerator.getTile(step.q, step.r, state.dimension);
        const cost = TERRAIN_MOVEMENT_COST[moveType][tile.terrain] || 1;
        
        currentFatigue += (cost * 0.15);
        if (Math.random() > 0.7) currentSupplies = Math.max(0, currentSupplies - 1);
        currentTime = (currentTime + (cost * 15)) % 1440;

        const isNight = currentTime < 360 || currentTime > 1260;
        if (isNight && tile.hasEncounter && Math.random() > 0.8) {
            get().addLog("Ambushed in the dead of night!", "combat");
            get().startBattle(tile.terrain, tile.weather);
            break;
        }

        if (tile.poiType === 'VILLAGE' || tile.poiType === 'CASTLE') {
            const townKey = `${step.q},${step.r}`;
            if (!state.visitedTowns.has(townKey)) {
                set(s => ({ visitedTowns: new Set(s.visitedTowns).add(townKey) }));
                get().addLog(`New settlement discovered: ${tile.regionName}`, "narrative");
            }
        }

        const vision = calculateVisionRange(leader.stats.attributes.WIS, leader.stats.corruption || 0);
        let expGain = 0;
        const newExplored = new Set(get().exploredTiles[get().dimension]);
        for(let dq = -vision; dq <= vision; dq++) {
            for(let dr = -vision; dr <= vision; dr++) {
                const dist = (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
                if (dist <= vision) {
                    const key = `${step.q + dq},${step.r + dr}`;
                    if (!newExplored.has(key)) { newExplored.add(key); expGain += 2; }
                }
            }
        }
        if (expGain > 0) get().addPartyXp(expGain);

        set({ 
            playerPos: { x: step.q, y: step.r },
            exploredTiles: { ...get().exploredTiles, [get().dimension]: newExplored },
            fatigue: Math.min(100, currentFatigue),
            supplies: currentSupplies,
            worldTime: currentTime,
            standingOnSettlement: tile.poiType === 'VILLAGE' || tile.poiType === 'CASTLE',
            standingOnPort: tile.poiType === 'PORT',
            standingOnPortal: tile.hasPortal || false,
            standingOnTemple: tile.poiType === 'TEMPLE',
            standingOnDungeon: tile.poiType === 'DUNGEON',
            currentRegionName: tile.regionName
        });

        sfx.playStep();
        await new Promise(res => setTimeout(res, 100));
    }
    
    if (currentSupplies <= 0) {
        get().addLog("Running low on supplies! The party is starving.", "info");
    }

    set({ isPlayerMoving: false });
  },

  camp: async () => {
    if (get().supplies < 5) { get().addLog("Not enough supplies to camp properly.", "info"); return; }
    set({ isSleeping: true, supplies: get().supplies - 5 });
    await new Promise(r => setTimeout(r, 1500));
    set({ fatigue: 0, worldTime: (get().worldTime + 480) % 1440, isSleeping: false });
    get().addLog("The party feels refreshed.", "narrative");
  },

  usePortal: () => set(s => ({ dimension: s.dimension === Dimension.NORMAL ? Dimension.UPSIDE_DOWN : Dimension.NORMAL })),
  enterSettlement: () => set({ gameState: GameState.TOWN_EXPLORATION }),
  exitSettlement: () => set({ gameState: GameState.OVERWORLD }),
  
  resolveNarrativeOption: (idx) => {
    const event = get().activeNarrativeEvent;
    if (!event) return;
    sfx.playUiClick();
    set({ activeNarrativeEvent: null });
    get().addLog(`You chose: ${event.options[idx].label}`, "narrative");
  }
});
