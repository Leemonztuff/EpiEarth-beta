
// @ts-nocheck
import { StateCreator } from 'zustand';
import { GameState, Dimension, Difficulty, HexCell, PositionComponent, WeatherType, TerrainType, MovementType, Quest, Incursion, NPCEntity } from '../../types';
import { WorldGenerator } from '../../services/WorldGenerator';
import { findPath } from '../../services/pathfinding';
import { calculateVisionRange } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { getSupabase } from '../../services/supabaseClient';
import { TERRAIN_MOVEMENT_COST, ITEMS, WESNOTH_BASE_URL } from '../../constants';
import { useContentStore } from '../contentStore';

const generateId = () => Math.random().toString(36).substr(2, 9);

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
  quests: Record<string, Quest>;
  currentRegionName: string | null;
  currentSettlementName: string | null;
  standingOnPortal: boolean;
  standingOnSettlement: boolean;
  standingOnTemple: boolean;
  standingOnDungeon: boolean;
  standingOnPort: boolean;
  incursions: Record<string, Incursion>;
  activeIncursion: Incursion | null;
  eternumShards: number;
  gracePeriodEndTime: number;
  activeNarrativeEvent: any | null;
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
  talkToNPC: () => void;
  updateQuestProgress: (type: string, targetId: string, amount: number) => void;
  spawnIncursion: () => void;
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
  quests: {},
  currentRegionName: null,
  currentSettlementName: null,
  standingOnPortal: false,
  standingOnSettlement: false,
  standingOnTemple: false,
  standingOnDungeon: false,
  standingOnPort: false,
  incursions: {},
  activeIncursion: null,
  eternumShards: 0,
  gracePeriodEndTime: 0,
  activeNarrativeEvent: null,
  userSession: null,

  setUserSession: (session) => set({ userSession: session }),

  spawnIncursion: () => {
      const { playerPos, incursions, dimension } = get();
      if (dimension === Dimension.UPSIDE_DOWN) return; 
      
      const id = generateId();
      const q = playerPos.x + Math.floor((Math.random() - 0.5) * 12);
      const r = playerPos.y + Math.floor((Math.random() - 0.5) * 12);
      
      const newIncursion: Incursion = {
          id, q, r,
          difficulty: 1,
          rewardShards: 0, 
          description: "A spatial tear to the shadow realm."
      };
      
      set({ incursions: { ...incursions, [`${q},${r}`]: newIncursion } });
      get().addLog("A Rift has appeared! The fabric of reality is thin.", "narrative");
  },

  logout: async () => {
      const supabase = getSupabase();
      if (supabase) await supabase.auth.signOut();
      set({ userSession: null });
      sfx.playUiClick();
      get().addLog("Logged out.", "info");
  },

  initializeWorld: () => { WorldGenerator.init(12345); },

  talkToNPC: () => {
      const { playerPos, gameState, townMapData } = get();
      const content = useContentStore.getState();
      
      let tile;
      if (gameState === GameState.TOWN_EXPLORATION && townMapData) {
          tile = townMapData.find(c => c.q === playerPos.x && c.r === playerPos.y);
      }
      
      if (tile && tile.npcs && tile.npcs.length > 0) {
          const baseNpc = tile.npcs[0];
          const storedNpc = content.npcs[baseNpc.id];
          const npc = storedNpc || baseNpc;

          // Branching dialogue support
          if (npc.dialogueNodes && npc.startNodeId) {
            set({ 
              gameState: GameState.DIALOGUE, 
              activeNarrativeEvent: { npc, currentNodeId: npc.startNodeId }
            });
          } else {
            // Legacy/Fallback Logic
            const options = [];
            if (npc.questId && !get().quests[npc.questId]) {
                options.push({
                    label: "Accept Quest",
                    action: () => {
                        get().addQuest({
                            id: npc.questId,
                            title: "Shadow Culling",
                            description: "The Elder needs the surrounding areas cleansed of hostile spirits.",
                            completed: false,
                            type: 'BOUNTY',
                            objective: { type: 'KILL', targetId: 'ANY', count: 3, current: 0 },
                            reward: { xp: 500, gold: 100 }
                        });
                    }
                });
            }
            options.push({ label: "Continue", action: () => {} });
            set({ 
                gameState: GameState.DIALOGUE, 
                activeNarrativeEvent: { npc, options }
            });
          }
          sfx.playUiClick();
      }
  },

  updateQuestProgress: (type, targetId, amount) => {
      const { quests } = get();
      const updated = { ...quests };
      let changed = false;
      Object.values(updated).forEach(q => {
          if (!q.completed && q.objective.type === type && (q.objective.targetId === targetId || q.objective.targetId === 'ANY')) {
              q.objective.current = Math.min(q.objective.count, q.objective.current + amount);
              if (q.objective.current >= q.objective.count) {
                  q.completed = true;
                  get().addLog(`Quest Complete: ${q.title}`, "levelup");
                  get().addGold(q.reward.gold);
                  get().addPartyXp(q.reward.xp);
              }
              changed = true;
          }
      });
      if (changed) set({ quests: updated });
  },

  addQuest: (quest) => {
    const { quests } = get();
    if (quests[quest.id]) return;
    set({ quests: { ...quests, [quest.id]: quest } });
    get().addLog(`New Quest: ${quest.title}`, "narrative");
  },

  movePlayerOverworld: async (q, r) => {
    const state = get();
    if (state.isPlayerMoving || state.party.length === 0) return;
    
    const isTown = state.gameState === GameState.TOWN_EXPLORATION;
    const leader = state.party[0];
    const moveType = leader.stats.movementType || MovementType.WALK;
    
    const path = findPath(
        {q: state.playerPos.x, r: state.playerPos.y}, 
        {q, r}, 
        isTown ? state.townMapData : undefined, 
        isTown ? undefined : (qx, rx) => WorldGenerator.getTile(qx, rx, state.dimension), 
        moveType
    );
    if (!path) return;

    set({ isPlayerMoving: true });
    
    let currentFatigue = state.fatigue;
    let currentSupplies = state.supplies;
    let currentTime = state.worldTime;

    for (const step of path) {
        if (get().gameState !== GameState.OVERWORLD && get().gameState !== GameState.TOWN_EXPLORATION) break;

        let tile;
        if (isTown) tile = state.townMapData.find(c => c.q === step.q && c.r === step.r);
        else tile = WorldGenerator.getTile(step.q, step.r, state.dimension);

        const cost = TERRAIN_MOVEMENT_COST[moveType][tile.terrain] || 1;
        const fatigueMult = isTown ? 0.2 : (state.dimension === Dimension.UPSIDE_DOWN ? 2.5 : 1.0);
        currentFatigue += (cost * 0.15 * fatigueMult);
        
        if (!isTown && Math.random() > 0.7) currentSupplies = Math.max(0, currentSupplies - 1);
        currentTime = (currentTime + (cost * 15)) % 1440;

        if (!isTown && state.dimension === Dimension.NORMAL && Math.random() > 0.985) get().spawnIncursion();

        if (!isTown) {
            const vision = calculateVisionRange(leader.stats.attributes.WIS, leader.stats.corruption || 0);
            const newExplored = new Set(get().exploredTiles[get().dimension]);
            for(let dq = -vision; dq <= vision; dq++) {
                for(let dr = -vision; dr <= vision; dr++) {
                    const dist = (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
                    if (dist <= vision) newExplored.add(`${step.q + dq},${step.r + dr}`);
                }
            }
            set({ exploredTiles: { ...get().exploredTiles, [get().dimension]: newExplored } });
        }

        const incursionKey = `${step.q},${step.r}`;
        const activeInc = state.incursions[incursionKey];

        const isPOI = (tile.poiType === 'VILLAGE' || tile.poiType === 'TOWN' || tile.poiType === 'CITY');

        set({ 
            playerPos: { x: step.q, y: step.r },
            fatigue: Math.min(100, currentFatigue),
            supplies: currentSupplies,
            worldTime: currentTime,
            standingOnSettlement: !isTown && isPOI,
            standingOnPort: tile.poiType === 'PORT',
            standingOnPortal: !isTown && (tile.hasPortal || !!activeInc),
            standingOnTemple: tile.poiType === 'TEMPLE',
            standingOnDungeon: tile.poiType === 'DUNGEON',
            currentRegionName: isTown ? state.currentRegionName : tile.regionName
        });

        if (isTown && tile.poiType === 'EXIT') {
            set({ isPlayerMoving: false });
            get().exitSettlement();
            return;
        }

        if (!isTown && activeInc) {
            set({ isPlayerMoving: false, dimension: Dimension.UPSIDE_DOWN, incursions: Object.fromEntries(Object.entries(state.incursions).filter(([k]) => k !== incursionKey)) });
            get().addLog("The Rift consumes you!", "narrative");
            sfx.playMagic();
            return;
        }

        sfx.playStep();
        await new Promise(res => setTimeout(res, 100));
    }
    set({ isPlayerMoving: false });
  },

  enterSettlement: () => {
    const { playerPos, dimension } = get();
    const tile = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
    if (!tile.poiType || tile.poiType === 'DUNGEON' || tile.poiType === 'TEMPLE') return;
    
    const interiorMap = WorldGenerator.generateSettlementMap(playerPos.x, playerPos.y, tile.poiType as any);
    set({ 
        gameState: GameState.TOWN_EXPLORATION,
        townMapData: interiorMap,
        lastOverworldPos: { ...playerPos },
        playerPos: { x: 0, y: 0 },
        currentSettlementName: tile.regionName,
        standingOnSettlement: false
    });
    get().addLog(`Entering ${tile.regionName}...`, "narrative");
  },

  exitSettlement: () => {
    const { lastOverworldPos } = get();
    set({ gameState: GameState.OVERWORLD, playerPos: lastOverworldPos || { x: 0, y: 0 }, townMapData: null, currentSettlementName: null });
  },

  camp: async () => {
    if (get().supplies < 5) return;
    set({ isSleeping: true, supplies: get().supplies - 5 });
    await new Promise(r => setTimeout(r, 1500));
    set({ fatigue: 0, worldTime: (get().worldTime + 480) % 1440, isSleeping: false });
    get().addLog("The party feels refreshed.", "narrative");
  },

  usePortal: () => set(s => ({ dimension: s.dimension === Dimension.NORMAL ? Dimension.UPSIDE_DOWN : Dimension.NORMAL })),
  buySupplies: (amount, cost) => { if (get().spendGold(cost)) set(s => ({ supplies: s.supplies + amount })); },
  resolveNarrativeOption: (idx) => { 
      const { activeNarrativeEvent } = get();
      if (activeNarrativeEvent && activeNarrativeEvent.options && activeNarrativeEvent.options[idx]) {
          const opt = activeNarrativeEvent.options[idx];
          if (opt.action) opt.action();
      }
      set({ activeNarrativeEvent: null }); 
  }
});
