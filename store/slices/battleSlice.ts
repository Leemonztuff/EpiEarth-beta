
// @ts-nocheck
import { StateCreator } from 'zustand';
import { 
    GameState, TerrainType, WeatherType, BattleCell, BattleAction, Spell, Entity, 
    CombatStatsComponent, PositionComponent, DamagePopup, SpellEffectData, SpellType, 
    CharacterClass, VisualComponent, AIBehavior, LootDrop, ItemRarity, Item, 
    EquipmentSlot, Dimension, InventorySlot, CharacterRace, DamageType, Ability, Skill, CreatureType, Difficulty, StatusEffectType, MovementType, ActionEffect, EffectType
} from '../../types';
import { findBattlePath, getReachableTiles } from '../../services/pathfinding';
import { rollDice, calculateAttackRoll, calculateFinalDamage, calculateEnemyStats, getAttackRange, getAoETiles, calculateDerivedStats } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { TERRAIN_COLORS, ASSETS, WESNOTH_BASE_URL } from '../../constants';
import { useContentStore } from '../contentStore';
import { ActionResolver, ActionResolution } from '../../services/ActionResolver';

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface BattleSlice {
  battleEntities: Entity[];
  turnOrder: string[];
  currentTurnIndex: number;
  combatTurnCounter: number;
  battleMap: BattleCell[] | null;
  battleTerrain: TerrainType;
  battleWeather: WeatherType;
  battleRewards: { xp: number, gold: number, items: Item[] };
  mapDimensions: { width: number, height: number };
  selectedTile: { x: number, z: number } | null;
  hoveredEntity: Entity | null;
  selectedAction: BattleAction | null;
  selectedSpell: Spell | null;
  selectedSkill: Skill | null;
  hasMoved: boolean;
  moveCount: number; 
  hasActed: boolean;
  remainingActions: number; 
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
  selectSpell: (spell: Spell | null) => void;
  selectSkill: (skill: Skill | null) => void;
  advanceTurn: () => Promise<void>;
  performEnemyTurn: () => Promise<void>;
  handleTileHover: (x: number, z: number) => void;
  removeDamagePopup: (id: string) => void;
  continueAfterVictory: () => void;
  restartBattle: () => void;
  setUnitMenuOpen: (isOpen: boolean) => void;
  collectLoot: (dropId: string) => void;
  executeWait: () => void;
  checkAutoEndTurn: () => void;
  spawnLootDrop: (entity: Entity) => void;
  inspectUnit: (id: string) => void;
  closeInspection: () => void;
}

const applyResolutionToEntities = (res: ActionResolution, actor: Entity, target: Entity, entities: Entity[]) => {
    const enemiesDB = useContentStore.getState().enemies;

    return entities.map(e => {
        if (e.id === target.id && res.transformation) {
            const def = enemiesDB[res.transformation];
            if (def) {
                const oldStats = { ...e.stats };
                const oldVisual = { ...e.visual };
                const newStats: CombatStatsComponent = {
                    ...oldStats,
                    hp: def.hp, maxHp: def.hp,
                    ac: def.ac, initiativeBonus: def.initiativeBonus,
                    originalStats: oldStats,
                    originalVisual: oldVisual
                };
                const newVisual: VisualComponent = {
                    ...oldVisual,
                    spriteUrl: def.sprite.startsWith('http') ? def.sprite : `${WESNOTH_BASE_URL}/${def.sprite}`
                };
                return { ...e, stats: newStats, visual: newVisual };
            }
        }

        if (e.id === target.id) {
            let nextHp = e.stats.hp + res.hpChange;
            let finalStats = { ...e.stats };
            let finalVisual = { ...e.visual };

            if (nextHp <= 0 && e.stats.originalStats) {
                const overflowDamage = Math.abs(nextHp);
                const restoredStats = e.stats.originalStats as CombatStatsComponent;
                const restoredVisual = e.stats.originalVisual as VisualComponent;
                finalStats = { ...restoredStats, hp: Math.max(1, restoredStats.hp - overflowDamage) };
                finalVisual = restoredVisual;
                delete finalStats.originalStats;
                delete finalStats.originalVisual;
            } else {
                finalStats.hp = Math.max(0, Math.min(e.stats.maxHp, nextHp));
            }

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

        if (e.id === actor.id && res.actorStatusChanges) {
            const nextStatus = [...(e.stats.activeStatusEffects || [])];
            res.actorStatusChanges.forEach(sc => {
                const existing = nextStatus.find(s => s.type === sc.type);
                if (existing) existing.duration = Math.max(existing.duration, sc.duration);
                else nextStatus.push({ type: sc.type, duration: sc.duration, intensity: 1 });
            });
            return { ...e, stats: { ...e.stats, activeStatusEffects: nextStatus } };
        }
        return e;
    });
};

export const createBattleSlice: StateCreator<any, [], [], BattleSlice> = (set, get) => ({
  battleEntities: [],
  turnOrder: [],
  currentTurnIndex: 0,
  combatTurnCounter: 0,
  battleMap: null,
  battleTerrain: TerrainType.GRASS,
  battleWeather: WeatherType.NONE,
  battleRewards: { xp: 0, gold: 0, items: [] },
  mapDimensions: { width: 16, height: 16 },
  selectedTile: null,
  hoveredEntity: null,
  selectedAction: null,
  selectedSpell: null,
  selectedSkill: null,
  hasMoved: false,
  moveCount: 0,
  hasActed: false,
  remainingActions: 1,
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
      if (selectedAction === action) set({ selectedAction: null, selectedSpell: null, selectedSkill: null });
      else {
          set({ selectedAction: action, selectedSpell: null, selectedSkill: null, isUnitMenuOpen: false });
          sfx.playUiClick();
      }
  },

  selectSpell: (spell) => {
      const { selectedSpell } = get();
      if (selectedSpell?.id === spell?.id) set({ selectedSpell: null });
      else { set({ selectedSpell: spell }); sfx.playUiClick(); }
  },

  selectSkill: (skill) => {
      const { selectedSkill } = get();
      if (selectedSkill?.id === skill?.id) set({ selectedSkill: null });
      else { set({ selectedSkill: skill }); sfx.playUiClick(); }
  },

  checkAutoEndTurn: () => {
      const { remainingActions, hasMoved, isActionAnimating } = get();
      if (remainingActions <= 0 && hasMoved && !isActionAnimating) {
          setTimeout(() => get().advanceTurn(), 1000);
      }
  },

  spawnLootDrop: (entity: Entity) => {
      if (entity.type !== 'ENEMY') return;
      const content = useContentStore.getState();
      const def = content.enemies[entity.defId || ''];
      if (!def) return;
      const droppedItems: Item[] = [];
      let droppedGold = Math.floor(Math.random() * 25) + 10;
      if (def.lootTable) def.lootTable.forEach(entry => { if (Math.random() <= entry.chance) { const item = content.items[entry.itemId]; if (item) droppedItems.push(item); } });
      if (droppedItems.length > 0 || droppedGold > 0) {
          const drop: LootDrop = { id: generateId(), position: { x: entity.position.x, y: entity.position.y }, items: droppedItems, gold: droppedGold, rarity: droppedItems.length > 0 ? droppedItems[0].rarity : ItemRarity.COMMON };
          set(s => ({ lootDrops: [...s.lootDrops, drop] }));
      }
  },

  executeAction: async (actor, targets, ability) => {
      const state = get();
      const { dimension, selectedAction } = state;
      
      set({ isActionAnimating: true });
      
      let effectType = 'BURST';
      let animColor = '#fff';
      if (ability) {
          effectType = (selectedAction === BattleAction.MAGIC) ? 'PROJECTILE' : 'BURST';
          animColor = ability.color || '#a855f7';
          selectedAction === BattleAction.MAGIC ? sfx.playMagic() : sfx.playAttack();
      } else {
          sfx.playAttack();
      }

      const mainTarget = targets[0];
      const spellEffect = { 
          id: generateId(), type: effectType, 
          startPos: [actor.position.x, 1.5, actor.position.y], 
          endPos: [mainTarget.position.x, 1, mainTarget.position.y], 
          color: animColor, duration: 800, timestamp: Date.now() 
      };
      set({ activeSpellEffect: spellEffect });

      await new Promise(r => setTimeout(r, 800));

      let newEntities = [...get().battleEntities];
      let allPopups = [];
      let shouldShake = false;
      let shouldFlash = false;
      
      const effectsToResolve = ability ? ability.effects : [{ type: EffectType.DAMAGE, diceCount: 1, diceSides: 8, damageType: actor.stats.attackDamageType || DamageType.SLASHING }];

      targets.forEach(target => {
          const res = ActionResolver.resolve(actor, target, effectsToResolve, dimension, ability?.school);
          newEntities = applyResolutionToEntities(res, actor, target, newEntities);
          
          if (res.hpChange < -15 || res.transformation || res.popups.some(p => p.isCrit)) {
              shouldShake = true;
          }
          if (res.popups.some(p => p.isCrit)) {
              shouldFlash = true;
              sfx.playCrit();
          }

          allPopups.push(...res.popups.map(p => ({ 
              ...p, id: generateId(), 
              position: [target.position.x, 2, target.position.y], 
              timestamp: Date.now() 
          })));

          if (res.didHit) sfx.playHit();
          if (res.transformation) sfx.playMagic();

          const updatedTarget = newEntities.find(e => e.id === target.id);
          if (updatedTarget?.stats.hp === 0 && updatedTarget.type === 'ENEMY') get().spawnLootDrop(updatedTarget);
          
          const actionName = ability ? ability.name : "Ataque";
          if (res.hpChange < 0) get().addLog(`${actor.name} lanza ${actionName} contra ${target.name}: ${Math.abs(res.hpChange)} Daño.`, "combat");
          else if (res.hpChange > 0) get().addLog(`${actor.name} cura a ${target.name}: ${res.hpChange} HP.`, "info");
      });

      newEntities = newEntities.map(e => {
          if (e.id === actor.id) {
              if (selectedAction === BattleAction.MAGIC) return { ...e, stats: { ...e.stats, spellSlots: { ...e.stats.spellSlots, current: e.stats.spellSlots.current - 1 } } };
              if (selectedAction === BattleAction.SKILL) return { ...e, stats: { ...e.stats, stamina: e.stats.stamina - (ability?.staminaCost || 0) } };
          }
          return e;
      });

      set({ 
          battleEntities: newEntities,
          damagePopups: [...get().damagePopups, ...allPopups],
          isActionAnimating: false, activeSpellEffect: null, hasActed: true, 
          remainingActions: state.remainingActions - 1, selectedAction: null, selectedSpell: null, selectedSkill: null,
          isScreenShaking: shouldShake,
          isScreenFlashing: shouldFlash
      });

      if (shouldShake) setTimeout(() => set({ isScreenShaking: false }), 400);
      if (shouldFlash) setTimeout(() => set({ isScreenFlashing: false }), 150);

      get().checkAutoEndTurn();
  },

  handleTileInteraction: async (x, z) => {
      const state = get();
      if (state.gameState !== GameState.BATTLE_TACTICAL || state.isActionAnimating) return;
      const activeId = state.turnOrder[state.currentTurnIndex];
      const actor = state.battleEntities.find(e => e.id === activeId);
      if (!actor || actor.type !== 'PLAYER') return;

      const { selectedAction, selectedSpell, selectedSkill, hasMoved, lootDrops, battleMap } = state;

      const dropAtPos = lootDrops.find(d => d.position.x === x && d.position.y === z);
      if (dropAtPos) {
          const dist = Math.max(Math.abs(actor.position.x - x), Math.abs(actor.position.y - z));
          if (dist === 0) { get().collectLoot(dropAtPos.id); return; }
          if (dist <= 1 && !hasMoved) { 
              set({ battleEntities: state.battleEntities.map(e => e.id === actor.id ? { ...e, position: { x, y: z } } : e), hasMoved: true, selectedAction: null });
              get().collectLoot(dropAtPos.id); get().checkAutoEndTurn(); return;
          }
      }

      if (selectedAction === BattleAction.MOVE && !hasMoved) {
          const moveSteps = Math.floor((actor.stats.speed || 30) / 5);
          const occupied = new Set(state.battleEntities.filter(e => e.id !== actor.id && e.stats.hp > 0).map(e => `${e.position.x},${e.position.y}`));
          const reachable = getReachableTiles({x: actor.position.x, y: actor.position.y}, moveSteps, battleMap || [], occupied, actor.stats.class, actor.stats.movementType);
          
          if (reachable.some(p => p.x === x && p.y === z)) {
              set({ battleEntities: state.battleEntities.map(e => e.id === actor.id ? { ...e, position: { x, y: z } } : e), hasMoved: true, selectedAction: null });
              sfx.playStep(); get().checkAutoEndTurn();
          }
          return;
      }

      if ((selectedAction === BattleAction.MAGIC || selectedAction === BattleAction.SKILL) && (selectedSpell || selectedSkill)) {
          const ability = selectedSpell || selectedSkill;
          const dist = Math.max(Math.abs(actor.position.x - x), Math.abs(actor.position.y - z));
          
          if (dist <= ability.range) {
              const targets = ability.aoeRadius 
                ? state.battleEntities.filter(e => {
                    const d = Math.sqrt(Math.pow(e.position.x - x, 2) + Math.pow(e.position.y - z, 2));
                    return d <= ability.aoeRadius && e.stats.hp > 0;
                  })
                : state.battleEntities.filter(e => e.position.x === x && e.position.y === z && e.stats.hp > 0);

              if (targets.length === 0 && !ability.aoeRadius) return;
              get().executeAction(actor, targets, ability);
          }
          return;
      }

      const target = state.battleEntities.find(e => e.position.x === x && e.position.y === z && e.stats.hp > 0);
      if (target && target.type === 'ENEMY' && selectedAction === BattleAction.ATTACK && state.remainingActions > 0) {
          const range = getAttackRange(actor);
          const dist = Math.max(Math.abs(actor.position.x - x), Math.abs(actor.position.y - z));
          if (dist <= range) {
              get().executeAction(actor, [target]);
          }
      }
  },

  advanceTurn: async () => {
      const state = get();
      const alivePlayers = state.battleEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);
      const aliveEnemies = state.battleEntities.filter(e => e.type === 'ENEMY' && e.stats.hp > 0);

      if (alivePlayers.length === 0) { set({ gameState: GameState.BATTLE_DEFEAT }); return; }
      if (aliveEnemies.length === 0) {
          const totalXp = state.battleEntities.filter(e => e.type === 'ENEMY').reduce((acc, curr) => acc + (curr.stats.xpReward || 50), 0);
          set({ gameState: GameState.BATTLE_VICTORY, battleRewards: { ...state.battleRewards, xp: totalXp } });
          sfx.playVictory(); return;
      }

      let nextIdx = (state.currentTurnIndex + 1) % state.turnOrder.length;
      while (state.battleEntities.find(e => e.id === state.turnOrder[nextIdx])?.stats.hp <= 0) { 
          nextIdx = (nextIdx + 1) % state.turnOrder.length; 
      }
      
      const nextEnt = state.battleEntities.find(e => e.id === state.turnOrder[nextIdx]);
      
      const updatedEntities = state.battleEntities.map(e => {
          if (e.id === nextEnt?.id) {
              const nextStatus = (e.stats.activeStatusEffects || [])
                  .map(s => ({ ...s, duration: s.duration - 1 }))
                  .filter(s => s.duration > 0);
              let hpMod = 0;
              if (e.stats.activeStatusEffects?.some(s => s.type === StatusEffectType.POISON)) hpMod -= 2;
              if (e.stats.activeStatusEffects?.some(s => s.type === StatusEffectType.BURN)) hpMod -= 3;
              
              return { ...e, stats: { ...e.stats, hp: Math.max(0, e.stats.hp + hpMod), activeStatusEffects: nextStatus } };
          }
          return e;
      });

      set({ 
          battleEntities: updatedEntities,
          currentTurnIndex: nextIdx, 
          hasMoved: false, hasActed: false, 
          remainingActions: nextEnt?.stats.maxActions || 1, 
          selectedAction: null, selectedSpell: null, selectedSkill: null, isUnitMenuOpen: false 
      });

      if (nextEnt?.type === 'ENEMY') setTimeout(() => get().performEnemyTurn(), 800);
  },

  performEnemyTurn: async () => {
      const state = get();
      const actor = state.battleEntities.find(e => e.id === state.turnOrder[state.currentTurnIndex]);
      if (!actor || actor.stats.hp <= 0 || actor.type !== 'ENEMY') { get().advanceTurn(); return; }
      
      const players = state.battleEntities.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);
      let target = players.sort((a,b) => (Math.abs(actor.position.x - a.position.x) + Math.abs(actor.position.y - a.position.y)) - (Math.abs(actor.position.x - b.position.x) + Math.abs(actor.position.y - b.position.y)))[0];
      if (!target) { get().advanceTurn(); return; }

      const dist = Math.max(Math.abs(actor.position.x - target.position.x), Math.abs(actor.position.y - target.position.y));
      const range = getAttackRange(actor);

      if (dist <= range) {
          get().executeAction(actor, [target]);
          setTimeout(() => get().advanceTurn(), 1600);
      } else {
          const occupied = new Set(state.battleEntities.filter(e => e.stats.hp > 0 && e.id !== actor.id).map(e => `${e.position.x},${e.position.y}`));
          const path = findBattlePath({ x: actor.position.x, y: actor.position.y }, { x: target.position.x, y: target.position.y }, state.battleMap || [], occupied);
          if (path && path.length > 1) {
              const moveSteps = Math.floor((actor.stats.speed || 30) / 5);
              const nextPos = path[Math.min(moveSteps, path.length - 2)];
              set({ battleEntities: state.battleEntities.map(e => e.id === actor.id ? { ...e, position: { x: nextPos.x, y: nextPos.z } } : e) });
              sfx.playStep();
          }
          setTimeout(() => get().advanceTurn(), 600);
      }
  },

  startBattle: (terrain, weather, enemyId) => {
      const contentState = useContentStore.getState();
      const grid = [];
      for(let x=0; x<16; x++) {
          for(let z=0; z<16; z++) {
              const tileInfo = (terrain === TerrainType.DUNGEON_FLOOR) ? { color: '#262626', movementCost: 1 } : { color: TERRAIN_COLORS[terrain] || '#444', movementCost: (terrain === TerrainType.SWAMP || terrain === TerrainType.MOUNTAIN) ? 2 : 1 };
              grid.push({ x, z, height: 1, offsetY: 0, color: tileInfo.color, textureUrl: "", isObstacle: false, blocksSight: false, movementCost: tileInfo.movementCost });
          }
      }
      const entities = get().party.map((p, i) => ({ ...p, position: { x: 4 + (i % 2), y: 6 + Math.floor(i / 2) } }));
      const encounterList = contentState.encounters[terrain] || ['goblin_spearman'];
      const enemyCount = enemyId ? 1 : Math.min(4, Math.floor(get().party.length * 1.2));
      for(let i=0; i < enemyCount; i++) {
          const defId = enemyId || encounterList[Math.floor(Math.random() * encounterList.length)];
          const def = contentState.enemies[defId] || contentState.enemies['goblin_spearman'];
          entities.push({ id: `enemy_${i}_${generateId()}`, defId, name: def.name, type: 'ENEMY', stats: calculateEnemyStats(def, get().party[0].stats.level, get().difficulty || Difficulty.NORMAL), visual: { color: '#ef4444', modelType: 'billboard', spriteUrl: def.sprite.startsWith('http') ? def.sprite : `${WESNOTH_BASE_URL}/${def.sprite}` }, position: { x: 11 - (i % 2), y: 6 + Math.floor(i / 2) }, aiBehavior: def.aiBehavior || AIBehavior.BASIC_MELEE });
      }
      set({ battleEntities: entities, battleMap: grid, turnOrder: entities.map(e => e.id).sort((a,b) => (entities.find(x => x.id === b).stats.initiativeBonus + rollDice(20)) - (entities.find(x => x.id === a).stats.initiativeBonus + rollDice(20))), currentTurnIndex: 0, gameState: GameState.BATTLE_INIT, hasMoved: false, hasActed: false, remainingActions: 1, damagePopups: [], lootDrops: [], battleRewards: { xp: 0, gold: 0, items: [] } });
  },

  confirmBattle: () => set({ gameState: GameState.BATTLE_TACTICAL }),
  executeWait: () => get().advanceTurn(),
  handleTileHover: (x, z) => set({ selectedTile: { x, z } }),
  removeDamagePopup: (id) => set(s => ({ damagePopups: s.damagePopups.filter(p => p.id !== id) })),
  restartBattle: () => get().quitToMenu(),
  collectLoot: (id) => {
      const state = get(); const drop = state.lootDrops.find(d => d.id === id); if (!drop) return;
      sfx.playVictory(); drop.items.forEach(item => get().addItem(item, 1)); get().addGold(drop.gold);
      get().addLog(`Obtenido ${drop.gold} Oro y ${drop.items.length} objetos.`, "info");
      set({ battleRewards: { ...state.battleRewards, gold: state.battleRewards.gold + drop.gold, items: [...state.battleRewards.items, ...drop.items] }, lootDrops: state.lootDrops.filter(d => d.id !== id) });
  },
  continueAfterVictory: () => {
    const state = get(); const { party, battleRewards } = state;
    let leveledUpAny = false;
    const updatedParty = party.map(member => {
        const bEnt = state.battleEntities.find(e => e.id === member.id);
        const currentHp = bEnt ? bEnt.stats.hp : member.stats.hp;
        const newXp = (member.stats.xp || 0) + battleRewards.xp;
        if (newXp >= (member.stats.xpToNextLevel || 300)) leveledUpAny = true;
        return { ...member, stats: { ...member.stats, xp: newXp, hp: Math.max(1, currentHp) } };
    });
    set({ party: updatedParty, gameState: leveledUpAny ? GameState.LEVEL_UP : GameState.OVERWORLD, battleRewards: { xp: 0, gold: 0, items: [] }, lootDrops: [] });
  },
  inspectUnit: (id) => set({ inspectedEntityId: id }),
  closeInspection: () => set({ inspectedEntityId: null })
});
