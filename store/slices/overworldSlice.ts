
import { StateCreator } from 'zustand';
import { GameState, Dimension, Difficulty, HexCell, PositionComponent, MovementType, Quest, Incursion, OverworldEnemy } from '../../types';
import { WorldGenerator } from '../../services/WorldGenerator';
import { findPath } from '../../services/pathfinding';
import { sfx } from '../../services/SoundSystem';
import { useGameStore } from '../gameStore';
import { generateId } from '../utils';

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
  enemies: OverworldEnemy[];  // active enemies on map
  lastOverworldPos: PositionComponent | null;
  fatigue: number;
  changeFatigue: (delta: number) => void;
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
  spawnEnemy: (enemy: OverworldEnemy) => void;
  clearEnemy: (id: string) => void;
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
  syncOverworldEnemies: () => void;
}

export const createOverworldSlice: StateCreator<any, [], [], OverworldSlice> = (set, get) => {

  // enemy templates reused from exploration slice
  const OVERWORLD_ENEMY_TEMPLATES = [
      { name: 'Goblin', sprite: '/sprites/characters/goblin_01.png' },
      { name: 'Slime', sprite: '/sprites/characters/slime_01.png' },
      { name: 'Skeleton', sprite: '/sprites/characters/skeleton_01.png' },
      { name: 'Orco', sprite: '/sprites/characters/orc_01.png' },
      { name: 'Wolf', sprite: '/sprites/characters/werewolf_01.png' }
  ];

  const getEncounterEnemyId = (dimension: Dimension, q: number, r: number) => `encounter:${dimension}:${q},${r}`;

  const pickEnemySpriteForTile = (dimension: Dimension, q: number, r: number) => {
      const hashSource = `${dimension}:${q},${r}`;
      let hash = 0;
      for (let i = 0; i < hashSource.length; i++) {
          hash = (hash * 31 + hashSource.charCodeAt(i)) >>> 0;
      }
      const tpl = OVERWORLD_ENEMY_TEMPLATES[hash % OVERWORLD_ENEMY_TEMPLATES.length];
      return tpl.sprite;
  };

  const buildVisibleEncounterEnemies = (): OverworldEnemy[] => {
      const state = get();
      const exploredKeys = (state.exploredTiles[state.dimension] ?? new Set<string>()) as Set<string>;

      return Array.from(exploredKeys).flatMap((key: string) => {
          if (state.clearedEncounters.has(key)) {
              return [];
          }

          const [q, r] = key.split(',').map(Number);
          const tile = WorldGenerator.getTile(q, r, state.dimension);

          if (!tile?.hasEncounter) {
              return [];
          }

          return [{
              id: getEncounterEnemyId(state.dimension, q, r),
              q,
              r,
              spriteUrl: pickEnemySpriteForTile(state.dimension, q, r),
          }];
      });
  };

  return ({
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
  enemies: [],

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

  initializeWorld: () => {
      WorldGenerator.init(12345);
      get().syncOverworldEnemies();
  },
  changeFatigue: (delta) => set(state => ({ fatigue: Math.max(0, state.fatigue + delta) })),
  spawnEnemy: (enemy) => set(state => ({ enemies: [...state.enemies, enemy] })),
  clearEnemy: (id) => set(state => ({ enemies: state.enemies.filter(e => e.id !== id) })),
  syncOverworldEnemies: () => {
      set({ enemies: buildVisibleEncounterEnemies() });
  },

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
      const { playerPos } = get();
      const key = `${playerPos.x},${playerPos.y}`;
      set(state => ({
          clearedEncounters: new Set([...state.clearedEncounters, key])
      }));
      get().syncOverworldEnemies();
  },

  checkTileTriggers: (q, r) => {
    const { dimension, gameState, townMapData } = get();
    const isLocal = gameState === GameState.TOWN_EXPLORATION || gameState === GameState.DUNGEON;
    let tile;
    if (isLocal && townMapData) tile = townMapData.find(c => c.q === q && c.r === r);
    else tile = WorldGenerator.getTile(q, r, dimension);

    if (!tile) return false;

    // EVENTO DE COMBATE (CALAVERAS) - Entrar a Zona de Caza 3D
    if (!isLocal && tile.hasEncounter) {
        const { initZone } = useGameStore.getState();
        initZone('forest', { x: q, y: r });
        set({ isPlayerMoving: false });
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
    
    // BUG FIX: Verificar que party no esté vacío
    const leader = state.party[0];
    if (!leader) return;
    
    const path = findPath(
        {q: state.playerPos.x, r: state.playerPos.y}, 
        {q, r}, 
        isLocal ? state.townMapData : undefined, 
        isLocal ? undefined : (qx, rx) => WorldGenerator.getTile(qx, rx, state.dimension), 
        leader.stats.movementType || MovementType.WALK
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
            get().syncOverworldEnemies();
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

  hireCarriage: (targetQ, targetR) => {
    const state = get();
    const nextExplored = new Set(state.exploredTiles[state.dimension] ?? []);
    nextExplored.add(`${targetQ},${targetR}`);

    set({
      playerPos: { x: targetQ, y: targetR },
      worldTime: (state.worldTime + 120) % 1440,
      fatigue: Math.max(0, state.fatigue - 5),
      exploredTiles: { ...state.exploredTiles, [state.dimension]: nextExplored },
      currentRegionName: WorldGenerator.getTile(targetQ, targetR, state.dimension).regionName,
    });

    get().syncOverworldEnemies();
    get().checkTileTriggers(targetQ, targetR);
    get().addLog("El carruaje te acerca al destino.", "info");
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
    get().syncOverworldEnemies();
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
      get().syncOverworldEnemies();
      get().addLog("Las fibras de la realidad se retuercen... Has cruzado.", "narrative");
  },
  buySupplies: (amount, cost) => { if (get().spendGold(cost)) set(s => ({ supplies: s.supplies + amount })); },
  resolveNarrativeOption: (idx) => { set({ activeNarrativeEvent: null }); },
  addQuest: (quest) => set(s => ({ quests: { ...s.quests, [quest.id]: quest } })),
  updateQuestProgress: (type, targetId, amount) => {
      const quests: Record<string, Quest> = { ...get().quests };
      Object.values(quests).forEach((q: Quest) => {
          if (!q.completed && q.objective.type === type && q.objective.targetId === targetId) {
              q.objective.current += amount;
              if (q.objective.current >= q.objective.count) q.completed = true;
          }
      });
      set({ quests });
  }
});
};
