
import React from 'react';

export enum GameState {
  TITLE,
  CHARACTER_CREATION,
  OVERWORLD,
  TOWN_EXPLORATION,
  DUNGEON,
  BATTLE_INIT,
  BATTLE_TACTICAL,
  BATTLE_RESOLUTION,
  BATTLE_VICTORY,
  BATTLE_DEFEAT,
  LOCAL_MAP,
  LEVEL_UP,
  SUMMONING,
  TEMPLE_HUB, 
  PARTY_MANAGEMENT,
  GAME_WON,
  DIALOGUE,
  TRANSPORT_MENU
}

export enum MovementType { WALK = 'WALK', FLY = 'FLY', SWIM = 'SWIM', SAIL = 'SAIL', BURROW = 'BURROW' }

export enum TerrainType {
  GRASS = 'GRASS', PLAINS = 'PLAINS', FOREST = 'FOREST', JUNGLE = 'JUNGLE', MOUNTAIN = 'MOUNTAIN',
  WATER = 'WATER', OCEAN = 'OCEAN', CASTLE = 'CASTLE', VILLAGE = 'VILLAGE', DESERT = 'DESERT',
  SWAMP = 'SWAMP', RUINS = 'RUINS', ANCIENT_MONUMENT = 'ANCIENT_MONUMENT', TUNDRA = 'TUNDRA',
  TAIGA = 'TAIGA', COBBLESTONE = 'COBBLESTONE', DIRT_ROAD = 'DIRT_ROAD', STONE_FLOOR = 'STONE_FLOOR',
  CAVE_FLOOR = 'CAVE_FLOOR', DUNGEON_FLOOR = 'DUNGEON_FLOOR', FUNGUS = 'FUNGUS', LAVA = 'LAVA',
  CHASM = 'CHASM', VOID = 'VOID', SAVANNAH = 'SAVANNAH', WASTELAND = 'WASTELAND', BADLANDS = 'BADLANDS'
}

export enum Dimension { NORMAL = 'NORMAL', UPSIDE_DOWN = 'UPSIDE_DOWN' }
export enum WeatherType { NONE = 'NONE', RAIN = 'RAIN', SNOW = 'SNOW', FOG = 'FOG', ASH = 'ASH', RED_STORM = 'RED_STORM', SANDSTORM = 'SANDSTORM', HEATWAVE = 'HEATWAVE' }

export enum StatusEffectType {
  POISON = 'POISON', BURN = 'BURN', FREEZE = 'FREEZE', STUN = 'STUN', BLEED = 'BLEED',
  REGEN = 'REGEN', HASTE = 'HASTE', SHIELD = 'SHIELD', RAGE = 'RAGE', SLOW = 'SLOW',
  HUNGRY = 'HUNGRY', EXHAUSTED = 'EXHAUSTED'
}

export enum Difficulty { EASY = 'EASY', NORMAL = 'NORMAL', HARD = 'HARD' }
export enum CreatureType { HUMANOID = 'Humanoid', BEAST = 'Beast', UNDEAD = 'Undead', CONSTRUCT = 'Construct', CELESTIAL = 'Celestial', FIEND = 'Fiend', DRAGON = 'Dragon', MONSTROSITY = 'Monstrosity' }
export enum MagicSchool { ABJURATION = 'Abjuration', CONJURATION = 'Conjuration', DIVINATION = 'Divination', ENCHANTMENT = 'Enchantment', EVOCATION = 'Evocation', ILLUSION = 'Illusion', NECROMANCY = 'Necromancy', TRANSMUTATION = 'Transmutation' }
export enum SpellType { DAMAGE = 'DAMAGE', HEAL = 'HEAL', BUFF = 'BUFF', DEBUFF = 'DEBUFF', UTILITY = 'UTILITY' }
export enum EffectType { DAMAGE = 'DAMAGE', HEAL = 'HEAL', STATUS = 'STATUS', BUFF = 'BUFF', DEBUFF = 'DEBUFF', TRANSFORM = 'TRANSFORM', DRAIN = 'DRAIN' }

export interface Attributes { STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number; }
export interface PositionComponent { x: number; y: number; }
export interface VisualComponent { color: string; modelType: 'billboard' | 'voxel'; spriteUrl: string; }
export interface DerivedStats { atk: number; def: number; mag: number; spd: number; crit: number; mp: number; maxMp: number; }
export interface StatusEffect { type: StatusEffectType; duration: number; intensity: number; }

export interface CombatStatsComponent { 
    level: number; class: CharacterClass; race?: CharacterRace; creatureType?: CreatureType; 
    xp: number; xpToNextLevel: number; hp: number; maxHp: number; stamina: number; maxStamina: number; 
    ac: number; initiativeBonus: number; speed: number; movementType: MovementType;
    attributes: Attributes; baseAttributes: Attributes; spellSlots: { current: number, max: number }; 
    corruption?: number; activeCooldowns: Record<string, number>; activeStatusEffects: StatusEffect[]; 
    resistances: DamageType[]; vulnerabilities: DamageType[]; immunities: DamageType[]; 
    attackDamageType?: DamageType; knownSpells?: string[]; knownSkills?: string[]; maxActions?: number;
    traits?: string[]; derived: DerivedStats; xpReward?: number;
    originalStats?: any; originalVisual?: any; rarity?: ItemRarity; affinity?: DamageType;
}

export enum CharacterClass { FIGHTER = 'FIGHTER', RANGER = 'RANGER', WIZARD = 'WIZARD', CLERIC = 'CLERIC', ROGUE = 'ROGUE', BARBARIAN = 'BARBARIAN', PALADIN = 'PALADIN', SORCERER = 'SORCERER', WARLOCK = 'WARLOCK', DRUID = 'DRUID', BARD = 'BARD' }
export enum CharacterRace { HUMAN = 'Human', ELF = 'Elf', DWARF = 'Dwarf', HALFLING = 'Halfling', DRAGONBORN = 'Dragonborn', GNOME = 'Gnome', TIEFLING = 'Tiefling', HALF_ORC = 'Half-Orc' }

export interface Entity { id: string; name: string; type: 'PLAYER' | 'ENEMY' | 'NPC'; stats: CombatStatsComponent; visual: VisualComponent; position?: PositionComponent; equipment?: Record<string, Item>; defId?: string; aiBehavior?: AIBehavior; }

export enum EquipmentSlot { MAIN_HAND = 'main_hand', OFF_HAND = 'off_hand', BODY = 'body' }
export enum ItemRarity { COMMON='Common', UNCOMMON='Uncommon', RARE='Rare', VERY_RARE='Very Rare', LEGENDARY='Legendary' }
export enum EquipmentItemType { EQUIPMENT = 'equipment', CONSUMABLE = 'consumable', KEY = 'key' }
export enum DamageType { SLASHING='Slashing', PIERCING='Piercing', BLUDGEONING='Bludgeoning', FIRE='Fire', COLD='Cold', LIGHTNING='Lightning', POISON='Poison', ACID='Acid', NECROTIC='Necrotic', RADIANT='Radiant', FORCE='Force', THUNDER='Thunder', PSYCHIC='Psychic', MAGIC='Magic' }
export enum Ability { STR='STR', DEX='DEX', CON='CON', INT='INT', WIS='WIS', CHA='CHA' }
export enum BattleAction { MOVE='MOVE', ATTACK='ATTACK', MAGIC='MAGIC', SKILL='SKILL', ITEM='ITEM', WAIT='WAIT' }

export interface Item { 
    id: string; name: string; type: 'equipment' | 'consumable' | 'key'; 
    rarity: ItemRarity; description: string; icon: string; 
    effect?: ActionEffect; // Integración con el motor de efectos
    equipmentStats?: {
        slot: EquipmentSlot;
        ac?: number;
        diceCount?: number;
        diceSides?: number;
        damageType?: DamageType;
        properties?: string[];
    }; 
}

export interface InventorySlot { item: Item; quantity: number; }
export interface GameLogEntry { id: string; message: string; type: 'info' | 'combat' | 'roll' | 'levelup' | 'narrative'; timestamp: number; }

export interface ActionEffect {
  type: EffectType;
  damageType?: DamageType;
  diceCount?: number;
  diceSides?: number;
  fixedValue?: number;
  attributeScale?: Ability;
  statusType?: StatusEffectType;
  duration?: number;
  chance?: number;
  summonDefId?: string;
}

export interface Spell {
  id: string; name: string; level: number; range: number; 
  school: MagicSchool; type: SpellType; effects: ActionEffect[]; 
  description: string; animation: string; icon: string; color?: string; 
  aoeRadius?: number; aoeType?: 'CIRCLE' | 'CONE';
  // Fallbacks for Admin Dashboard
  diceCount?: number;
  diceSides?: number;
  damageType?: DamageType;
}

export interface Skill {
  id: string; name: string; description: string; staminaCost: number; 
  cooldown: number; range: number; effects: ActionEffect[]; 
  aoeRadius?: number; aoeType?: 'CIRCLE' | 'CONE'; icon: string;
  // Fallbacks for Admin Dashboard
  effect?: string;
  damageMultiplier?: number;
}

export interface HexCell {
  q: number; r: number; terrain: TerrainType; height?: number; 
  weather: WeatherType; isExplored: boolean; isVisible: boolean;
  hasPortal?: boolean; hasEncounter?: boolean; movementType?: MovementType;
  poiType?: 'VILLAGE' | 'CASTLE' | 'RUINS' | 'SHOP' | 'INN' | 'PLAZA' | 'EXIT' | 'TEMPLE' | 'DUNGEON' | 'RAID_ENCOUNTER' | 'PORT' | 'MONUMENT'; 
  regionName?: string; encounterId?: string;
}

export interface Quest { id: string; title: string; description: string; completed: boolean; type: 'MAIN' | 'SIDE'; }
export interface EnemyDefinition { id: string; name: string; type: CreatureType; sprite: string; hp: number; ac: number; xpReward: number; damage: number; initiativeBonus: number; attackDamageType?: DamageType; resistances?: DamageType[]; vulnerabilities?: DamageType[]; immunities?: DamageType[]; lootTable?: { itemId: string, chance: number }[]; validDimensions?: Dimension[]; aiBehavior?: AIBehavior; }

export interface BattleCell { x: number; z: number; height: number; offsetY: number; color: string; textureUrl: string; isObstacle: boolean; blocksSight: boolean; movementCost: number; }

export interface ProgressionNode {
  level: number; featureName?: string; unlocksSpell?: string; unlocksSkill?: string; passiveEffect?: string;
  choices?: { id: string; featureName: string; description?: string; unlocksSkill?: string; unlocksSpell?: string; passiveEffect?: string; magicSchool?: MagicSchool; }[];
  description?: string; magicSchool?: MagicSchool;
}

export interface GameStateData {
    gameState: GameState; dimension: Dimension; difficulty: Difficulty;
    exploredTiles: Record<Dimension, Set<string>>; visitedTowns: Set<string>;
    clearedEncounters: Set<string>; townMapData: HexCell[] | null;
    playerPos: PositionComponent; isPlayerMoving: boolean;
    lastOverworldPos: PositionComponent | null; mapDimensions: { width: number; height: number };
    quests: Quest[]; standingOnPortal: boolean; standingOnSettlement: boolean;
    standingOnTemple: boolean; standingOnDungeon: boolean; isMapOpen: boolean;
    gracePeriodEndTime: number; supplies: number; fatigue: number; worldTime: number; 
    currentRegionName: string | null; activeNarrativeEvent: any | null; activeIncursion: any | null;
    standingOnPort: boolean;
    inspectedEntityId: string | null;
}

export interface DamagePopup { id: string; position: [number, number, number]; amount: string | number; color: string; isCrit: boolean; timestamp: number; damageType?: DamageType; }
export interface SpellEffectData { id: string; type: string; startPos: [number, number, number]; endPos: [number, number, number]; color: string; duration: number; timestamp: number; }
export interface LootDrop { id: string; position: { x: number, y: number }; items: Item[]; gold: number; rarity: ItemRarity; }

export enum AIBehavior { BASIC_MELEE = 'BASIC_MELEE', ARCHER = 'ARCHER', CASTER = 'CASTER', BOSS_LICH = 'BOSS_LICH' }

/**
 * Metadata for a saved game slot.
 */
export interface SaveMetadata {
  slotIndex: number;
  timestamp: number;
  summary: {
    charName: string;
    level: number;
    class: CharacterClass;
    location: string;
  };
}
