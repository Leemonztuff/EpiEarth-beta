
// @ts-nocheck
import { StateCreator } from 'zustand';
import { 
    GameState, TerrainType, WeatherType, BattleCell, BattleAction, Entity, 
    CombatStatsComponent, PositionComponent, DamagePopup, SpellEffectData, SpellType, 
    CharacterClass, VisualComponent, AIBehavior, LootDrop, ItemRarity, Item, 
    EquipmentSlot, Dimension, InventorySlot, CharacterRace, DamageType, Ability, TileEffectType, Skill, Spell, CreatureType, Difficulty, EffectType
} from '../../types';
import { findBattlePath, getReachableTiles } from '../../services/pathfinding';
import { rollDice, calculateEnemyStats, getAoETiles } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';
import { TERRAIN_COLORS, ASSETS, WESNOTH_BASE_URL } from '../../constants';
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
                  