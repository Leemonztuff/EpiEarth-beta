
// @ts-nocheck
import { StateCreator } from 'zustand';
import { 
    GameState, TerrainType, WeatherType, BattleCell, BattleAction, Spell, Entity, 
    CombatStatsComponent, PositionComponent, DamagePopup, SpellEffectData, SpellType, 
    CharacterClass, VisualComponent, AIBehavior, LootDrop, ItemRarity, Item, 
    EquipmentSlot, Dimension, InventorySlot, CharacterRace, DamageType, Ability, Skill, CreatureType, Difficulty, StatusEffectType, MovementType, ActionEffect, EffectType, TileEffectType
} from '../../types';
import { findBattlePath, getReachableTiles } from '../../services/pathfinding';
import { rollDice, calculateAttackRoll, calculateFinalDamage, calculateEnemyStats, getAttackRange, getAoETiles, calculateDerivedStats, isFlanking, calculateHitChance } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { TERRAIN_COLORS, ASSETS, WESNOTH_BASE_URL } from '../../constants';
import { useContentStore } from '../contentStore';
import { ActionResolver, ActionResolution } from '../../services/ActionResolver';

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface BattleSlice {
  battleEntities: Entity[];
  turnOrder: string[];
  currentTurnIndex: number;
  battleMap: BattleCell[] | null;
  battleTerrain: TerrainType;
  battleWeather: WeatherType;
  battleRewards: { xp: number, gold: number, items: Item[] };
  damagePopups: DamagePopup[];
  activeSpellEffect: SpellEffectData | null;
  lootDrops: LootDrop[];
  isActionAnimating: boolean;
  isUnitMenuOpen: boolean;
  selectedAction: BattleAction | null;
  selectedSpell: Spell | null;
  selectedSkill: Skill | null;
  hasMoved: boolean;
  hasActed: boolean;
  remainingActions: number;
  selectedTile: PositionComponent | null;

  startBattle: (terrain: TerrainType, weather: WeatherType, enemyId?: string) => void;
  confirmBattle: () => void;
  handleTileInteraction: (x: number, z: number) => void;
  executeAction: (actor: Entity, targets: Entity[], ability?: Spell | Skill) => Promise<void>;
  selectAction: (action: BattleAction) => void;
  advanceTurn: () => Promise<void>;
  performEnemyTurn: () => Promise<void>;
  handleTileHover: (x: number, z: number) => void;
  removeDamagePopup: (id: string) => void;
  continueAfterVictory: () => void;
  setUnitMenuOpen: (isOpen: boolean) => void;
  spawnLootDrop: (entity: Entity) => void;
  inspectUnit: (id: string) => void;
  closeInspection: () => void;
  restartBattle: () => void;
}

const applyResolutionToEntities = (res: ActionResolution, actor: Entity, target: Entity, entities: Entity[]) => {
    const enemiesDB = useContentStore.getState().enemies;
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

export const createBattleSlice: StateCreator<any, [], [], BattleSlice> = (set, get) => ({
  battleEntities: [],
  turnOrder: [],
  currentTurnIndex: 0,
  battleMap: null,
  battleTerrain: TerrainType.GRASS,
  battleWeather: WeatherType.NONE,
  battleRewards: { xp: 0, gold: 0, items: [] },
  damagePopups: [],
  activeSpellEffect: null,
  lootDrops: [],
  isActionAnimating: false,
  isUnitMenuOpen: false,
  selectedAction: null,
  selectedSpell: null,
  selectedSkill: null,
  hasMoved: false,
  hasActed: false,
  remainingActions: 1,
  selectedTile: null,

  setUnitMenuOpen: (isOpen) => set({ isUnitMenuOpen: isOpen }),
  
  selectAction: (action) => {
      const { selectedAction } = get();
      if (selectedAction === action) set({ selectedAction: null });
      else { set({ selectedAction: action, isUnitMenuOpen: false }); sfx.playUiClick(); }
  },

  handleTileInteraction: async (x, z) => {
      const state = get();
      if (state.isActionAnimating || state.gameState !== GameState.BATTLE_TACTICAL) return;

      const actor = state.battleEntities.find(e => e.id === state.turnOrder[state.currentTurnIndex]);
      if (!actor || actor.type !== 'PLAYER') return;

      const ability = state.selectedSpell || state.selectedSkill;
      
      // 1. MOVIMIENTO
      if (state.selectedAction === BattleAction.MOVE) {
          const path = findBattlePath({x: actor.position.x, y: actor.position.y}, {x, y: z}, state.battleMap || []);
          if (path) {
              set({ battleEntities: state.battleEntities.map(e => e.id === actor.id ? { ...e, position: { x, y: z } } : e), hasMoved: true });
              sfx.playStep();
          }
      } 
      // 2. ACCIONES (ATACAR / MAGIA / SKILL)
      else if (state.selectedAction === BattleAction.ATTACK || state.selectedAction === BattleAction.MAGIC || state.selectedAction === BattleAction.SKILL) {
          let targets = [];
          if (ability && ability.aoeRadius) {
              const aoeTiles = getAoETiles(actor.position, {x, y: z}, ability.aoeType || 'CIRCLE', ability.aoeRadius);
              targets = state.battleEntities.filter(e => e.stats.hp > 0 && aoeTiles.some(t => t.x === e.position.x && t.y === e.position.y));
          } else {
              const target = state.battleEntities.find(e => e.stats.hp > 0 && e.position.x === x && e.position.y === z);
              if (target) targets = [target];
          }

          if (targets.length > 0) {
              await get().executeAction(actor, targets, ability);
          }
      }
  },

  executeAction: async (actor, targets, ability) => {
      const state = get();
      set({ isActionAnimating: true });
      let effectType = (ability?.aoeRadius) ? 'BURST' : 'PROJECTILE';
      if (state.selectedAction === BattleAction.ATTACK) effectType = 'BURST';

      const mainTarget = targets[0];
      set({ activeSpellEffect: { id: generateId(), type: effectType, startPos: [actor.position.x, 1.5, actor.position.y], endPos: [mainTarget.position.x, 1, mainTarget.position.y], color: ability?.color || '#fff', duration: 800, timestamp: Date.now() } });

      await new Promise(r => setTimeout(r, 800));

      let newEntities = [...get().battleEntities];
      let allPopups = [];
      const effectsToResolve = ability ? ability.effects : [{ type: EffectType.DAMAGE, diceCount: 1, diceSides: 8, damageType: actor.stats.attackDamageType || DamageType.SLASHING }];

      targets.forEach(target => {
          const res = ActionResolver.resolve(actor, target, effectsToResolve, state.dimension, state.battleEntities);
          newEntities = applyResolutionToEntities(res, actor, target, newEntities);
          allPopups.push(...res.popups.map(p => ({ ...p, id: generateId(), position: [target.position.x, 2, target.position.y], timestamp: Date.now() })));
          if (res.didHit) sfx.playHit();
          
          const updatedTarget = newEntities.find(e => e.id === target.id);
          if (updatedTarget?.stats.hp === 0 && updatedTarget.type === 'ENEMY') {
              get().spawnLootDrop(updatedTarget);
              get().updateQuestProgress('KILL', updatedTarget.defId, 1);
          }
      });

      set({ battleEntities: newEntities, damagePopups: [...get().damagePopups, ...allPopups], isActionAnimating: false, activeSpellEffect: null, hasActed: true, remainingActions: state.remainingActions - 1, selectedAction: null, selectedSpell: null, selectedSkill: null });
      if (get().remainingActions <= 0) setTimeout(() => get().advanceTurn(), 1000);
  },

  performEnemyTurn: async () => {
    const state = get();
    const content = useContentStore.getState();
    const actor = state.battleEntities.find(e => e.id === state.turnOrder[state.currentTurnIndex]);
    if (!actor || actor.stats.hp <= 0 || actor.type !== 'ENEMY') { get().advanceTurn(); return; }
    
    const players = state.battleEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);
    if (players.length === 0) { get().advanceTurn(); return; }

    const target = players.sort((a,b) => (Math.abs(actor.position.x - a.position.x) + Math.abs(actor.position.y - a.position.y)) - (Math.abs(actor.position.x - b.position.x) + Math.abs(actor.position.y - b.position.y)))[0];

    // Lógica IA: Hechizos primero
    const behavior = actor.aiBehavior || AIBehavior.BASIC_MELEE;
    if (behavior === AIBehavior.CASTER && actor.stats.spellSlots.current > 0) {
        const spellId = actor.stats.knownSpells?.[0];
        const spell = content.spells[spellId];
        if (spell) {
             const dist = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
             if (dist <= spell.range) {
                 await get().executeAction(actor, [target], spell);
                 setTimeout(() => get().advanceTurn(), 1200);
                 return;
             }
        }
    }

    // Lógica Melee básica
    const dist = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
    if (dist > 1) {
        // Moverse
        const moveSteps = 4;
        const reachable = getReachableTiles(actor.position, moveSteps, state.battleMap || [], new Set());
        const bestCell = reachable.sort((a,b) => (Math.abs(a.x - target.position.x) + Math.abs(a.y - target.position.y)) - (Math.abs(b.x - target.position.x) + Math.abs(b.y - target.position.y)))[0];
        if (bestCell) {
            set({ battleEntities: state.battleEntities.map(e => e.id === actor.id ? { ...e, position: { x: bestCell.x, y: bestCell.y } } : e) });
            sfx.playStep();
            await new Promise(r => setTimeout(r, 600));
        }
    }

    const updatedDist = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
    if (updatedDist <= 1.5) {
        await get().executeAction(actor, [target]);
    }
    setTimeout(() => get().advanceTurn(), 1000);
  },

  advanceTurn: async () => {
      const state = get();
      let nextIdx = (state.currentTurnIndex + 1) % state.turnOrder.length;
      while (state.battleEntities.find(e => e.id === state.turnOrder[nextIdx])?.stats.hp <= 0) { nextIdx = (nextIdx + 1) % state.turnOrder.length; }
      
      const nextEnt = state.battleEntities.find(e => e.id === state.turnOrder[nextIdx]);
      
      // Terreno Efectos
      const cell = state.battleMap?.find(c => c.x === nextEnt?.position.x && c.z === nextEnt?.position.y);
      let hpMod = 0;
      if (cell?.effect) {
          if (cell.effect.type === TileEffectType.FIRE) hpMod -= 5;
          if (cell.effect.type === TileEffectType.POISON_CLOUD) hpMod -= 3;
      }

      set({ battleEntities: state.battleEntities.map(e => e.id === nextEnt?.id ? { ...e, stats: { ...e.stats, hp: Math.max(0, e.stats.hp + hpMod) } } : e), currentTurnIndex: nextIdx, hasMoved: false, hasActed: false, remainingActions: nextEnt?.stats.maxActions || 1, selectedAction: null, selectedSpell: null, selectedSkill: null, isUnitMenuOpen: false });
      if (nextEnt?.type === 'ENEMY') setTimeout(() => get().performEnemyTurn(), 800);
  },

  handleTileHover: (x, z) => set({ selectedTile: { x, y: z } }),
  removeDamagePopup: (id) => set(s => ({ damagePopups: s.damagePopups.filter(p => p.id !== id) })),
  spawnLootDrop: (ent) => {
      set(s => ({ lootDrops: [...s.lootDrops, { id: generateId(), position: { x: ent.position.x, y: ent.position.y }, rarity: ent.stats.rarity || ItemRarity.COMMON, itemId: 'gold_pouch' }] }));
  },
  inspectUnit: (id) => set({ inspectedEntityId: id }),
  closeInspection: () => set({ inspectedEntityId: null }),
  restartBattle: () => {
    const state = get();
    get().startBattle(state.battleTerrain, state.battleWeather);
  },
  confirmBattle: () => set({ gameState: GameState.BATTLE_TACTICAL }),
  continueAfterVictory: () => {
      set({ gameState: GameState.OVERWORLD, battleEntities: [], turnOrder: [], currentTurnIndex: 0, lootDrops: [] });
      sfx.playVictory();
  },
  startBattle: (terrain, weather, enemyId) => {
      const contentState = useContentStore.getState();
      const grid = [];
      for(let x=0; x<16; x++) {
          for(let z=0; z<16; z++) {
              grid.push({ x, z, height: 1, offsetY: 0, color: TERRAIN_COLORS[terrain] || '#444', textureUrl: "", isObstacle: false, blocksSight: false, movementCost: 1 });
          }
      }
      const entities = get().party.map((p, i) => ({ ...p, position: { x: 4 + (i % 2), y: 6 + Math.floor(i / 2) } }));
      const encounterList = contentState.encounters[terrain] || ['goblin_spearman'];
      const enemyCount = enemyId ? 1 : Math.min(4, Math.floor(get().party.length * 1.2));
      for(let i=0; i < enemyCount; i++) {
          const defId = enemyId || encounterList[Math.floor(Math.random() * encounterList.length)];
          const def = contentState.enemies[defId] || { name: 'Skeleton', sprite: 'units/undead-skeletal/skeleton.png', hp: 15, ac: 12, damage: 6, initiativeBonus: 1 };
          entities.push({ id: `enemy_${i}_${generateId()}`, defId, name: def.name, type: 'ENEMY', stats: calculateEnemyStats(def, get().party[0].stats.level, get().difficulty || Difficulty.NORMAL), visual: { color: '#ef4444', modelType: 'billboard', spriteUrl: def.sprite.startsWith('http') ? def.sprite : `${WESNOTH_BASE_URL}/${def.sprite}` }, position: { x: 11 - (i % 2), y: 6 + Math.floor(i / 2) }, aiBehavior: def.aiBehavior || AIBehavior.BASIC_MELEE });
      }
      set({ battleEntities: entities, battleMap: grid, turnOrder: entities.map(e => e.id).sort((a,b) => (entities.find(x => x.id === b).stats.initiativeBonus + rollDice(20)) - (entities.find(x => x.id === a).stats.initiativeBonus + rollDice(20))), currentTurnIndex: 0, gameState: GameState.BATTLE_INIT, hasMoved: false, hasActed: false, remainingActions: 1, damagePopups: [], lootDrops: [] });
  }
}));
