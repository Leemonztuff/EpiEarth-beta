

export enum TerrainType {
    GRASS = 'GRASS', PLAINS = 'PLAINS', FOREST = 'FOREST', JUNGLE = 'JUNGLE', MOUNTAIN = 'MOUNTAIN',
    WATER = 'WATER', OCEAN = 'OCEAN', CASTLE = 'CASTLE', VILLAGE = 'VILLAGE', DESERT = 'DESERT',
    SWAMP = 'SWAMP', RUINS = 'RUINS', ANCIENT_MONUMENT = 'ANCIENT_MONUMENT', TUNDRA = 'TUNDRA',
    TAIGA = 'TAIGA', COBBLESTONE = 'COBBLESTONE', DIRT_ROAD = 'DIRT_ROAD', STONE_FLOOR = 'STONE_FLOOR',
    CAVE_FLOOR = 'CAVE_FLOOR', DUNGEON_FLOOR = 'DUNGEON_FLOOR', FUNGUS = 'FUNGUS', LAVA = 'LAVA',
    CHASM = 'CHASM', VOID = 'VOID', SAVANNAH = 'SAVANNAH', WASTELAND = 'WASTELAND', BADLANDS = 'BADLANDS'
}

export enum CharacterClass {
    FIGHTER = 'FIGHTER', RANGER = 'RANGER', WIZARD = 'WIZARD', CLERIC = 'CLERIC',
    ROGUE = 'ROGUE', BARBARIAN = 'BARBARIAN', PALADIN = 'PALADIN', SORCERER = 'SORCERER',
    WARLOCK = 'WARLOCK', DRUID = 'DRUID', BARD = 'BARD'
}

export enum CharacterRace {
    HUMAN = 'HUMAN', ELF = 'ELF', DWARF = 'DWARF', HALFLING = 'HALFLING',
    DRAGONBORN = 'DRAGONBORN', GNOME = 'GNOME', TIEFLING = 'TIEFLING', HALF_ORC = 'HALF_ORC'
}

export enum Ability {
    STR = 'STR', DEX = 'DEX', CON = 'CON', INT = 'INT', WIS = 'WIS', CHA = 'CHA'
}

export type Attributes = Record<Ability, number>;

export enum ItemRarity {
    COMMON = 'COMMON', UNCOMMON = 'UNCOMMON', RARE = 'RARE', VERY_RARE = 'VERY_RARE', LEGENDARY = 'LEGENDARY'
}

export enum MovementType {
    WALK = 'WALK', SAIL = 'SAIL', FLY = 'FLY'
}

export enum MagicSchool {
    ABJURATION = 'ABJURATION', CONJURATION = 'CONJURATION', DIVINATION = 'DIVINATION',
    ENCHANTMENT = 'ENCHANTMENT', EVOCATION = 'EVOCATION', ILLUSION = 'ILLUSION',
    NECROMANCY = 'NECROMANCY', TRANSMUTATION = 'TRANSMUTATION'
}

export enum DamageType {
    SLASHING = 'SLASHING', PIERCING = 'PIERCING', BLUDGEONING = 'BLUDGEONING',
    FIRE = 'FIRE', COLD = 'COLD', LIGHTNING = 'LIGHTNING', POISON = 'POISON',
    ACID = 'ACID', NECROTIC = 'NECROTIC', RADIANT = 'RADIANT', FORCE = 'FORCE',
    THUNDER = 'THUNDER', PSYCHIC = 'PSYCHIC', MAGIC = 'MAGIC'
}

export enum Difficulty {
    EASY = 'EASY', NORMAL = 'NORMAL', HARD = 'HARD'
}

export enum EquipmentSlot {
    MAIN_HAND = 'MAIN_HAND', OFF_HAND = 'OFF_HAND', BODY = 'BODY', HEAD = 'HEAD', FEET = 'FEET', ACCESSORY = 'ACCESSORY'
}

export enum EffectType {
    HEAL = 'HEAL', DAMAGE = 'DAMAGE', STATUS = 'STATUS', DRAIN = 'DRAIN'
}

export enum StatusEffectType {
    POISON = 'POISON', BURN = 'BURN', HASTE = 'HASTE', SLOW = 'SLOW', REGEN = 'REGEN', SHIELD = 'SHIELD', RAGE = 'RAGE'
}

export enum WeatherType {
    NONE = 'NONE', RAIN = 'RAIN', SNOW = 'SNOW', FOG = 'FOG', STORM = 'STORM'
}

export enum Dimension {
    NORMAL = 'NORMAL', UPSIDE_DOWN = 'UPSIDE_DOWN'
}

export enum GameState {
    TITLE = 'TITLE', OVERWORLD = 'OVERWORLD', TOWN_EXPLORATION = 'TOWN_EXPLORATION',
    DUNGEON = 'DUNGEON', BATTLE_INIT = 'BATTLE_INIT', BATTLE_TACTICAL = 'BATTLE_TACTICAL',
    BATTLE_VICTORY = 'BATTLE_VICTORY', BATTLE_DEFEAT = 'BATTLE_DEFEAT', DIALOGUE = 'DIALOGUE',
    LEVEL_UP = 'LEVEL_UP', SUMMONING = 'SUMMONING', TEMPLE_HUB = 'TEMPLE_HUB',
    PARTY_MANAGEMENT = 'PARTY_MANAGEMENT', GAME_WON = 'GAME_WON'
}

export enum BattleAction {
    MOVE = 'MOVE', ATTACK = 'ATTACK', WAIT = 'WAIT', ITEM = 'ITEM', SKILL = 'SKILL'
}

export enum TileEffectType {
    FIRE = 'FIRE', ACID = 'ACID', MAGIC = 'MAGIC'
}

export enum CreatureType {
    HUMANOID = 'HUMANOID', BEAST = 'BEAST', UNDEAD = 'UNDEAD', CONSTRUCT = 'CONSTRUCT', DEMON = 'DEMON', DRAGON = 'DRAGON'
}

// Fixed: Added missing POIType enum used by the Admin Dashboard and World Generator
export enum POIType {
    NONE = 'NONE', CITY = 'CITY', TOWN = 'TOWN', VILLAGE = 'VILLAGE',
    SHOP = 'SHOP', INN = 'INN', TEMPLE = 'TEMPLE', DUNGEON = 'DUNGEON',
    RUINS = 'RUINS', EXIT = 'EXIT', PORTAL = 'PORTAL', MONUMENT = 'MONUMENT'
}

// Fixed: Added missing EnemyDefinition interface to resolve module import errors in dndRules, contentStore, and WorldMapScreen
export interface EnemyDefinition {
    id: string;
    name: string;
    type: CreatureType;
    sprite: string;
    hp: number;
    ac: number;
    initiativeBonus: number;
    xpReward: number;
    resistances?: DamageType[];
    vulnerabilities?: DamageType[];
    immunities?: DamageType[];
}

export interface PositionComponent { x: number; y: number; }

export interface VisualComponent { color: string; modelType: string; spriteUrl: string; }

export interface DerivedStats {
    atk: number; def: number; mag: number; spd: number;
    crit: number; mp: number; maxMp: number; thriller: number;
}

export interface StatusEffect { type: StatusEffectType; duration: number; intensity?: number; }

export interface CombatStatsComponent {
    level: number; class: CharacterClass; race?: CharacterRace; xp: number; xpToNextLevel: number;
    hp: number; maxHp: number; stamina: number; maxStamina: number; ac: number;
    initiativeBonus: number; speed: number; movementType: MovementType;
    attributes: Attributes; baseAttributes: Attributes;
    spellSlots: { current: number; max: number };
    activeCooldowns: Record<string, number>;
    activeStatusEffects: StatusEffect[];
    resistances: DamageType[]; vulnerabilities: DamageType[]; immunities: DamageType[];
    xpReward?: number; creatureType?: CreatureType;
    knownSkills?: string[]; knownSpells?: string[]; traits?: string[];
    maxActions?: number; derived?: DerivedStats;
    attackDamageType?: DamageType; affinity?: DamageType;
}

export interface Entity {
    id: string; name: string; type: 'PLAYER' | 'ENEMY';
    equipment: Partial<Record<EquipmentSlot, Item>>;
    stats: CombatStatsComponent; visual: VisualComponent;
    position?: PositionComponent;
}

export interface ActionEffect {
    type: EffectType; damageType?: DamageType; diceCount?: number; diceSides?: number;
    fixedValue?: number; attributeScale?: Ability; statusType?: StatusEffectType;
    duration?: number; chance?: number;
}

export interface Item {
    id: string; name: string; type: string; rarity: ItemRarity; description: string;
    icon: string; equipmentStats?: { slot: EquipmentSlot; diceCount?: number; diceSides?: number; damageType?: DamageType; properties?: string[]; ac?: number };
    effect?: { type: string; fixedValue?: number };
}

export interface InventorySlot { item: Item; quantity: number; }

export interface GameLogEntry { id: string; message: string; type: 'info' | 'combat' | 'roll' | 'narrative'; timestamp: number; }

export interface SaveMetadata {
    slotIndex: number; timestamp: number;
    summary: { charName: string; level: number; class: CharacterClass; location: string };
}

export interface HexCell {
    q: number; r: number; terrain: TerrainType;
    isExplored: boolean; isVisible: boolean; weather: WeatherType;
    poiType?: string; hasPortal?: boolean; hasEncounter?: boolean;
    npcs?: NPCEntity[]; regionName?: string;
    movementType?: MovementType;
}

export interface BattleCell { 
    x: number; z: number; height: number; maxHeight: number;
    hp: number; maxHp: number; offsetY: number; color: string; 
    textureUrl: string; isObstacle: boolean; blocksSight: boolean; 
    movementCost: number; terrain: TerrainType;
    effect?: { type: TileEffectType; duration: number }; 
}

export interface Spell { id: string; name: string; description: string; school: MagicSchool; level: number; range: number; effect: ActionEffect[]; }

export interface Skill { id: string; name: string; description: string; range: number; effect: ActionEffect[]; }

export interface NPCEntity { id: string; name: string; role: string; sprite: string; dialogueNodes?: Record<string, DialogueNode>; startNodeId?: string; }

export interface DialogueNode { text: string; options: DialogueOption[]; }

export interface DialogueOption { label: string; action?: string; nextNodeId?: string; questTriggerId?: string; }

export interface Quest {
    id: string; title: string; description: string; completed: boolean; claimed?: boolean;
    type: 'MAIN' | 'SIDE'; objective: { type: string; targetId: string; count: number; current: number };
    reward: { xp: number; gold: number; items: Item[] };
}

export interface Incursion { id: string; q: number; r: number; difficulty: number; rewardShards: number; description: string; }

export interface SpellEffectData { id: string; type: 'PROJECTILE' | 'BURST'; startPos: [number, number, number]; endPos: [number, number, number]; color: string; duration: number; timestamp: number; }

export interface DamagePopup { id: string; position: [number, number, number]; amount: string | number; color: string; isCrit: boolean; timestamp: number; }

export interface LootDrop { id: string; position: PositionComponent; rarity: ItemRarity; items: Item[]; }

export interface GameStateData {
    gameState: GameState;
    dimension: Dimension;
    difficulty: Difficulty;
    exploredTiles: Record<Dimension, Set<string>>;
    visitedTowns: Set<string>;
    clearedEncounters: Set<string>;
    townMapData: HexCell[] | null;
    playerPos: PositionComponent;
    isPlayerMoving: boolean;
    lastOverworldPos: PositionComponent | null;
    mapDimensions: { width: number, height: number };
    quests: Record<string, Quest>;
    standingOnPortal: boolean;
    standingOnSettlement: boolean;
    standingOnTemple: boolean;
    standingOnDungeon: boolean;
    isMapOpen: boolean;
    isScreenShaking: boolean;
    isScreenFlashing: boolean;
    gracePeriodEndTime: number;
    supplies: number;
    fatigue: number;
    worldTime: number;
    currentRegionName: string | null;
    currentSettlementName: string | null;
    activeNarrativeEvent: any | null;
    activeIncursion: any | null;
    standingOnPort: boolean;
    inspectedEntityId: string | null;
    eternumShards: number;
}
