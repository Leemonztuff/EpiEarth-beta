
// @ts-nocheck
import { StateCreator } from 'zustand';
import { GameState, Dimension, Difficulty, HexCell, PositionComponent, WeatherType, TerrainType, MovementType, Quest, Incursion, NPCEntity } from '../../types';
import { WorldGenerator } from '../../services/WorldGenerator';
import { findPath } from '../../services/pathfinding';
import { calculateVisionRange } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { GeminiService } from '../../services/GeminiService';
import { TERRAIN_MOVEMENT_COST, ITEMS } from '../../constants';

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface OverworldSlice {
  gameState: GameState;
  dimension: Dimension;
  difficulty: Difficulty;
  exploredTiles: Record<Dimension, Set<string>>;
  visitedTowns: Set<string>; 
  clearedEncounters: Set<string>;
  clearedLocations: Set<string>;
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
  isAmbushed: boolean;
  
  initializeWorld: () => void;
  movePlayerOverworld: (q: number, r: number) => Promise<void>;
  hireCarriage: (targetQ: number, targetR: number) => void;
  buySupplies: (amount: number, cost: number) => void;
  camp: () => Promise<void>;
  usePortal: () => void;
  enterSettlement: () => void;
  enterDungeon: () => void;
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
  clearedLocations: new Set(),
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
  isAmbushed: false,

  setUserSession: (session) => set({ userSession: session }),

  spawnIncursion: () => {
      const { playerPos, incursions, dimension } = get();
      if (dimension === Dimension.UPSIDE_DOWN) return; 
      const id = generateId();
      const q = playerPos.x + Math.floor((Math.random() - 0.5) * 12);
      const r = playerPos.y + Math.floor((Math.random() - 0.5) * 12);
      set({ incursions: { ...incursions, [`${q},${r}`]: { id, q, r, difficulty: 1, rewardShards: 0, description: "A rift in reality." } } });
      get().addLog("A Rift has appeared nearby!", "narrative");
  },

  logout: async () => {
      const supabase = getSupabase();
      if (supabase) await supabase.auth.signOut();
      set({ userSession: null });
      sfx.playUiClick();
  },

  initializeWorld: () => { WorldGenerator.init(12345); },

  talkToNPC: () => {
      const { playerPos, gameState, townMapData } = get();
      let tile;
      if ((gameState === GameState.TOWN_EXPLORATION || gameState === GameState.DUNGEON) && townMapData) {
          tile = townMapData.find(c => c.q === playerPos.x && c.r === playerPos.y);
      }
      
      if (tile && tile.npcs && tile.npcs.length > 0) {
          const npc = tile.npcs[0];
          set({ 
              gameState: GameState.DIALOGUE, 
              activeNarrativeEvent: { npc, currentNodeId: npc.startNodeId || 'start' }
          });
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
                  get().addLog(`QUEST COMPLETE: ${q.title}`, "levelup");
                  get().addGold(q.reward.gold);
                  get().addPartyXp(q.reward.xp);
                  if (q.reward.items) q.reward.items.forEach(it => get().addItem(it));
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
    
    const isLocal = state.gameState === GameState.TOWN_EXPLORATION || state.gameState === GameState.DUNGEON;
    const leader = state.party[0];
    const moveType = leader.stats.movementType || MovementType.WALK;
    const isVoid = state.dimension === Dimension.UPSIDE_DOWN;
    
    const path = findPath(
        {q: state.playerPos.x, r: state.playerPos.y}, 
        {q, r}, 
        isLocal ? state.townMapData : undefined, 
        isLocal ? undefined : (qx, rx) => WorldGenerator.getTile(qx, rx, state.dimension), 
        moveType
    );
    if (!path) return;

    set({ isPlayerMoving: true, isAmbushed: false });
    
    let currentFatigue = state.fatigue;
    let currentSupplies = state.supplies;
    let currentTime = state.worldTime;

    for (const step of path) {
        if (get().gameState !== GameState.OVERWORLD && get().gameState !== GameState.TOWN_EXPLORATION && get().gameState !== GameState.DUNGEON) break;

        let tile;
        if (isLocal) tile = state.townMapData.find(c => c.q === step.q && c.r === step.r);
        else tile = WorldGenerator.getTile(step.q, step.r, state.dimension);

        const hours = Math.floor(currentTime / 60);
        const isNight = hours < 6 || hours >= 22;

        const cost = TERRAIN_MOVEMENT_COST[moveType][tile.terrain] || 1;
        
        const fatigueMult = (isNight ? 2.0 : 1.0) * (isVoid ? 1.5 : 1.0);
        currentFatigue += (cost * 0.15 * fatigueMult);
        
        const supplyChance = isVoid ? 0.7 : 0.85;
        if (!isLocal && Math.random() > supplyChance) currentSupplies = Math.max(0, currentSupplies - 1);
        
        currentTime = (currentTime + (cost * 15)) % 1440;

        if (!isLocal) {
            const vision = calculateVisionRange(leader.stats.attributes.WIS, leader.stats.corruption || 0, currentTime, state.dimension);
            const newExplored = new Set(get().exploredTiles[get().dimension]);
            for(let dq = -vision; dq <= vision; dq++) {
                for(let dr = -vision; dr <= vision; dr++) {
                    const dist = (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
                    if (dist <= vision) newExplored.add(`${step.q + dq},${step.r + dr}`);
                }
            }
            set({ exploredTiles: { ...get().exploredTiles, [get().dimension]: newExplored } });
        }

        set({ 
            playerPos: { x: step.q, y: step.r },
            fatigue: Math.min(100, currentFatigue),
            supplies: currentSupplies,
            worldTime: currentTime,
            standingOnSettlement: !isLocal && (tile.poiType === 'VILLAGE' || tile.poiType === 'TOWN' || tile.poiType === 'CITY' || tile.poiType === 'CASTLE'),
            standingOnDungeon: !isLocal && (tile.poiType === 'DUNGEON' || tile.poiType === 'RUINS'),
            standingOnPortal: !isLocal && tile.hasPortal,
            standingOnTemple: !isLocal && tile.poiType === 'TEMPLE',
            currentRegionName: isLocal ? state.currentRegionName : tile.regionName
        });

        // ENCUENTROS: Probabilidad aumentada
        if (!isLocal && (tile.hasEncounter || isVoid)) {
            let baseChance = isNight ? 0.12 : 0.05; 
            if (isVoid) baseChance = 0.25; 

            if (Math.random() < baseChance) {
                 set({ isPlayerMoving: false });
                 const isAmbush = (isNight || isVoid) ? (Math.random() > 0.4) : (Math.random() > 0.8);
                 
                 if (isAmbush) {
                     set({ isAmbushed: true });
                     const ambushText = await GeminiService.generateAmbushFlavor(tile.terrain, isNight || isVoid);
                     get().addLog(`PELIGRO: ${ambushText}`, "combat");
                 }
                 
                 get().startBattle(tile.terrain, tile.weather);
                 return;
            }
        }

        if (isLocal && tile.poiType === 'EXIT') {
            set({ isPlayerMoving: false });
            get().exitSettlement();
            return;
        }

        sfx.playStep();
        await new Promise(res => setTimeout(res, 120));
    }
    set({ isPlayerMoving: false });
  },

  enterSettlement: () => {
    const { playerPos, dimension } = get();
    const tile = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
    if (!tile.poiType || tile.poiType === 'DUNGEON' || tile.poiType === 'RUINS' || tile.poiType === 'TEMPLE') return;
    
    const interiorMap = WorldGenerator.generateSettlementMap(playerPos.x, playerPos.y, tile.poiType as any);
    set({ 
        gameState: GameState.TOWN_EXPLORATION,
        townMapData: interiorMap,
        lastOverworldPos: { ...playerPos },
        playerPos: { x: 0, y: 0 },
        currentSettlementName: tile.regionName,
        standingOnSettlement: false
    });
    get().addLog(`Entrando en ${tile.regionName}...`, "narrative");
  },

  enterDungeon: () => {
    const { playerPos, dimension } = get();
    const tile = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
    if (tile.poiType !== 'DUNGEON' && tile.poiType !== 'RUINS') return;
    
    const dungeonMap = WorldGenerator.generateDungeon(tile.poiType === 'RUINS' ? 4 : 8);
    set({ 
        gameState: GameState.DUNGEON,
        townMapData: dungeonMap,
        lastOverworldPos: { ...playerPos },
        playerPos: { x: 0, y: 0 },
        currentSettlementName: tile.regionName || "Cripta Antigua",
        standingOnDungeon: false
    });
    get().addLog(`Descendiendo a las profundidades de ${tile.regionName}...`, "narrative");
  },

  exitSettlement: () => {
    const { lastOverworldPos } = get();
    set({ 
        gameState: GameState.OVERWORLD, 
        playerPos: lastOverworldPos || { x: 0, y: 0 }, 
        townMapData: null, 
        currentSettlementName: null,
        standingOnSettlement: false,
        standingOnDungeon: false,
        standingOnTemple: false
    });
  },

  camp: async () => {
    if (get().supplies < 5) {
        get().addLog("No tienes suficientes suministros para acampar.", "info");
        return;
    }
    set({ isSleeping: true, supplies: get().supplies - 5 });
    await new Promise(r => setTimeout(r, 1500));
    set({ fatigue: 0, worldTime: (get().worldTime + 480) % 1440, isSleeping: false });
    get().addLog("El grupo descansa bajo las estrellas de Aethelgard.", "narrative");
    get().party.forEach(p => p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + Math.floor(p.stats.maxHp * 0.4)));
  },

  usePortal: () => {
      sfx.playMagic();
      set(s => ({ dimension: s.dimension === Dimension.NORMAL ? Dimension.UPSIDE_DOWN : Dimension.NORMAL }));
  },
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
