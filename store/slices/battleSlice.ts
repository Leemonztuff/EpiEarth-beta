
// @ts-nocheck
import { StateCreator } from 'zustand';
import { 
    GameState, TerrainType, WeatherType, BattleCell, BattleAction, Entity, 
    CombatStatsComponent, PositionComponent, DamagePopup, SpellEffectData, SpellType, 
    CharacterClass, VisualComponent, AIBehavior, LootDrop, ItemRarity, Item, 
    EquipmentSlot, Dimension, InventorySlot, CharacterRace, DamageType, Ability, TileEffectType, Skill, Spell, CreatureType, Difficulty, EffectType
} from '../../types';
import { findBattlePath, getReachableTiles } from '../../services/pathfinding';
import { rollDice, calculateEnemyStats, getAoETiles, calculateAttackRoll } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { TERRAIN_COLORS, ASSETS } from '../../constants';
import { useContentStore } from '../contentStore';
import { ActionResolver, ActionResolution } from '../../services/ActionResolver';

const generateId = () => Math.random().toString(36).substr(2, 9);

const applyResolutionToEntities = (res: ActionResolution, actor: Entity, target: Entity, entities: Entity[]) => {
    return entities.map(e => {
        if (e.id === target.id) {
            let nextHp = e.stats.hp + res.hpChange;
            let finalStats = { ...e.stats };
            finalStats.hp = Math.max(0, Math.min(e.stats.maxHp, nextHp));
            const nextStatus = [...(finalStats.activeStatusEffects || [])];
            if (res.statusChanges) {
                res.statusChanges.forEach(sc => {
                    const existing = nextStatus.find(s => s.type === sc.type);
                    if (existing) existing.duration = Math.max(existing.duration, sc.duration);
                    else nextStatus.push({ type: sc.type, duration: sc.duration, intensity: 1 });
                });
            }
            finalStats.activeStatusEffects = nextStatus;
            return { ...e, stats: finalStats };
        }
        return e;
    });
};

export interface BattleSlice {
  battleEntities: Entity[];
  turnOrder: string[];
  currentTurnIndex: number;
  battleMap: BattleCell[];
  battleTerrain: TerrainType;
  battleWeather: WeatherType;
  battleRewards: { xp: number; gold: number; items: Item[]; shards?: number } | null;
  selectedAction: BattleAction | null;
  selectedSpell: Spell | null;
  selectedSkill: Skill | null;
  isActionAnimating: boolean;
  activeSpellEffect: SpellEffectData | null;
  lootDrops: LootDrop[];
  damagePopups: DamagePopup[];
  isUnitMenuOpen: boolean;
  remainingActions: number;
  hasMoved: boolean;
  hasActed: boolean;
  selectedTile: { x: number; z: number } | null;
  validMoves: { x: number; y: number }[];
  validTargets: { x: number; y: number }[];
  inspectedEntityId: string | null;

  startBattle: (terrain: TerrainType, weather: WeatherType, enemyId?: string) => void;
  confirmBattle: () => void;
  handleTileInteraction: (x: number, z: number) => void;
  handleTileHover: (x: number, z: number) => void;
  selectAction: (action: BattleAction) => void;
  executeAction: (actor: Entity, targets: Entity[], ability?: Spell | Skill) => Promise<void>;
  advanceTurn: () => Promise<void>;
  performEnemyTurn: () => Promise<void>;
  executeWait: () => void;
  continueAfterVictory: () => void;
  restartBattle: () => void;
  inspectUnit: (id: string) => void;
  closeInspection: () => void;
  setUnitMenuOpen: (open: boolean) => void;
  removeDamagePopup: (id: string) => void;
  spawnLootDrop: (entity: Entity) => void;
}

export const createBattleSlice: StateCreator<any, [], [], BattleSlice> = (set, get) => ({
  battleEntities: [],
  turnOrder: [],
  currentTurnIndex: 0,
  battleMap: [],
  battleTerrain: TerrainType.GRASS,
  battleWeather: WeatherType.NONE,
  battleRewards: null,
  selectedAction: null,
  selectedSpell: null,
  selectedSkill: null,
  isActionAnimating: false,
  activeSpellEffect: null,
  lootDrops: [],
  damagePopups: [],
  isUnitMenuOpen: false,
  remainingActions: 1,
  hasMoved: false,
  hasActed: false,
  selectedTile: null,
  validMoves: [],
  validTargets: [],
  inspectedEntityId: null,

  startBattle: (terrain, weather, enemyId) => {
      const contentState = useContentStore.getState();
      const terrainTexture = ASSETS.TERRAIN[terrain] || ASSETS.TERRAIN[TerrainType.GRASS];

      const grid: BattleCell[] = [];
      for(let x=0; x<16; x++) {
          for(let z=0; z<16; z++) {
              grid.push({ 
                  x, z, 
                  height: 1, 
                  offsetY: 0, 
                  color: TERRAIN_COLORS[terrain] || '#444', 
                  textureUrl: terrainTexture, 
                  isObstacle: false, 
                  blocksSight: false, 
                  movementCost: 1 
              });
          }
      }

      const partyEntities = get().party.map((p, i) => ({ 
          ...p, 
          position: { x: 4 + (i % 2), y: 6 + Math.floor(i / 2) } 
      }));

      const encounterList = contentState.encounters[terrain] || ['skeleton'];
      const enemyCount = enemyId ? 1 : Math.min(4, Math.floor(partyEntities.length * 1.2));
      const enemies = [];

      for(let i=0; i < enemyCount; i++) {
          const defId = enemyId || encounterList[Math.floor(Math.random() * encounterList.length)];
          const def = contentState.enemies[defId] || { name: 'Skeleton', sprite: 'units/undead-skeletal/skeleton.png', hp: 15, ac: 12, damage: '1d6', initiativeBonus: 1 };
          enemies.push({ 
              id: `enemy_${i}_${generateId()}`, 
              defId, 
              name: def.name, 
              type: 'ENEMY', 
              stats: calculateEnemyStats(def, partyEntities[0].stats.level, get().difficulty || Difficulty.NORMAL), 
              visual: { color: '#ef4444', modelType: 'billboard', spriteUrl: def.sprite }, 
              position: { x: 11 - (i % 2), y: 6 + Math.floor(i / 2) }, 
              aiBehavior: def.aiBehavior || AIBehavior.BASIC_MELEE 
          });
      }
      
      const entities = [...partyEntities, ...enemies];
      const turnOrder = entities
        .map(e => ({ id: e.id, roll: (e.stats?.initiativeBonus || 0) + rollDice(20) }))
        .sort((a, b) => b.roll - a.roll)
        .map(x => x.id);

      set({ 
        battleEntities: entities, 
        battleMap: grid, 
        turnOrder, 
        currentTurnIndex: 0, 
        battleTerrain: terrain, 
        battleWeather: weather,
        gameState: GameState.BATTLE_INIT, 
        hasMoved: false, 
        hasActed: false, 
        remainingActions: 1, 
        damagePopups: [], 
        lootDrops: [],
        battleRewards: { xp: 50, gold: 20, items: [] } 
      });
  },

  confirmBattle: () => set({ gameState: GameState.BATTLE_TACTICAL }),

  handleTileInteraction: async (x, z) => {
      const state = get();
      if (state.isActionAnimating || state.gameState !== GameState.BATTLE_TACTICAL) return;

      const actor = state.battleEntities.find(e => e.id === state.turnOrder[state.currentTurnIndex]);
      if (!actor || actor.type !== 'PLAYER') return;

      if (state.selectedAction === BattleAction.MOVE) {
          const path = findBattlePath({x: actor.position.x, y: actor.position.y}, {x, y: z}, state.battleMap || []);
          if (path) {
              set({ 
                  battleEntities: state.battleEntities.map(e => e.id === actor.id ? { ...e, position: { x, y: z } } : e), 
                  hasMoved: true,
                  selectedAction: null,
                  validMoves: []
              });
              sfx.playStep();
          }
      } 
      else if (state.selectedAction === BattleAction.ATTACK) {
          const target = state.battleEntities.find(e => e.stats.hp > 0 && e.position.x === x && e.position.y === z);
          if (target && target.type === 'ENEMY') {
              await get().executeAction(actor, [target]);
          }
      }
  },

  executeAction: async (actor, targets, ability) => {
      const state = get();
      set({ isActionAnimating: true });
      
      const mainTarget = targets[0];
      set({ 
          activeSpellEffect: { 
              id: generateId(), 
              type: ability ? 'PROJECTILE' : 'BURST', 
              startPos: [actor.position.x, 1.5, actor.position.y], 
              endPos: [mainTarget.position.x, 1, mainTarget.position.y], 
              color: ability?.color || '#fff', 
              duration: 600, 
              timestamp: Date.now() 
          } 
      });

      await new Promise(r => setTimeout(r, 600));

      let newEntities = [...get().battleEntities];
      let allPopups = [];
      const effects = ability ? ability.effects : [{ type: EffectType.DAMAGE, diceCount: 1, diceSides: 8, damageType: actor.stats.attackDamageType || DamageType.SLASHING }];

      targets.forEach(target => {
          const res = ActionResolver.resolve(actor, target, effects, state.dimension, state.battleEntities);
          newEntities = applyResolutionToEntities(res, actor, target, newEntities);
          allPopups.push(...res.popups.map(p => ({ ...p, id: generateId(), position: [target.position.x, 2, target.position.y], timestamp: Date.now() })));
          if (res.didHit) sfx.playHit();
          
          const updatedTarget = newEntities.find(e => e.id === target.id);
          if (updatedTarget?.stats.hp === 0 && updatedTarget.type === 'ENEMY') {
              get().spawnLootDrop(updatedTarget);
              get().updateQuestProgress('KILL', updatedTarget.defId, 1);
          }
      });

      set({ 
          battleEntities: newEntities, 
          damagePopups: [...get().damagePopups, ...allPopups], 
          isActionAnimating: false, 
          activeSpellEffect: null, 
          hasActed: true, 
          selectedAction: null 
      });

      const aliveEnemies = newEntities.filter(e => e.type === 'ENEMY' && e.stats.hp > 0);
      if (aliveEnemies.length === 0) {
          set({ gameState: GameState.BATTLE_VICTORY });
          return;
      }

      if (get().hasActed && get().hasMoved) {
          setTimeout(() => get().advanceTurn(), 1000);
      }
  },

  advanceTurn: async () => {
      const state = get();
      let nextIdx = (state.currentTurnIndex + 1) % state.turnOrder.length;
      while (state.battleEntities.find(e => e.id === state.turnOrder[nextIdx])?.stats.hp <= 0) { 
          nextIdx = (nextIdx + 1) % state.turnOrder.length; 
      }
      
      const nextEnt = state.battleEntities.find(e => e.id === state.turnOrder[nextIdx]);
      set({ 
          currentTurnIndex: nextIdx, 
          hasMoved: false, 
          hasActed: false, 
          selectedAction: null, 
          isUnitMenuOpen: false 
      });

      if (nextEnt?.type === 'ENEMY') {
          setTimeout(() => get().performEnemyTurn(), 800);
      }
  },

  performEnemyTurn: async () => {
      const state = get();
      const actor = state.battleEntities.find(e => e.id === state.turnOrder[state.currentTurnIndex]);
      if (!actor || actor.stats.hp <= 0 || actor.type !== 'ENEMY') { get().advanceTurn(); return; }
      
      const players = state.battleEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);
      if (players.length === 0) { get().advanceTurn(); return; }

      const target = players[0]; // IA básica: ataca al primero
      const dist = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));

      if (dist <= 1.5) {
          await get().executeAction(actor, [target]);
      } else {
          // Movimiento básico hacia el jugador
          const stepX = actor.position.x + Math.sign(target.position.x - actor.position.x);
          const stepY = actor.position.y + Math.sign(target.position.y - actor.position.y);
          set({ 
              battleEntities: state.battleEntities.map(e => e.id === actor.id ? { ...e, position: { x: stepX, y: stepY } } : e) 
          });
          sfx.playStep();
          await new Promise(r => setTimeout(r, 600));
          if (Math.max(Math.abs(stepX - target.position.x), Math.abs(stepY - target.position.y)) <= 1.5) {
              await get().executeAction(actor, [target]);
          }
      }
      setTimeout(() => get().advanceTurn(), 1000);
  },

  handleTileHover: (x, z) => set({ selectedTile: { x, z } }),
  selectAction: (action) => set({ selectedAction: action, isUnitMenuOpen: false }),
  executeWait: () => get().advanceTurn(),
  removeDamagePopup: (id) => set(s => ({ damagePopups: s.damagePopups.filter(p => p.id !== id) })),
  inspectUnit: (id) => set({ inspectedEntityId: id }),
  closeInspection: () => set({ inspectedEntityId: null }),
  setUnitMenuOpen: (open) => set({ isUnitMenuOpen: open }),
  continueAfterVictory: () => set({ gameState: GameState.OVERWORLD, battleRewards: null }),
  restartBattle: () => set({ gameState: GameState.TITLE }),
  spawnLootDrop: (ent) => set(s => ({ lootDrops: [...s.lootDrops, { id: generateId(), position: { x: ent.position.x, y: ent.position.y }, rarity: ItemRarity.COMMON, itemId: 'gold_pouch' }] }))
});
