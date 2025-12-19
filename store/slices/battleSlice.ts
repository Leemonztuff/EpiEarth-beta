
// @ts-nocheck
import { StateCreator } from 'zustand';
import { 
    GameState, TerrainType, WeatherType, BattleCell, BattleAction, Spell, Entity, 
    CombatStatsComponent, PositionComponent, DamagePopup, SpellEffectData, SpellType, 
    CharacterClass, VisualComponent, AIBehavior, LootDrop, ItemRarity, Item, 
    EquipmentSlot, Dimension, InventorySlot, CharacterRace, DamageType, Ability, Skill, CreatureType, Difficulty, StatusEffectType, MovementType, ActionEffect, EffectType, TileEffectType
} from '../../types';
import { findBattlePath, getReachableTiles } from '../../services/pathfinding';
import { rollDice, calculateAttackRoll, calculateFinalDamage, calculateEnemyStats, getAttackRange, getAoETiles, calculateDerivedStats, isFlanking } from '../../services/dndRules';
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
  isScreenShaking: boolean;
  isScreenFlashing: boolean; 
  inspectedEntityId: string | null;

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
        if (e.id === target.id && res.transformation) {
            const def = enemiesDB[res.transformation];
            if (def) {
                const oldStats = { ...e.stats };
                const oldVisual = { ...e.visual };
                const newStats: CombatStatsComponent = { ...oldStats, hp: def.hp, maxHp: def.hp, ac: def.ac, initiativeBonus: def.initiativeBonus, originalStats: oldStats, originalVisual: oldVisual };
                const newVisual: VisualComponent = { ...oldVisual, spriteUrl: def.sprite.startsWith('http') ? def.sprite : `${WESNOTH_BASE_URL}/${def.sprite}` };
                return { ...e, stats: newStats, visual: newVisual };
            }
        }
        if (e.id === target.id) {
            let nextHp = e.stats.hp + res.hpChange;
            let finalStats = { ...e.stats };
            let finalVisual = { ...e.visual };
            if (nextHp <= 0 && e.stats.originalStats) {
                const restoredStats = e.stats.originalStats as CombatStatsComponent;
                const restoredVisual = e.stats.originalVisual as VisualComponent;
                finalStats = { ...restoredStats, hp: Math.max(1, restoredStats.hp - Math.abs(nextHp)) };
                finalVisual = restoredVisual;
                delete finalStats.originalStats; delete finalStats.originalVisual;
            } else { finalStats.hp = Math.max(0, Math.min(e.stats.maxHp, nextHp)); }
            const nextStatus = [...(finalStats.activeStatusEffects || [])];
            if (res.statusChanges) {
                res.statusChanges.forEach(sc => {
                    const existing = nextStatus.find(s => s.type === sc.type);
                    if (existing) existing.duration = Math.max(existing.duration, sc.duration);
                    else nextStatus.push({ type: sc.type, duration: sc.duration, intensity: 1 });
                });
            }
            finalStats.activeStatusEffects = nextStatus;
            return { ...e, stats: finalStats, visual: finalVisual };
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
  isScreenShaking: false,
  isScreenFlashing: false,
  inspectedEntityId: null,

  setUnitMenuOpen: (isOpen) => set({ isUnitMenuOpen: isOpen }),
  
  selectAction: (action) => {
      const { selectedAction } = get();
      if (selectedAction === action) set({ selectedAction: null });
      else { set({ selectedAction: action, isUnitMenuOpen: false }); sfx.playUiClick(); }
  },

  // ADD RESTART BATTLE implementation
  restartBattle: () => {
    const state = get();
    get().startBattle(state.battleTerrain, state.battleWeather);
  },

  executeAction: async (actor, targets, ability) => {
      const state = get();
      set({ isActionAnimating: true });
      let effectType = 'BURST';
      let animColor = '#fff';
      if (ability) {
          effectType = (state.selectedAction === BattleAction.MAGIC) ? 'PROJECTILE' : 'BURST';
          animColor = ability.color || '#a855f7';
          state.selectedAction === BattleAction.MAGIC ? sfx.playMagic() : sfx.playAttack();
      } else { sfx.playAttack(); }

      const mainTarget = targets[0];
      set({ activeSpellEffect: { id: generateId(), type: effectType, startPos: [actor.position.x, 1.5, actor.position.y], endPos: [mainTarget.position.x, 1, mainTarget.position.y], color: animColor, duration: 800, timestamp: Date.now() } });

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
          if (updatedTarget?.stats.hp === 0 && updatedTarget.type === 'ENEMY') get().spawnLootDrop(updatedTarget);
      });

      set({ battleEntities: newEntities, damagePopups: [...get().damagePopups, ...allPopups], isActionAnimating: false, activeSpellEffect: null, hasActed: true, remainingActions: state.remainingActions - 1, selectedAction: null });
      if (state.remainingActions <= 1 && state.hasMoved) setTimeout(() => get().advanceTurn(), 1000);
  },

  performEnemyTurn: async () => {
    const state = get();
    const actor = state.battleEntities.find(e => e.id === state.turnOrder[state.currentTurnIndex]);
    if (!actor || actor.stats.hp <= 0 || actor.type !== 'ENEMY') { get().advanceTurn(); return; }
    
    const players = state.battleEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);
    if (players.length === 0) { get().advanceTurn(); return; }

    const target = players.sort((a,b) => {
        const distA = Math.abs(actor.position.x - a.position.x) + Math.abs(actor.position.y - a.position.y);
        const distB = Math.abs(actor.position.x - b.position.x) + Math.abs(actor.position.y - b.position.y);
        return distA - distB;
    })[0];

    const dist = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
    const range = getAttackRange(actor);
    const behavior = actor.aiBehavior || AIBehavior.BASIC_MELEE;

    // 1. Lógica de Magos/Arqueros: Mantener distancia
    if ((behavior === AIBehavior.ARCHER || behavior === AIBehavior.CASTER) && dist <= 2) {
        const moveSteps = Math.floor(actor.stats.speed / 5);
        const occupied = new Set(state.battleEntities.filter(e => e.stats.hp > 0 && e.id !== actor.id).map(e => `${e.position.x},${e.position.y}`));
        const reachable = getReachableTiles({x: actor.position.x, y: actor.position.y}, moveSteps, state.battleMap || [], occupied);
        const safestCell = reachable.sort((a,b) => {
            const dA = Math.abs(a.x - target.position.x) + Math.abs(a.y - target.position.y);
            const dB = Math.abs(b.x - target.position.x) + Math.abs(b.y - target.position.y);
            return dB - dA; // Más lejos es mejor
        })[0];
        if (safestCell) {
            set({ battleEntities: state.battleEntities.map(e => e.id === actor.id ? { ...e, position: { x: safestCell.x, y: safestCell.y } } : e) });
            sfx.playStep();
            await new Promise(r => setTimeout(r, 600));
        }
    }

    // 2. Lógica de Melee: Flanqueo
    if (behavior === AIBehavior.BASIC_MELEE && dist > 1) {
        const allies = state.battleEntities.filter(e => e.type === 'ENEMY' && e.id !== actor.id && e.stats.hp > 0);
        const moveSteps = Math.floor(actor.stats.speed / 5);
        const occupied = new Set(state.battleEntities.filter(e => e.stats.hp > 0 && e.id !== actor.id).map(e => `${e.position.x},${e.position.y}`));
        const reachable = getReachableTiles({x: actor.position.x, y: actor.position.y}, moveSteps, state.battleMap || [], occupied);
        
        // Buscar celda adyacente al objetivo que esté al otro lado de un aliado
        const bestCell = reachable.filter(c => Math.abs(c.x - target.position.x) + Math.abs(c.y - target.position.y) === 1)
            .sort((a,b) => (isFlanking({ ...actor, position: a }, target, allies) ? -1 : 1))[0];

        if (bestCell) {
            set({ battleEntities: state.battleEntities.map(e => e.id === actor.id ? { ...e, position: { x: bestCell.x, y: bestCell.y } } : e) });
            sfx.playStep();
            await new Promise(r => setTimeout(r, 600));
        }
    }

    // 3. Ejecutar Acción
    const updatedDist = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
    if (updatedDist <= range) {
        get().executeAction(actor, [target]);
        setTimeout(() => get().advanceTurn(), 1200);
    } else {
        get().advanceTurn();
    }
  },

  advanceTurn: async () => {
      const state = get();
      let nextIdx = (state.currentTurnIndex + 1) % state.turnOrder.length;
      while (state.battleEntities.find(e => e.id === state.turnOrder[nextIdx])?.stats.hp <= 0) { nextIdx = (nextIdx + 1) % state.turnOrder.length; }
      
      const nextEnt = state.battleEntities.find(e => e.id === state.turnOrder[nextIdx]);
      
      // PROCESAR EFECTOS DE TERRENO AL INICIO DEL TURNO
      const cell = state.battleMap?.find(c => c.x === nextEnt?.position.x && c.z === nextEnt?.position.y);
      let hpMod = 0;
      if (cell?.effect) {
          if (cell.effect.type === TileEffectType.FIRE) hpMod -= 5;
          if (cell.effect.type === TileEffectType.POISON_CLOUD) hpMod -= 3;
      }

      set({ battleEntities: state.battleEntities.map(e => e.id === nextEnt?.id ? { ...e, stats: { ...e.stats, hp: Math.max(0, e.stats.hp + hpMod) } } : e), currentTurnIndex: nextIdx, hasMoved: false, hasActed: false, remainingActions: nextEnt?.stats.maxActions || 1, selectedAction: null, isUnitMenuOpen: false });
      if (nextEnt?.type === 'ENEMY') setTimeout(() => get().performEnemyTurn(), 800);
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
