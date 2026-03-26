export enum TerrainType {
    GRASS = 'GRASS', PLAINS = 'PLAINS', FOREST = 'FOREST', JUNGLE = 'JUNGLE', MOUNTAIN = 'MOUNTAIN',
    WATER = 'WATER', OCEAN = 'OCEAN', CASTLE = 'CASTLE', VILLAGE = 'VILLAGE', DESERT = 'DESERT',
    SWAMP = 'SWAMP', RUINS = 'RUINS', ANCIENT_MONUMENT = 'ANCIENT_MONUMENT', TUNDRA = 'TUNDRA',
    TAIGA = 'TAIGA', COBBLESTONE = 'COBBLESTONE', DIRT_ROAD = 'DIRT_ROAD', STONE_FLOOR = 'STONE_FLOOR',
    CAVE_FLOOR = 'CAVE_FLOOR', DUNGEON_FLOOR = 'DUNGEON_FLOOR', FUNGUS = 'FUNGUS', LAVA = 'LAVA',
    CHASM = 'CHASM', VOID = 'VOID', SAVANNAH = 'SAVANNAH', WASTELAND = 'WASTELAND', BADLANDS = 'BADLANDS'
}

export enum CharacterClass {
    NOVICE = 'NOVICE',
    FIGHTER = 'FIGHTER', RANGER = 'RANGER', WIZARD = 'WIZARD', CLERIC = 'CLERIC',
    ROGUE = 'ROGUE', BARBARIAN = 'BARBARIAN', PALADIN = 'PALADIN', SORCERER = 'SORCERER',
    WARLOCK = 'WARLOCK', DRUID = 'DRUID', BARD = 'BARD'
}

export enum ClassBranch {
    WARRIOR = 'WARRIOR',    // Fighter, Paladin, Barbarian
    MAGE = 'MAGE',          // Wizard, Sorcerer, Warlock
    ROGUE = 'ROGUE',       // Ranger, Rogue, Bard
    CLERIC = 'CLERIC'       // Cleric, Druid
}

export enum EvolutionStage {
    NOVICE = 'NOVICE',
    FIRST = 'FIRST',        // Level 5 - Class branch
    SECOND = 'SECOND',     // Level 15 - Subclass
    THIRD = 'THIRD',       // Level 25 - Advanced class
    MASTER = 'MASTER'      // Level 30 - Max level
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
    POISON = 'POISON', BURN = 'BURN', HASTE = 'HASTE', SLOW = 'SLOW', REGEN = 'REGEN', 
    SHIELD = 'SHIELD', RAGE = 'RAGE', BLEED = 'BLEED', STUN = 'STUN', 
    FREEZE = 'FREEZE', PARALYSIS = 'PARALYSIS', CONFUSION = 'CONFUSION',
    BLIND = 'BLIND', SILENCE = 'SILENCE', VULNERABLE = 'VULNERABLE', 
    FRIGHTENED = 'FRIGHTENED', CHARMED = 'CHARMED', STORAGE = 'STORAGE'
}

export enum WeatherType {
    NONE = 'NONE', RAIN = 'RAIN', SNOW = 'SNOW', FOG = 'FOG', STORM = 'STORM'
}

export enum Dimension {
    NORMAL = 'NORMAL', UPSIDE_DOWN = 'UPSIDE_DOWN'
}

export enum GameState {
    TITLE = 'TITLE', OVERWORLD = 'OVERWORLD', TOWN_EXPLORATION = 'TOWN_EXPLORATION',
    DUNGEON = 'DUNGEON', DIALOGUE = 'DIALOGUE',
    LEVEL_UP = 'LEVEL_UP', SUMMONING = 'SUMMONING', TEMPLE_HUB = 'TEMPLE_HUB',
    PARTY_MANAGEMENT = 'PARTY_MANAGEMENT', GAME_WON = 'GAME_WON',
    EXPLORATION_3D = 'EXPLORATION_3D', ENCOUNTER = 'ENCOUNTER', BATTLE_VERSUS = 'BATTLE_VERSUS'
}

export enum TrapType {
    SPIKE = 'SPIKE', FIRE = 'FIRE', ICE = 'ICE', POISON = 'POISON',
    EXPLOSIVE = 'EXPLOSIVE', STUN = 'STUN', TELEPORT = 'TELEPORT',
    DECOY = 'DECOY', TRAP_DOOR = 'TRAP_DOOR', ALARM = 'ALARM'
}

export enum EnemyAiState {
    PATROL = 'PATROL',
    CHASE = 'CHASE',
    INVESTIGATE = 'INVESTIGATE',
    STUNNED = 'STUNNED',
    DECOYED = 'DECOYED'
}

export type InputMode = 'mobile' | 'desktop';

export type EncounterReturnPolicy = 'RETURN_TO_OVERWORLD' | 'RETURN_TO_TRAP_HUNT';
export type EncounterLossPolicy = 'DROP_LOOT' | 'LIGHT_PENALTY' | 'NONE';
export type PoiStateTag = 'Dormant' | 'Active' | 'Contested' | 'Collapsing';
export type Mode3DState = 'FREE_MOVE' | 'TACTICAL_PAUSE' | 'TRAP_AIM' | 'ENEMY_REACT' | 'CONTACT_RESOLVE' | 'ROOM_RESULT';
export type CameraMode = 'OVER_SHOULDER' | 'TACTICAL_ZOOM' | 'CINEMATIC';
export type DoorState = 'closed' | 'open' | 'locked';

export type DungeonRoomObjectiveType =
    | 'clear'
    | 'survive_n_rounds'
    | 'disarm_trap'
    | 'investigate'
    | 'elite_contact';

export interface DungeonRoomDefinition {
    id: string;
    objective: DungeonRoomObjectiveType;
    label: string;
    isSecret?: boolean;
    elite?: boolean;
}

export interface DungeonRoomNode {
    id: string;
    label: string;
    objective: DungeonRoomObjectiveType;
    biomeTag?: string;
    isSecret?: boolean;
    elite?: boolean;
    neighbors: string[];
}

export interface DungeonDoorConnection {
    id: string;
    fromRoomId: string;
    toRoomId: string;
    state: DoorState;
    blocksLineOfSight: boolean;
}

export interface DungeonRoomGraph {
    rooms: Record<string, DungeonRoomNode>;
    doors: Record<string, DungeonDoorConnection>;
    entryRoomId: string;
}

export interface DungeonTimelineEvent {
    id: string;
    day: number;
    label: string;
    threatDelta: number;
    lootPenalty: number;
    factionControl?: string;
    twist?: string;
}

export interface DungeonBlueprint {
    id: string;
    name: string;
    hook: string;
    twist: string;
    rooms: DungeonRoomDefinition[];
    timelineEvents: DungeonTimelineEvent[];
}

export interface DungeonRuntimeState {
    dungeonId: string;
    blueprintId: string;
    lastSyncedWorldDay: number;
    threatLevel: number;
    factionControl: string;
    timelineDay: number;
    resolvedRooms: string[];
    discoveredSecrets: string[];
    remainingLootTier: number;
    activeTwists: string[];
    nextTimelineEventIndex: number;
    roomCursor: number;
    stateTag: PoiStateTag;
    roomStates: Record<string, 'unseen' | 'active' | 'resolved'>;
    doorStates: Record<string, DoorState>;
    discoveredRooms: string[];
    activeRoomId: string | null;
    roomGraph: DungeonRoomGraph | null;
}

export interface ZoneContext {
    kind: 'biome' | 'dungeon';
    poiId?: string;
    tier?: number;
    twistSeed?: string;
    blueprintId?: string;
    layoutVariantSeed?: string;
    entryRoomId?: string;
}

export interface EncounterContext {
    sourceMode: GameState;
    originTile: PositionComponent | null;
    enemyId: string | null;
    returnPolicy: EncounterReturnPolicy;
    lossPolicy: EncounterLossPolicy;
}

export type TacticalAction =
    | { type: 'MoveStep'; dx: number; dz: number }
    | { type: 'MoveToTile'; x: number; z: number }
    | { type: 'ToggleTacticalPause'; forced?: boolean }
    | { type: 'SelectTrap'; trapType: TrapType | null }
    | { type: 'PlaceTrap'; x: number; z: number; trapType?: TrapType }
    | { type: 'EnterTrapAim' }
    | { type: 'AimTrapAt'; x: number; z: number }
    | { type: 'ConfirmTrapPlacement' }
    | { type: 'CancelTrapAim' }
    | { type: 'OpenDoor'; doorId: string }
    | { type: 'ToggleMinimap' }
    | { type: 'SetCameraMode'; cameraMode: CameraMode }
    | { type: 'ExitTrapZone' };

export type EncounterOutcomeType = 'VICTORY' | 'DEFEAT' | 'FLEE';

export interface EncounterOutcome {
    type: EncounterOutcomeType;
    enemyId?: string | null;
}

export interface TacticalUiState {
    zoneName: string;
    message: string | null;
    blockReason: string | null;
    inputHints: string[];
    turnStep: number;
    trapCount: number;
    maxTraps: number;
    enemyCount: number;
    selectedTrapType: TrapType | null;
    selectedTrapRange: number | null;
    tacticalPaused: boolean;
    placementMode: boolean;
    objectiveLabel: string | null;
    riskLabel: string | null;
    timelineLabel: string | null;
    twistLabel: string | null;
    poiStateTag: PoiStateTag | null;
    mode3DState?: Mode3DState;
    currentRoomId?: string | null;
    stepBudget?: number;
}

export interface Trap {
    id: string;
    type: TrapType;
    position: { x: number; y: number; z: number };
    isArmed: boolean;
    isTriggered: boolean;
    ownerId?: string;
    damage?: number;
    duration?: number;
    description: string;
}

export interface VersusBattleState {
    playerEntity: Entity;
    enemyEntity: Entity;
    playerHp: number;
    playerMaxHp: number;
    enemyHp: number;
    enemyMaxHp: number;
    turn: 'PLAYER' | 'ENEMY';
    phase: 'SELECT' | 'ANIMATION' | 'DAMAGE' | 'END';
    selectedAction: BattleAction | null;
    selectedSkill: string | null;
    animationQueue: BattleAnimation[];
    cameraEffect: CameraEffect;
    screenShake: number;
    zoomLevel: number;
}

export interface BattleAnimation {
    type: 'ATTACK' | 'SKILL' | 'ITEM' | 'DAMAGE' | 'HEAL' | 'STATUS' | 'ENTER' | 'FLEE';
    attacker: 'PLAYER' | 'ENEMY';
    target: 'PLAYER' | 'ENEMY';
    skillId?: string;
    damage?: number;
    heal?: number;
    duration: number;
    particleEffects?: ParticleEffect[];
}

export interface ParticleEffect {
    type: 'fire' | 'ice' | 'lightning' | 'smoke' | 'blood' | 'sparkle' | 'explosion';
    position: { x: number; y: number };
    duration: number;
}

export type CameraEffect = 
    | 'NONE' | 'ZOOM_IN' | 'ZOOM_OUT' | 'SHAKE' | 'SLAM' | 'FLASH' | 
    'PARALLAX_LEFT' | 'PARALLAX_RIGHT' | 'ROTATE' | 'PULSE';

export enum BattleAction {
    MOVE = 'MOVE', ATTACK = 'ATTACK', WAIT = 'WAIT', ITEM = 'ITEM', SPELL = 'SPELL', SKILL = 'SKILL', FLEE = 'FLEE'
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
    evolutionStage?: EvolutionStage; branch?: ClassBranch;
    corruption?: number;
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

export interface OverworldEnemy { id: string; q: number; r: number; spriteUrl: string; }

export interface HexCell {
    q: number; r: number; terrain: TerrainType;
    baseTerrain?: TerrainType;
    overlayTerrain?: TerrainType | null;
    isExplored: boolean; isVisible: boolean; weather: WeatherType;
    poiType?: string; hasPortal?: boolean; hasEncounter?: boolean;
    poiId?: string;
    poiTier?: number;
    poiStateTag?: PoiStateTag;
    biomeTag?: string;
    npcs?: NPCEntity[]; regionName?: string;
    movementType?: MovementType;
    // new fields for rendering features and overworld enemies
    feature?: 'tree' | 'city' | 'village' | 'ruins' | 'enemy';
    featureSprite?: string;
    enemies?: OverworldEnemy[];
}

export interface BattleCell { 
    x: number; z: number; height: number; maxHeight: number;
    hp: number; maxHp: number; offsetY: number; color: string; 
    textureUrl: string; isObstacle: boolean; blocksSight: boolean; 
    movementCost: number; terrain: TerrainType;
    effect?: { type: TileEffectType; duration: number }; 
}

export interface Spell { id: string; name: string; description: string; school: MagicSchool; level: number; range: number; effect: ActionEffect[]; }

export interface Skill { 
    id: string; 
    name: string; 
    description: string; 
    range: number; 
    effect: ActionEffect[];
    type?: 'active' | 'passive';
    mpCost?: number;
    cooldown?: number;
}

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
    inputMode: InputMode;
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
    worldDay: number;
    currentRegionName: string | null;
    currentSettlementName: string | null;
    activeNarrativeEvent: any | null;
    activeIncursion: any | null;
    activeDungeonId: string | null;
    dungeonRuntimeById: Record<string, DungeonRuntimeState>;
    encounterContext: EncounterContext | null;
    tacticalUiState: TacticalUiState;
    standingOnPort: boolean;
    inspectedEntityId: string | null;
    eternumShards: number;
}
