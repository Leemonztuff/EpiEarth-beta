
// @ts-nocheck
import { StateCreator } from 'zustand';
import { GameState, Dimension, Difficulty, HexCell, PositionComponent, WeatherType, TerrainType, MovementType, Quest, Incursion, NPCEntity } from '../../types';
import { WorldGenerator } from '../../services/WorldGenerator';
import { findPath } from '../../services/pathfinding';
import { calculateVisionRange } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
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
  clearCurrentEncounter: () => void;
  checkTileTriggers: (q: number, r: number) => boolean;
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
      set({ incursions: { ...incursions, [`${q},${r}`]: { id, q, r, difficulty: 1, rewardShards: 0, description: "Grieta en la realidad." } } });
      get().addLog("¡Incursión detectada!", "narrative");
  },

  logout: async () => { set({ userSession: null }); sfx.playUiClick(); },

  initializeWorld: () => { WorldGenerator.init(12345); },

  talkToNPC: () => {
      const { playerPos, gameState, townMapData } = get();
      let tile;
      if ((gameState === GameState.TOWN_EXPLORATION || gameState === GameState.DUNGEON) && townMapData) {
          tile = townMapData.find(c => c.q === playerPos.x && c.r === playerPos.y);
      }
      if (tile && tile.npcs && tile.npcs.length > 0) {
          const npc = tile.npcs[0];
          set({ gameState: GameState.DIALOGUE, activeNarrativeEvent: { npc, currentNodeId: npc.startNodeId || 'start' } });
          sfx.playUiClick();
      }
  },

  clearCurrentEncounter: () => {
      const { playerPos, dimension } = get();
      const tile = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
      if (tile) tile.hasEncounter = false;
  },

  checkTileTriggers: (q, r) => {
    const { dimension, gameState, townMapData } = get();
    const isLocal = gameState === GameState.TOWN_EXPLORATION || gameState === GameState.DUNGEON;
    let tile;
    if (isLocal && townMapData) tile = townMapData.find(c => c.q === q && c.r === r);
    else tile = WorldGenerator.getTile(q, r, dimension);

    if (!tile) return false;

    // EVENTO DE COMBATE (CALAVERAS)
    if (!isLocal && tile.hasEncounter) {
        set({ isPlayerMoving: false, isAmbushed: Math.random() > 0.75 });
        get().startBattle(tile.terrain, tile.weather);
        return true; 
    }

    // SALIDA DE LOCALIDADES
    if (isLocal && tile.poiType === 'EXIT') {
        set({ isPlayerMoving: false });
        get().exitSettlement();
        return true;
    }

    // ACTUALIZAR ESTADO DE INTERACCIÓN
    set({ 
        standingOnSettlement: !isLocal && (tile.poiType === 'VILLAGE' || tile.poiType === 'TOWN' || tile.poiType === 'CITY' || tile.poiType === 'CASTLE'),
        standingOnDungeon: !isLocal && (tile.poiType === 'DUNGEON' || tile.poiType === 'RUINS'),
        standingOnPortal: !isLocal && tile.hasPortal,
        standingOnTemple: !isLocal && tile.poiType === 'TEMPLE',
    });
    return false;
  },

  movePlayerOverworld: async (q, r) => {
    const state = get();
    if (state.isPlayerMoving || state.party.length === 0) return;
    
    if (q === state.playerPos.x && r === state.playerPos.y) {
        get().checkTileTriggers(q, r);
        return;
    }

    const isLocal = state.gameState === GameState.TOWN_EXPLORATION || state.gameState === GameState.DUNGEON;
    const path = findPath(
        {q: state.playerPos.x, r: state.playerPos.y}, 
        {q, r}, 
        isLocal ? state.townMapData : undefined, 
        isLocal ? undefined : (qx, rx) => WorldGenerator.getTile(qx, rx, state.dimension), 
        state.party[0].stats.movementType || MovementType.WALK
    );
    
    if (!path || path.length === 0) {
        get().checkTileTriggers(q, r);
        return;
    }

    set({ isPlayerMoving: true });
    
    let currentFatigue = state.fatigue;
    let currentSupplies = state.supplies;
    let currentTime = state.worldTime;

    for (const step of path) {
        const currentState = get();
        if (currentState.gameState !== GameState.OVERWORLD && currentState.gameState !== GameState.TOWN_EXPLORATION && currentState.gameState !== GameState.DUNGEON) break;

        let tile;
        if (isLocal) tile = currentState.townMapData.find(c => c.q === step.q && c.r === step.r);
        else tile = WorldGenerator.getTile(step.q, step.r, currentState.dimension);

        const oldHours = Math.floor(currentTime / 60);
        currentTime = (currentTime + 15) % 1440;
        const newHours = Math.floor(currentTime / 60);

        if (!isLocal && oldHours !== newHours && newHours % 4 === 0) {
            if (currentSupplies > 0) currentSupplies -= 1;
            else {
                currentFatigue = Math.min(100, currentFatigue + 15);
                get().addLog("¡Hambre! Sin raciones, la fatiga se dispara.", "info");
            }
        }

        const fatigueStep = (newHours < 6 || newHours > 21) ? 0.6 : 0.2;
        currentFatigue = Math.min(100, currentFatigue + fatigueStep);

        if (!isLocal) {
            const vision = 4;
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
            fatigue: currentFatigue,
            supplies: currentSupplies,
            worldTime: currentTime,
            currentRegionName: isLocal ? state.currentRegionName : tile.regionName
        });

        const triggered = get().checkTileTriggers(step.q, step.r);
        if (triggered) break;

        sfx.playStep();
        await new Promise(res => setTimeout(res, 110));
    }
    
    const finalState = get();
    if (finalState.gameState === GameState.OVERWORLD) {
        get().checkTileTriggers(finalState.playerPos.x, finalState.playerPos.y);
    }
    
    set({ isPlayerMoving: false });
  },

  enterSettlement: () => {
    const { playerPos, dimension } = get();
    const tile = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
    const interiorMap = WorldGenerator.generateSettlementMap(playerPos.x, playerPos.y, tile.poiType as any);
    set({ 
        gameState: GameState.TOWN_EXPLORATION, townMapData: interiorMap,
        lastOverworldPos: { ...playerPos }, playerPos: { x: 0, y: 0 },
        currentSettlementName: tile.regionName, standingOnSettlement: false
    });
  },

  enterDungeon: () => {
    const { playerPos, dimension } = get();
    const tile = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
    const dungeonMap = WorldGenerator.generateDungeon(10);
    set({ 
        gameState: GameState.DUNGEON, townMapData: dungeonMap,
        lastOverworldPos: { ...playerPos }, playerPos: { x: 0, y: 0 },
        currentSettlementName: tile.regionName || "Cripta Ancestral", standingOnDungeon: false
    });
  },

  exitSettlement: () => {
    const { lastOverworldPos } = get();
    set({ 
        gameState: GameState.OVERWORLD, playerPos: lastOverworldPos || { x: 0, y: 0 }, 
        townMapData: null, currentSettlementName: null, standingOnSettlement: false, standingOnDungeon: false
    });
  },

  camp: async () => {
    const { supplies, fatigue, party, worldTime } = get();
    if (supplies < 5) {
        get().addLog("Necesitas al menos 5 raciones para acampar con seguridad.", "info");
        return;
    }
    
    set({ isSleeping: true, supplies: supplies - 5 });
    get().addLog("La party monta el campamento. El fuego ofrece protección...", "narrative");
    
    await new Promise(r => setTimeout(r, 2200));
    
    const healedParty = party.map(p => ({
        ...p,
        stats: { ...p.stats, hp: Math.min(p.stats.maxHp, p.stats.hp + Math.floor(p.stats.maxHp * 0.6)) }
    }));
    
    set({ 
        fatigue: 0, 
        worldTime: (worldTime + 480) % 1440,
        isSleeping: false,
        party: healedParty
    });
    
    sfx.playVictory();
  },

  usePortal: () => {
      sfx.playMagic();
      set(s => ({ dimension: s.dimension === Dimension.NORMAL ? Dimension.UPSIDE_DOWN : Dimension.NORMAL }));
      get().addLog("Las fibras de la realidad se retuercen... Has cruzado.", "narrative");
  },
  buySupplies: (amount, cost) => { if (get().spendGold(cost)) set(s => ({ supplies: s.supplies + amount })); },
  resolveNarrativeOption: (idx) => { set({ activeNarrativeEvent: null }); },
  addQuest: (quest) => set(s => ({ quests: { ...s.quests, [quest.id]: quest } })),
  updateQuestProgress: (type, targetId, amount) => {
      const quests = { ...get().quests };
      Object.values(quests).forEach(q => {
          if (!q.completed && q.objective.type === type && q.objective.targetId === targetId) {
              q.objective.current += amount;
              if (q.objective.current >= q.objective.count) q.completed = true;
          }
      });
      set({ quests });
  }
});
