
// @ts-nocheck
import { StateCreator } from 'zustand';
import { 
    GameState, TerrainType, WeatherType, BattleCell, BattleAction, Entity, 
    CombatStatsComponent, PositionComponent, DamagePopup, SpellEffectData, SpellType, 
    CharacterClass, VisualComponent, AIBehavior, LootDrop, ItemRarity, Item, 
    EquipmentSlot, Dimension, InventorySlot, CharacterRace, DamageType, Ability, TileEffectType, Skill, Spell, CreatureType, Difficulty, EffectType, StatusEffectType
} from '../../types';
import { findBattlePath, getReachableTiles } from '../../services/pathfinding';
import { rollDice, calculateEnemyStats, getAoETiles, calculateAttackRoll, calculateHitChance, getAttackRange } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { TERRAIN_COLORS, ASSETS } from '../../constants';
import { useContentStore } from '../contentStore';
import { ActionResolver, ActionResolution } from '../../services/ActionResolver';
import { WorldGenerator } from '../../services/WorldGenerator';

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
                    if (existing) {
                        existing.duration = Math.max(existing.duration, sc.duration);
                        existing.intensity = (existing.intensity || 1) + (sc.intensity || 0);
                    } else {
                        nextStatus.push({ type: sc.type, duration: sc.duration, intensity: sc.intensity || 1 });
                    }
                });
            }
            finalStats.activeStatusEffects = nextStatus;
            return { ...e, stats: finalStats };
        }
        if (e.id === actor.id && res.actorStatusChanges) {
             let nextHp = e.stats.hp;
             res.actorStatusChanges.forEach(asc => {
                 if (asc.type === 'REGEN' as any) nextHp += asc.intensity;
             });
             return { ...e, stats: { ...e.stats, hp: Math.min(e.stats.maxHp, nextHp) }};
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
  battleIntroText: string;

  startBattle: (terrain: TerrainType, weather: WeatherType, arenaId?: string) => void;
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
  battleIntroText: "El combate comienza...",

  startBattle: (terrain, weather, arenaId) => {
      const contentState = useContentStore.getState();
      const isAmbushed = get().isAmbushed;
      const worldTime = get().worldTime;
      const dimension = get().dimension;
      const isVoid = dimension === Dimension.UPSIDE_DOWN;
      const hours = Math.floor(worldTime / 60);
      const isNight = hours < 6 || hours >= 22;
      
      let grid: BattleCell[] = [];
      const customArena = arenaId ? contentState.maps[arenaId] : null;

      // --- FALLBACK TÁCTICO LORE-COHESIVO ---
      if (customArena && customArena.type === 'BATTLE_ARENA' && customArena.battleCells) {
          grid = customArena.battleCells;
      } else {
          // Generación dinámica basada en bioma y dimensión
          grid = WorldGenerator.generateBattleArena(terrain, isVoid);
      }

      const partyEntities = get().party.map((p, i) => ({ 
          ...p, 
          position: { x: 4 + (i % 2), y: 6 + Math.floor(i / 2) } 
      }));

      let encounterList = contentState.encounters[terrain] || ['skeleton'];
      const voidPool = ['undead-spirit/shadow', 'undead-necromancers/ancient-lich', 'undead/ghoul', 'monsters/giant-spider'];
      
      if (isVoid) encounterList = voidPool;
      else if (isNight) encounterList = [...encounterList, ...voidPool];

      const enemyScale = isVoid ? 1.8 : (isNight ? 1.5 : 1.2);
      const enemyCount = Math.min(8, Math.floor(partyEntities.length * enemyScale));
      const enemies = [];
      const enemyNames = [];

      for(let i=0; i < enemyCount; i++) {
          const defId = encounterList[Math.floor(Math.random() * encounterList.length)];
          const def = contentState.enemies[defId] || { name: 'Void Stalker', sprite: 'units/undead-spirit/shadow.png', hp: 20, ac: 13 };
          enemyNames.push(def.name);
          const startX = (isAmbushed || isVoid) ? 7 : 12;
          enemies.push({ 
              id: `enemy_${i}_${generateId()}`, defId, name: def.name, type: 'ENEMY', 
              stats: {
                  ...calculateEnemyStats(def, partyEntities[0].stats.level, (isNight || isVoid) ? Difficulty.HARD : get().difficulty),
                  initiativeBonus: (def.initiativeBonus || 0) + (isAmbushed ? 5 : 0) + (isVoid ? 4 : 0)
              },
              visual: { color: isVoid ? '#7c3aed' : '#ef4444', modelType: 'billboard', spriteUrl: def.sprite }, 
              position: { x: startX - (i % 2), y: 6 + Math.floor(i / 2) }, 
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
        hasMoved: false, hasActed: false, 
        remainingActions: 1, damagePopups: [], lootDrops: [],
        battleRewards: { 
            xp: Math.floor(100 * (isVoid ? 2.0 : (isNight ? 1.5 : 1.0))), 
            gold: isVoid ? 0 : Math.floor(40 * (isNight ? 1.5 : 1.0)), 
            shards: isVoid ? Math.floor(Math.random() * 5 + 3) : 0,
            items: [] 
        } 
      });

      import('../../services/GeminiService').then(({ GeminiService }) => {
          GeminiService.generateBattleFlavor(terrain, Array.from(new Set(enemyNames)), get().dimension, isNight)
            .then(text => set({ battleIntroText: text }));
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
                  hasMoved: true, selectedAction: null, validMoves: []
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
      else if (state.selectedAction === BattleAction.MAGIC || state.selectedAction === BattleAction.SKILL) {
          const ability = state.selectedSpell || state.selectedSkill;
          if (!ability) return;
          let targets = [];
          if (ability.aoeRadius) {
              const aoeTiles = getAoETiles({ x: actor.position.x, y: actor.position.y }, { x, y: z }, ability.aoeType || 'CIRCLE', ability.aoeRadius);
              targets = state.battleEntities.filter(e => e.stats.hp > 0 && aoeTiles.some(t => t.x === e.position.x && t.y === e.position.y));
          } else {
              const target = state.battleEntities.find(e => e.stats.hp > 0 && e.position.x === x && e.position.y === z);
              if (target) targets = [target];
          }
          if (targets.length > 0) await get().executeAction(actor, targets, ability);
      }
  },

  executeAction: async (actor, targets, ability) => {
      const state = get();
      set({ isActionAnimating: true });
      const mainTarget = targets[0];
      set({ 
          activeSpellEffect: { 
              id: generateId(), type: ability ? 'PROJECTILE' : 'BURST', startPos: [actor.position.x, 1.5, actor.position.y], endPos: [mainTarget.position.x, 1, mainTarget.position.y], color: ability?.color || '#fff', duration: 600, timestamp: Date.now() 
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
      if (ability) {
          newEntities = newEntities.map(e => {
              if (e.id === actor.id) {
                  const s = { ...e.stats };
                  if ('spellSlots' in s && s.spellSlots.current > 0) s.spellSlots = { ...s.spellSlots, current: s.spellSlots.current - 1 };
                  if ('stamina' in s) s.stamina = Math.max(0, s.stamina - (ability.staminaCost || 0));
                  return { ...e, stats: s };
              }
              return e;
          });
      }
      set({ battleEntities: newEntities, damagePopups: [...get().damagePopups, ...allPopups], isActionAnimating: false, activeSpellEffect: null, hasActed: true, selectedAction: null, selectedSpell: null, selectedSkill: null, validTargets: [] });
      const aliveEnemies = newEntities.filter(e => e.type === 'ENEMY' && e.stats.hp > 0);
      if (aliveEnemies.length === 0) {
          if (state.gameState === GameState.DUNGEON || state.gameState === GameState.TOWN_EXPLORATION) {
              const currentTile = state.townMapData.find(c => c.q === state.playerPos.x && c.r === state.playerPos.y);
              if (currentTile) {
                   const locKey = `${state.currentSettlementName}_${currentTile.q}_${currentTile.r}`;
                   const newCleared = new Set(state.clearedLocations);
                   newCleared.add(locKey);
                   set({ clearedLocations: newCleared });
                   get().updateQuestProgress('CLEAR_LOCATION', state.currentSettlementName, 1);
              }
          }
          set({ gameState: GameState.BATTLE_VICTORY }); return;
      }
      if (get().hasActed && get().hasMoved) setTimeout(() => get().advanceTurn(), 1000);
  },

  advanceTurn: async () => {
      const state = get();
      let nextIdx = (state.currentTurnIndex + 1) % state.turnOrder.length;
      while (state.battleEntities.find(e => e.id === state.turnOrder[nextIdx])?.stats.hp <= 0) nextIdx = (nextIdx + 1) % state.turnOrder.length; 
      const nextEnt = state.battleEntities.find(e => e.id === state.turnOrder[nextIdx]);
      if (!nextEnt) return;
      set({ currentTurnIndex: nextIdx, hasMoved: false, hasActed: false, selectedAction: null, isUnitMenuOpen: false });
      if (nextEnt?.type === 'ENEMY') setTimeout(() => get().performEnemyTurn(), 800);
  },

  performEnemyTurn: async () => {
      const state = get();
      const actor = state.battleEntities.find(e => e.id === state.turnOrder[state.currentTurnIndex]);
      if (!actor || actor.stats.hp <= 0 || actor.type !== 'ENEMY') { get().advanceTurn(); return; }
      const players = state.battleEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);
      if (players.length === 0) { get().advanceTurn(); return; }
      const sortedPlayers = players.sort((a, b) => {
          const distA = Math.max(Math.abs(actor.position.x - a.position.x), Math.abs(actor.position.y - a.position.y));
          const distB = Math.max(Math.abs(actor.position.x - b.position.x), Math.abs(actor.position.y - b.position.y));
          return distA - distB;
      });
      const target = sortedPlayers[0];
      const dist = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
      const range = getAttackRange(actor);
      if (dist <= range) await get().executeAction(actor, [target]);
      else {
          const reachable = getReachableTiles(actor.position, 5, state.battleMap, new Set());
          if (reachable.length > 0) {
              const bestTile = reachable.sort((a, b) => {
                  const distA = Math.max(Math.abs(a.x - target.position.x), Math.abs(a.y - target.position.y));
                  const distB = Math.max(Math.abs(b.x - target.position.x), Math.abs(b.y - target.position.y));
                  return distA - distB;
              })[0];
              set({ battleEntities: state.battleEntities.map(e => e.id === actor.id ? { ...e, position: { x: bestTile.x, y: bestTile.y } } : e) });
              sfx.playStep();
              await new Promise(r => setTimeout(r, 600));
              if (Math.max(Math.abs(bestTile.x - target.position.x), Math.abs(bestTile.y - target.position.y)) <= range) await get().executeAction(actor, [target]);
          }
      }
      setTimeout(() => get().advanceTurn(), 1000);
  },

  handleTileHover: (x, z) => set({ selectedTile: { x, z } }),
  selectAction: (action) => {
      const state = get(); const actor = state.battleEntities.find(e => e.id === state.turnOrder[state.currentTurnIndex]);
      if (!actor) return;
      let vt = [];
      if (action === BattleAction.ATTACK) {
          const range = getAttackRange(actor);
          vt = state.battleEntities.filter(e => e.id !== actor.id && e.stats.hp > 0 && e.type === 'ENEMY').map(e => ({ x: e.position.x, y: e.position.y })).filter(pos => Math.max(Math.abs(pos.x - actor.position.x), Math.abs(pos.y - actor.position.y)) <= range);
      } else if (action === BattleAction.MOVE) {
          vt = getReachableTiles(actor.position, 5, state.battleMap, new Set(state.battleEntities.filter(e => e.stats.hp > 0).map(e => `${e.position.x},${e.position.y}`)));
      }
      set({ selectedAction: action, isUnitMenuOpen: false, validMoves: action === BattleAction.MOVE ? vt : [], validTargets: action === BattleAction.ATTACK ? vt : [] });
  },
  executeWait: () => get().advanceTurn(),
  removeDamagePopup: (id) => set(s => ({ damagePopups: s.damagePopups.filter(p => p.id !== id) })),
  inspectUnit: (id) => set({ inspectedEntityId: id }),
  closeInspection: () => set({ inspectedEntityId: null }),
  setUnitMenuOpen: (open) => set({ isUnitMenuOpen: open }),
  continueAfterVictory: () => {
       const state = get();
       if (state.gameState === GameState.BATTLE_VICTORY) {
           const nextGs = state.townMapData ? (state.gameState === GameState.DUNGEON ? GameState.DUNGEON : GameState.TOWN_EXPLORATION) : GameState.OVERWORLD;
           set({ gameState: nextGs, battleRewards: null });
       }
  },
  restartBattle: () => set({ gameState: GameState.TITLE }),
  spawnLootDrop: (ent) => set(s => ({ lootDrops: [...s.lootDrops, { id: generateId(), position: { x: ent.position.x, y: ent.position.y }, rarity: ItemRarity.COMMON, itemId: 'gold_pouch' }] }))
});
