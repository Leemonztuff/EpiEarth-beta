
// @ts-nocheck
import { TerrainType, CharacterClass, Attributes, CharacterRace, ItemRarity, MovementType, MagicSchool, DamageType, Difficulty, EquipmentSlot, EffectType, ClassBranch, EvolutionStage } from './types';

// Supabase Configuration
export const SUPABASE_PROJECT_URL = "https://iukchvkoumfwaxlgfhso.supabase.co";
export const ASSET_BUCKET = "game-assets";
export const WESNOTH_BASE_URL = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${ASSET_BUCKET}`; 

// CDN Configuration
export const WESNOTH_CDN_URL = "https://cdn.jsdelivr.net/gh/wesnoth/wesnoth@master/data/core/images";
export const MINECRAFT_ASSETS_URL = "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.19.3/assets/minecraft/textures/block";

// Fallback texture URLs in case CDN fails
export const FALLBACK_ASSET_URLS = {
    stone: `${MINECRAFT_ASSETS_URL}/stone.png`,
    grass: `${MINECRAFT_ASSETS_URL}/grass_block_top.png`,
    water: `${MINECRAFT_ASSETS_URL}/water_still.png`,
    sand: `${MINECRAFT_ASSETS_URL}/sand.png`,
    cobblestone: `${MINECRAFT_ASSETS_URL}/cobblestone.png`
};

export const NOISE_TEXTURE_URL = "https://www.transparenttextures.com/patterns/asfalt-dark.png";

export const HEX_SIZE = 36; 
export const BATTLE_MAP_SIZE = 16;
export const DEFAULT_MAP_WIDTH = 40;
export const DEFAULT_MAP_HEIGHT = 30;

export const TERRAIN_COLORS: Record<TerrainType, string> = {
    [TerrainType.GRASS]: '#4ade80', [TerrainType.PLAINS]: '#bef264', [TerrainType.FOREST]: '#15803d',
    [TerrainType.JUNGLE]: '#064e3b', [TerrainType.MOUNTAIN]: '#57534e', [TerrainType.WATER]: '#3b82f6',
    [TerrainType.OCEAN]: '#1e3a8a', [TerrainType.CASTLE]: '#a8a29e', [TerrainType.VILLAGE]: '#fbbf24',
    [TerrainType.DESERT]: '#fde047', [TerrainType.SWAMP]: '#3f6212', [TerrainType.RUINS]: '#78716c',
    [TerrainType.ANCIENT_MONUMENT]: '#a855f7', [TerrainType.TUNDRA]: '#e5e7eb', [TerrainType.TAIGA]: '#065f46',
    [TerrainType.COBBLESTONE]: '#525252', [TerrainType.DIRT_ROAD]: '#926a4d', [TerrainType.STONE_FLOOR]: '#44403c',
    [TerrainType.CAVE_FLOOR]: '#292524', [TerrainType.DUNGEON_FLOOR]: '#44403c', [TerrainType.FUNGUS]: '#7e22ce',
    [TerrainType.LAVA]: '#ef4444', [TerrainType.CHASM]: '#020617', [TerrainType.VOID]: '#000000',
    [TerrainType.SAVANNAH]: '#d97706', [TerrainType.WASTELAND]: '#7f1d1d', [TerrainType.BADLANDS]: '#c2410c'
};

export type TerrainCategory = 'grass' | 'water' | 'mountain' | 'desert' | 'snow' | 'cave' | 'road' | 'castle' | 'volcanic' | 'void';

export const TERRAIN_CATEGORIES: Record<TerrainType, TerrainCategory> = {
    [TerrainType.GRASS]: 'grass',
    [TerrainType.PLAINS]: 'grass',
    [TerrainType.FOREST]: 'grass',
    [TerrainType.JUNGLE]: 'grass',
    [TerrainType.TAIGA]: 'grass',
    [TerrainType.SAVANNAH]: 'grass',
    [TerrainType.WASTELAND]: 'grass',
    [TerrainType.BADLANDS]: 'grass',
    [TerrainType.DESERT]: 'desert',
    [TerrainType.SWAMP]: 'grass',
    [TerrainType.TUNDRA]: 'snow',
    [TerrainType.WATER]: 'water',
    [TerrainType.OCEAN]: 'water',
    [TerrainType.MOUNTAIN]: 'mountain',
    [TerrainType.CASTLE]: 'castle',
    [TerrainType.VILLAGE]: 'grass',
    [TerrainType.RUINS]: 'castle',
    [TerrainType.ANCIENT_MONUMENT]: 'mountain',
    [TerrainType.COBBLESTONE]: 'road',
    [TerrainType.DIRT_ROAD]: 'road',
    [TerrainType.STONE_FLOOR]: 'road',
    [TerrainType.CAVE_FLOOR]: 'cave',
    [TerrainType.DUNGEON_FLOOR]: 'cave',
    [TerrainType.FUNGUS]: 'cave',
    [TerrainType.LAVA]: 'volcanic',
    [TerrainType.CHASM]: 'cave',
    [TerrainType.VOID]: 'void'
};

export const CATEGORY_COLORS: Record<TerrainCategory, string> = {
    grass: '#4ade80',
    water: '#3b82f6',
    mountain: '#57534e',
    desert: '#fde047',
    snow: '#e5e7eb',
    cave: '#292524',
    road: '#6b7280',
    castle: '#9ca3af',
    volcanic: '#ef4444',
    void: '#000000'
};

export const HEX_DIRECTIONS = [
    { q: 1, r: 0 },   { q: 1, r: -1 },  { q: 0, r: -1 },
    { q: -1, r: 0 },  { q: -1, r: 1 },  { q: 0, r: 1 }
] as const;

export type HexDirection = typeof HEX_DIRECTIONS[number];

// Texturas estilo Minecraft para la batalla 3D
export const BATTLE_TEXTURES: Record<TerrainType, string> = {
    [TerrainType.GRASS]: `${MINECRAFT_ASSETS_URL}/grass_block_top.png`,
    [TerrainType.PLAINS]: `${MINECRAFT_ASSETS_URL}/grass_block_top.png`,
    [TerrainType.FOREST]: `${MINECRAFT_ASSETS_URL}/moss_block.png`,
    [TerrainType.JUNGLE]: `${MINECRAFT_ASSETS_URL}/moss_block.png`,
    [TerrainType.MOUNTAIN]: `${MINECRAFT_ASSETS_URL}/stone.png`,
    [TerrainType.WATER]: `${MINECRAFT_ASSETS_URL}/water_still.png`,
    [TerrainType.OCEAN]: `${MINECRAFT_ASSETS_URL}/water_still.png`,
    [TerrainType.DESERT]: `${MINECRAFT_ASSETS_URL}/sand.png`,
    [TerrainType.SWAMP]: `${MINECRAFT_ASSETS_URL}/mud.png`,
    [TerrainType.TUNDRA]: `${MINECRAFT_ASSETS_URL}/snow.png`,
    [TerrainType.TAIGA]: `${MINECRAFT_ASSETS_URL}/podzol_top.png`,
    [TerrainType.COBBLESTONE]: `${MINECRAFT_ASSETS_URL}/cobblestone.png`,
    [TerrainType.DIRT_ROAD]: `${MINECRAFT_ASSETS_URL}/dirt.png`,
    [TerrainType.STONE_FLOOR]: `${MINECRAFT_ASSETS_URL}/stone_bricks.png`,
    [TerrainType.CAVE_FLOOR]: `${MINECRAFT_ASSETS_URL}/deepslate.png`,
    [TerrainType.DUNGEON_FLOOR]: `${MINECRAFT_ASSETS_URL}/polished_blackstone_bricks.png`,
    [TerrainType.LAVA]: `${MINECRAFT_ASSETS_URL}/lava_still.png`,
    [TerrainType.CHASM]: `${MINECRAFT_ASSETS_URL}/black_concrete.png`,
    [TerrainType.VOID]: `${MINECRAFT_ASSETS_URL}/crying_obsidian.png`,
    [TerrainType.WASTELAND]: `${MINECRAFT_ASSETS_URL}/dead_bubble_coral_block.png`,
    [TerrainType.CASTLE]: `${MINECRAFT_ASSETS_URL}/stone_bricks.png`,
    [TerrainType.RUINS]: `${MINECRAFT_ASSETS_URL}/cracked_stone_bricks.png`,
    [TerrainType.FUNGUS]: `${MINECRAFT_ASSETS_URL}/mycelium_top.png`
};

export const ASSETS = { 
    TERRAIN: { 
        [TerrainType.GRASS]: `terrain/grass/green.png`, 
        [TerrainType.PLAINS]: `terrain/grass/semi-dry.png`, 
        [TerrainType.FOREST]: `terrain/forest/deciduous-summer-tile.png`, 
        [TerrainType.JUNGLE]: `terrain/forest/rainforest-tile.png`, 
        [TerrainType.MOUNTAIN]: `terrain/mountains/basic-tile.png`, 
        [TerrainType.WATER]: `terrain/water/coast-tile.png`, 
        [TerrainType.OCEAN]: `terrain/water/ocean-tile.png`, 
        [TerrainType.VILLAGE]: `terrain/village/human-cottage.png`, 
        [TerrainType.DESERT]: `terrain/sand/desert.png`, 
        [TerrainType.SWAMP]: `terrain/swamp/water-tile.png`,
        [TerrainType.TUNDRA]: `terrain/frozen/snow.png`,
        [TerrainType.TAIGA]: `terrain/forest/pine-tile.png`,
        [TerrainType.DIRT_ROAD]: `terrain/flat/dirt.png`,
        [TerrainType.COBBLESTONE]: `terrain/flat/stone.png`,
        [TerrainType.STONE_FLOOR]: `terrain/flat/stone.png`,
        [TerrainType.CAVE_FLOOR]: `terrain/cave/floor.png`,
        [TerrainType.DUNGEON_FLOOR]: `terrain/cave/floor.png`,
        [TerrainType.CASTLE]: `terrain/castle/castle-tile.png`,
        [TerrainType.RUINS]: `terrain/castle/ruin-tile.png`,
        [TerrainType.FUNGUS]: `terrain/cave/fungus-tile.png`,
        [TerrainType.LAVA]: `terrain/chasm/lava.png`,
        [TerrainType.CHASM]: `terrain/chasm/earthy-tile.png`,
        [TerrainType.SAVANNAH]: `terrain/grass/dry.png`,
        [TerrainType.WASTELAND]: `terrain/grass/dry.png`,
        [TerrainType.BADLANDS]: `terrain/flat/dirt.png`,
        [TerrainType.VOID]: `terrain/chasm/abyss.png`
    },
    STRUCTURES: {
        'CITY': 'terrain/village/human-city-tile.png',
        'TOWN': 'terrain/village/human-village-tile.png',
        'VILLAGE': 'terrain/village/human-cottage.png',
        'CASTLE': 'terrain/castle/castle-tile.png',
        'RUINS': 'terrain/castle/ruin-tile.png',
        'DUNGEON': 'terrain/cave/wall-tile.png',
        'TEMPLE': 'scenery/monolith.png',
        'PORT': 'terrain/village/coast-village-tile.png',
        'EXIT': 'terrain/village/human-city-tile.png',
        'PORTAL': 'scenery/monolith.png',
        'MONUMENT': 'scenery/monolith.png'
    },
    VFX: {
        FIREBALL: `projectiles/fireball-n.png`,
        MAGIC_MISSILE: `projectiles/magic-missile-n.png`,
        HEAL_HALO: `halo/elven/druid-healing1.png`,
        RAIN: `weather/rain-heavy.png`
    },
    UI: {
        SHARD_ICON: `items/gem-large-blue.png`,
        GOLD_ICON: `items/gold-coins.png`
    }
};

export const TERRAIN_MOVEMENT_COST: Record<MovementType, Partial<Record<TerrainType, number>>> = {
    [MovementType.WALK]: { 
        [TerrainType.GRASS]: 1, [TerrainType.MOUNTAIN]: 5, [TerrainType.WATER]: 99, 
        [TerrainType.OCEAN]: 99, [TerrainType.DIRT_ROAD]: 0.7, [TerrainType.COBBLESTONE]: 0.8
    },
    [MovementType.SAIL]: { [TerrainType.WATER]: 1, [TerrainType.OCEAN]: 0.8, [TerrainType.GRASS]: 99 },
    [MovementType.FLY]: { [TerrainType.MOUNTAIN]: 1, [TerrainType.WATER]: 1, [TerrainType.OCEAN]: 1, [TerrainType.GRASS]: 1 }
};

export const RARITY_COLORS: Record<ItemRarity, string> = { [ItemRarity.COMMON]: '#94a3b8', [ItemRarity.UNCOMMON]: '#22c55e', [ItemRarity.RARE]: '#3b82f6', [ItemRarity.VERY_RARE]: '#a855f7', [ItemRarity.LEGENDARY]: '#f59e0b' };
export const SCHOOL_COLORS: Record<MagicSchool, string> = { [MagicSchool.ABJURATION]: '#60a5fa', [MagicSchool.CONJURATION]: '#f59e0b', [MagicSchool.DIVINATION]: '#a855f7', [MagicSchool.ENCHANTMENT]: '#ec4899', [MagicSchool.EVOCATION]: '#ef4444', [MagicSchool.ILLUSION]: '#8b5cf6', [MagicSchool.NECROMANCY]: '#4b5563', [MagicSchool.TRANSMUTATION]: '#10b981' };

export const CLASS_CONFIG: Record<CharacterClass, any> = {
    [CharacterClass.NOVICE]: { icon: `/sprites/characters/bard_01.png`, archetype: 'Aprendiz', branch: null },
    [CharacterClass.FIGHTER]: { icon: `/sprites/characters/fighter_01.png`, archetype: 'Guerrero', branch: ClassBranch.WARRIOR },
    [CharacterClass.RANGER]: { icon: `/sprites/characters/ranger_01.png`, archetype: 'Explorador', branch: ClassBranch.ROGUE },
    [CharacterClass.WIZARD]: { icon: `/sprites/characters/wizard_01.png`, archetype: 'Mago Arcano', branch: ClassBranch.MAGE },
    [CharacterClass.CLERIC]: { icon: `/sprites/characters/cleric_01.png`, archetype: 'Clérigo', branch: ClassBranch.CLERIC },
    [CharacterClass.ROGUE]: { icon: `/sprites/characters/rogue_01.png`, archetype: 'Pícaro', branch: ClassBranch.ROGUE },
    [CharacterClass.BARBARIAN]: { icon: `/sprites/characters/barbarian_01.png`, archetype: 'Bárbaro', branch: ClassBranch.WARRIOR },
    [CharacterClass.PALADIN]: { icon: `/sprites/characters/paladin_01.png`, archetype: 'Paladín', branch: ClassBranch.WARRIOR },
    [CharacterClass.SORCERER]: { icon: `/sprites/characters/sorcerer_01.png`, archetype: 'Hechicero', branch: ClassBranch.MAGE },
    [CharacterClass.WARLOCK]: { icon: `/sprites/characters/warlock_01.png`, archetype: 'Brujo', branch: ClassBranch.MAGE },
    [CharacterClass.DRUID]: { icon: `/sprites/characters/druid_01.png`, archetype: 'Druida', branch: ClassBranch.CLERIC },
    [CharacterClass.BARD]: { icon: `/sprites/characters/bard_01.png`, archetype: 'Bardo', branch: ClassBranch.ROGUE }
};

export const CLASS_SPRITES: Record<CharacterClass, string> = {
    [CharacterClass.NOVICE]: `/sprites/characters/bard_01.png`,
    [CharacterClass.FIGHTER]: `/sprites/characters/fighter_01.png`,
    [CharacterClass.RANGER]: `/sprites/characters/ranger_01.png`,
    [CharacterClass.WIZARD]: `/sprites/characters/wizard_01.png`,
    [CharacterClass.CLERIC]: `/sprites/characters/cleric_01.png`,
    [CharacterClass.ROGUE]: `/sprites/characters/rogue_01.png`,
    [CharacterClass.BARBARIAN]: `/sprites/characters/barbarian_01.png`,
    [CharacterClass.PALADIN]: `/sprites/characters/paladin_01.png`,
    [CharacterClass.SORCERER]: `/sprites/characters/sorcerer_01.png`,
    [CharacterClass.WARLOCK]: `/sprites/characters/warlock_01.png`,
    [CharacterClass.DRUID]: `/sprites/characters/druid_01.png`,
    [CharacterClass.BARD]: `/sprites/characters/bard_01.png`
};

export const RACE_ICONS: Record<string, string> = { 
  [CharacterRace.HUMAN]: `/sprites/characters/human_male_01.png`, 
  [CharacterRace.ELF]: `/sprites/characters/elf_01.png`, 
  [CharacterRace.DWARF]: `/sprites/characters/dwarf_01.png`, 
  [CharacterRace.HALFLING]: `/sprites/characters/halfling_01.png`, 
  [CharacterRace.DRAGONBORN]: `/sprites/characters/dragonborn_01.png`, 
  [CharacterRace.GNOME]: `/sprites/characters/gnome_01.png`, 
  [CharacterRace.TIEFLING]: `/sprites/characters/tiefling_01.png`, 
  [CharacterRace.HALF_ORC]: `/sprites/characters/half_orc_01.png` 
};

export const getSprite = (race: CharacterRace, cls: CharacterClass): string => {
    return CLASS_SPRITES[cls] || RACE_ICONS[race] || `units/human-loyalists/lieutenant.png`;
};

export const XP_TABLE: Record<number, number> = { 
    1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500, 
    6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
    11: 85000, 12: 100000, 13: 120000, 14: 140000, 15: 165000,
    16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000,
    21: 405000, 22: 465000, 23: 525000, 24: 595000, 25: 665000,
    26: 745000, 27: 835000, 28: 935000, 29: 1050000, 30: 1200000
};
export const DAMAGE_ICONS: Record<DamageType, string> = { 
    [DamageType.SLASHING]: `attacks/sword-human.png`, 
    [DamageType.PIERCING]: `attacks/spear.png`, 
    [DamageType.BLUDGEONING]: `attacks/mace.png`, 
    [DamageType.FIRE]: `attacks/fireball.png`, 
    [DamageType.COLD]: `attacks/iceball.png`, 
    [DamageType.LIGHTNING]: `attacks/lightning.png`, 
    [DamageType.POISON]: `attacks/fang.png`, 
    [DamageType.ACID]: `attacks/slime.png`, 
    [DamageType.NECROTIC]: `attacks/dark-missile.png`, 
    [DamageType.RADIANT]: `attacks/lightbeam.png`, 
    [DamageType.FORCE]: `attacks/magic-missile.png`, 
    [DamageType.THUNDER]: `attacks/mace.png`, 
    [DamageType.PSYCHIC]: `attacks/dark-missile.png`, 
    [DamageType.MAGIC]: `attacks/magic-missile.png` 
};
export const BASE_STATS: Record<CharacterClass, Attributes> = { 
    [CharacterClass.NOVICE]: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    [CharacterClass.FIGHTER]: { STR: 15, DEX: 13, CON: 14, INT: 8, WIS: 10, CHA: 12 }, 
    [CharacterClass.RANGER]: { STR: 12, DEX: 15, CON: 13, INT: 10, WIS: 14, CHA: 8 }, 
    [CharacterClass.WIZARD]: { STR: 8, DEX: 13, CON: 12, INT: 15, WIS: 14, CHA: 10 }, 
    [CharacterClass.CLERIC]: { STR: 14, DEX: 8, CON: 13, INT: 10, WIS: 15, CHA: 12 }, 
    [CharacterClass.ROGUE]: { STR: 10, DEX: 15, CON: 12, INT: 13, WIS: 8, CHA: 14 }, 
    [CharacterClass.BARBARIAN]: { STR: 15, DEX: 12, CON: 15, INT: 8, WIS: 10, CHA: 8 }, 
    [CharacterClass.PALADIN]: { STR: 14, DEX: 8, CON: 14, INT: 10, WIS: 12, CHA: 15 }, 
    [CharacterClass.SORCERER]: { STR: 8, DEX: 12, CON: 13, INT: 14, WIS: 10, CHA: 15 }, 
    [CharacterClass.WARLOCK]: { STR: 10, DEX: 12, CON: 13, INT: 14, WIS: 8, CHA: 15 }, 
    [CharacterClass.DRUID]: { STR: 12, DEX: 10, CON: 13, INT: 12, WIS: 15, CHA: 8 }, 
    [CharacterClass.BARD]: { STR: 8, DEX: 14, CON: 12, INT: 12, WIS: 10, CHA: 15 } 
};
export const RACE_BONUS: Record<CharacterRace, Partial<Attributes>> = { [CharacterRace.HUMAN]: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 }, [CharacterRace.ELF]: { DEX: 2, WIS: 1 }, [CharacterRace.DWARF]: { CON: 2, STR: 1 }, [CharacterRace.HALFLING]: { DEX: 2, CHA: 1 }, [CharacterRace.DRAGONBORN]: { STR: 2, CHA: 1 }, [CharacterRace.GNOME]: { INT: 2, DEX: 1 }, [CharacterRace.TIEFLING]: { CHA: 2, INT: 1 }, [CharacterRace.HALF_ORC]: { STR: 2, CON: 1 } };

export const DIFFICULTY_SETTINGS: Record<Difficulty, { enemyStatMod: number }> = {
    [Difficulty.EASY]: { enemyStatMod: 0.8 },
    [Difficulty.NORMAL]: { enemyStatMod: 1.0 },
    [Difficulty.HARD]: { enemyStatMod: 1.3 }
};

export const CORRUPTION_THRESHOLDS = [25, 50, 75, 100];

export const ITEMS: Record<string, any> = {
    shortbow: { id: 'shortbow', name: 'Arco Corto', type: 'equipment', rarity: ItemRarity.COMMON, description: 'Un arco simple.', icon: `items/bow.png`, equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 6, damageType: DamageType.PIERCING, properties: ['Range'] } },
    longsword: { id: 'longsword', name: 'Espada Larga', type: 'equipment', rarity: ItemRarity.COMMON, description: 'Una hoja robusta.', icon: `items/sword.png`, equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 8, damageType: DamageType.SLASHING } },
    ration: { id: 'ration', name: 'Ración', type: 'consumable', rarity: ItemRarity.COMMON, description: 'Comida de viaje.', icon: `items/grain-sheaf.png`, effect: { type: EffectType.HEAL, fixedValue: 5 } }
};

export const CLASS_TREES: Record<CharacterClass, any[]> = {
    [CharacterClass.NOVICE]: [
        { level: 2, unlocksSkill: 'basic_attack' },
        { level: 3, unlocksSkill: 'defend' },
        { level: 4, unlocksSkill: 'focus' },
        { level: 5, evolution: true, choices: [
            { id: 'branch_warrior', featureName: 'Guerrero', description: 'Domina el arte de la guerra cuerpo a cuerpo. Especializado en daño físico y tanqueo.', branch: ClassBranch.WARRIOR },
            { id: 'branch_mage', featureName: 'Mago', description: 'Despierta los misterios arcanos. Dominio de la magia destructiva y el conocimiento.', branch: ClassBranch.MAGE },
            { id: 'branch_rogue', featureName: 'Explorador', description: 'Acecha en las sombras y domina la precisión. Sigilo y combate a distancia.', branch: ClassBranch.ROGUE },
            { id: 'branch_cleric', featureName: 'Clérigo', description: 'Canaliza el poder divino. Sanación y protección sagrada.', branch: ClassBranch.CLERIC }
        ]}
    ],
    // ========== GUERRERO (SWORDSMAN) ==========
    [CharacterClass.FIGHTER]: [
        { level: 6, unlocksSkill: 'bash' },
        { level: 7, unlocksSkill: 'magnum_break' },
        { level: 8, passiveEffect: 'INCREASE_STR' },
        { level: 10, unlocksSkill: 'power_strike' },
        { level: 12, unlocksSkill: 'shield_bash' },
        { level: 15, evolution: true, choices: [
            { id: 'knight', featureName: 'Caballero (Knight)', description: 'Maestro de la lanza y el tanqueo. Barrido, provocación y montura.', subclass: CharacterClass.FIGHTER, unlocksSkill: 'brandish_spear' },
            { id: 'crusader', featureName: 'Cruzado (Cruzader)', description: 'Guerrero sagrado. Golpes divinos, fe y escudo boomerang.', subclass: CharacterClass.PALADIN, unlocksSkill: 'holy_cross' }
        ]},
        { level: 18, unlocksSkill: 'rally' },
        { level: 20, unlocksSkill: 'provoke' },
        { level: 25, evolution: true, choices: [
            { id: 'lord_knight', featureName: 'Señor Caballero (Lord Knight)', description: 'Espiral perforadora y estado de furia. Máximo daño físico.', subclass: CharacterClass.FIGHTER, unlocksSkill: 'spiral_pierce' },
            { id: 'paladin', featureName: 'Paladín', description: 'Escudo reflector y sanación limitada. Tankeo sagrado.', subclass: CharacterClass.PALADIN, unlocksSkill: 'shield_reflect' }
        ]},
        { level: 30, passiveEffect: 'MASTER_FIGHTER' }
    ],
    // ========== MAGO ==========
    [CharacterClass.WIZARD]: [
        { level: 6, unlocksSkill: 'fire_bolt' },
        { level: 7, unlocksSkill: 'cold_bolt' },
        { level: 8, passiveEffect: 'INCREASE_INT' },
        { level: 10, unlocksSkill: 'shield' },
        { level: 12, unlocksSkill: 'magic_missile' },
        { level: 15, evolution: true, choices: [
            { id: 'wizard', featureName: 'Mago (Wizard)', description: 'Magia destructiva. Bola de fuego, congelar y crítico mágico.', subclass: CharacterClass.WIZARD, unlocksSkill: 'fire_ball' },
            { id: 'sage', featureName: 'Sabio (Sage)', description: 'Conocimiento mágico. Cambio elemental, dispel y auto-spell.', subclass: CharacterClass.WIZARD, unlocksSkill: 'elemental_change' }
        ]},
        { level: 18, unlocksSkill: 'frost_diver' },
        { level: 20, unlocksSkill: 'burning_hands' },
        { level: 25, evolution: true, choices: [
            { id: 'high_wizard', featureName: 'Archimago (High Wizard)', description: 'Lluvia de meteoros y amplificación mágica. Daño masivo.', subclass: CharacterClass.WIZARD, unlocksSkill: 'meteor_storm' },
            { id: 'professor', featureName: 'Erudito (Professor)', description: 'Golpe mental y puño de hechizo. Híbrido magia/combate.', subclass: CharacterClass.WIZARD, unlocksSkill: 'mind_breaker' }
        ]},
        { level: 30, passiveEffect: 'MASTER_WIZARD' }
    ],
    // ========== CLÉRIGO ==========
    [CharacterClass.CLERIC]: [
        { level: 6, unlocksSkill: 'cleric_heal' },
        { level: 7, unlocksSkill: 'increase_agi' },
        { level: 8, passiveEffect: 'MEDITATIO' },
        { level: 10, unlocksSkill: 'magnificat' },
        { level: 12, unlocksSkill: 'resurrection' },
        { level: 15, evolution: true, choices: [
            { id: 'priest', featureName: 'Sacerdote (Priest)', description: 'Sanación y protección. Muro sagrado y magnificat.', subclass: CharacterClass.CLERIC, unlocksSkill: 'safety_wall' },
            { id: 'monk', featureName: 'Monje (Monk)', description: 'Combate cuerpo a cuerpo sagrada. Dedo ofensivo y puño de hierro.', subclass: CharacterClass.CLERIC, unlocksSkill: 'finger_offensive' }
        ]},
        { level: 18, unlocksSkill: 'assumptio' },
        { level: 20, unlocksSkill: 'spiritual_cadence' },
        { level: 25, evolution: true, choices: [
            { id: 'high_priest', featureName: 'Sumo Sacerdote (High Priest)', description: 'Basílica sagrada y asunción. Zona invulnerable y máximo soporte.', subclass: CharacterClass.CLERIC, unlocksSkill: 'basilica' },
            { id: 'champion', featureName: 'Campeón (Champion)', description: 'Golpe Asura y guillotina. Daño devastador cuerpo a cuerpo.', subclass: CharacterClass.CLERIC, unlocksSkill: 'asura_strike' }
        ]},
        { level: 30, passiveEffect: 'MASTER_CLERIC' }
    ],
    // ========== PÍCARO ==========
    [CharacterClass.ROGUE]: [
        { level: 6, unlocksSkill: 'double_attack' },
        { level: 7, unlocksSkill: 'steal' },
        { level: 8, unlocksSkill: 'envenom' },
        { level: 10, unlocksSkill: 'sneak_attack' },
        { level: 12, unlocksSkill: 'evasion' },
        { level: 15, evolution: true, choices: [
            { id: 'assassin', featureName: 'Asesino (Assassin)', description: 'Maestro del sigilo y veneno. Golpe sónico y cloaking.', subclass: CharacterClass.ROGUE, unlocksSkill: 'sonic_blow' },
            { id: 'rogue', featureName: 'Pícaro (Rogue)', description: 'Robo y desarme. Gank, snatch y strip.', subclass: CharacterClass.ROGUE, unlocksSkill: 'snatch' }
        ]},
        { level: 18, unlocksSkill: 'venom_splasher' },
        { level: 20, unlocksSkill: 'cloaking' },
        { level: 25, evolution: true, choices: [
            { id: 'assassin_cross', featureName: 'Asesino Supremo (Assassin Cross)', description: 'Asalto meteoro y veneno mortal. Daño extremo.', subclass: CharacterClass.ROGUE, unlocksSkill: 'meteor_assault' },
            { id: 'stalker', featureName: 'Acechador (Stalker)', description: 'Strip completo y preservación. Control total.', subclass: CharacterClass.ROGUE, unlocksSkill: 'full_strip' }
        ]},
        { level: 30, passiveEffect: 'MASTER_ROGUE' }
    ],
    // ========== BARBARO ==========
    [CharacterClass.BARBARIAN]: [
        { level: 6, unlocksSkill: 'reckless_attack' },
        { level: 7, unlocksSkill: 'rage' },
        { level: 8, passiveEffect: 'INCREASE_STR' },
        { level: 10, unlocksSkill: 'intimidating_presence' },
        { level: 12, unlocksSkill: 'bash' },
        { level: 15, evolution: true, choices: [
            { id: 'berserker', featureName: 'Berserker', description: 'Furia imparable y violencia. Daño máximo.', subclass: CharacterClass.BARBARIAN, unlocksSkill: 'magnum_break' },
            { id: 'totem', featureName: 'Guerrero Tótem', description: 'Espíritu animal y resistencia. Tanqueo primal.', subclass: CharacterClass.BARBARIAN, unlocksSkill: 'provoke' }
        ]},
        { level: 18, unlocksSkill: 'power_strike' },
        { level: 20, unlocksSkill: 'primal_path' },
        { level: 25, evolution: true, choices: [
            { id: 'berserker_adv', featureName: 'Berserker Legendario', description: 'Furia legendaria destructiva. Daño masivo.', subclass: CharacterClass.BARBARIAN, unlocksSkill: 'fury' },
            { id: 'spiritwalker', featureName: 'Caminante Espiritual', description: 'Unión con espíritus. Soporte primal.', subclass: CharacterClass.BARBARIAN, unlocksSkill: 'assumptio' }
        ]},
        { level: 30, passiveEffect: 'MASTER_BARBARIAN' }
    ],
    // ========== RANGER ==========
    [CharacterClass.RANGER]: [
        { level: 6, unlocksSkill: 'double_strafe' },
        { level: 7, unlocksSkill: 'arrow_shower' },
        { level: 8, passiveEffect: 'VULTURES_EYE' },
        { level: 10, unlocksSkill: 'precise_shot' },
        { level: 12, unlocksSkill: 'camouflage' },
        { level: 15, evolution: true, choices: [
            { id: 'hunter', featureName: 'Cazador (Hunter)', description: 'Bestia compañero y trampas. Blitz beat y land mine.', subclass: CharacterClass.RANGER, unlocksSkill: 'beastmaster' },
            { id: 'bard', featureName: 'Bardo (Bard)', description: 'Canciones de apoyo y confusión. Buffos de grupo.', subclass: CharacterClass.BARD, unlocksSkill: 'song_of_bravery' }
        ]},
        { level: 18, unlocksSkill: 'blitz_beat' },
        { level: 20, unlocksSkill: 'volley' },
        { level: 25, evolution: true, choices: [
            { id: 'sniper', featureName: 'Francotirador (Sniper)', description: 'Flecha enfocada y viento caminar. Máximo rango y evasión.', subclass: CharacterClass.RANGER, unlocksSkill: 'focused_arrow_strike' },
            { id: 'clown', featureName: 'Clown', description: 'Improvisación y tarot. Efectos aleatorios.', subclass: CharacterClass.BARD, unlocksSkill: 'tarot_card_of_fate' }
        ]},
        { level: 30, passiveEffect: 'MASTER_RANGER' }
    ],
    // ========== PALADIN ==========
    [CharacterClass.PALADIN]: [
        { level: 6, unlocksSkill: 'divine_smite' },
        { level: 7, unlocksSkill: 'lay_on_hands' },
        { level: 8, passiveEffect: 'FAITH' },
        { level: 10, unlocksSkill: 'shield_boomerang' },
        { level: 12, unlocksSkill: 'faith' },
        { level: 15, evolution: true, choices: [
            { id: 'holy_knight', featureName: 'Caballero Sagrado', description: 'Luz y justicia absolutas. Máximo tankeo sagrado.', subclass: CharacterClass.PALADIN, unlocksSkill: 'shield_reflect' },
            { id: 'avenger', featureName: 'Vengador', description: 'Justicia implacable. Daño sagrado y provocación.', subclass: CharacterClass.PALADIN, unlocksSkill: 'holy_cross' }
        ]},
        { level: 18, unlocksSkill: 'assumptio' },
        { level: 20, unlocksSkill: 'safety_wall' },
        { level: 25, evolution: true, choices: [
            { id: 'crusader_adv', featureName: 'Cruzado Legendario', description: 'Poder sagrado definitivo. Daño y soporte.', subclass: CharacterClass.PALADIN, unlocksSkill: 'basilica' },
            { id: 'templar', featureName: 'Templario', description: 'Guerrero de la luz. Máxima defensa.', subclass: CharacterClass.PALADIN, unlocksSkill: 'shield_reflect' }
        ]},
        { level: 30, passiveEffect: 'MASTER_PALADIN' }
    ],
    // ========== SORCERER ==========
    [CharacterClass.SORCERER]: [
        { level: 6, unlocksSkill: 'font_of_magic' },
        { level: 7, unlocksSkill: 'chromatic_orb' },
        { level: 8, passiveEffect: 'INCREASE_INT' },
        { level: 10, unlocksSkill: 'mage_armor' },
        { level: 12, unlocksSkill: 'cold_bolt' },
        { level: 15, evolution: true, choices: [
            { id: 'draconic', featureName: 'Linaje Dracónico', description: 'Poder elemental heredado. Daño y resistencia.', subclass: CharacterClass.SORCERER, unlocksSkill: 'fire_ball' },
            { id: 'wild', featureName: 'Magia Salvaje', description: 'Caos impredecible. Efectos aleatorios.', subclass: CharacterClass.SORCERER, unlocksSkill: 'tides_of_chaos' }
        ]},
        { level: 18, unlocksSkill: 'fire_bolt' },
        { level: 20, unlocksSkill: 'amplify_magic' },
        { level: 25, evolution: true, choices: [
            { id: 'true_dragon', featureName: 'Dragón Verdadero', description: 'Poder dracónico supremo.', subclass: CharacterClass.SORCERER, unlocksSkill: 'meteor_storm' },
            { id: 'chaos_mage', featureName: 'Mago del Caos', description: 'Magia caótica destructiva.', subclass: CharacterClass.SORCERER, unlocksSkill: 'spell_fist' }
        ]},
        { level: 30, passiveEffect: 'MASTER_SORCERER' }
    ],
    // ========== WARLOCK ==========
    [CharacterClass.WARLOCK]: [
        { level: 6, unlocksSkill: 'eldritch_invocations' },
        { level: 7, unlocksSkill: 'eldritch_blast' },
        { level: 8, passiveEffect: 'INCREASE_INT' },
        { level: 10, unlocksSkill: 'hex' },
        { level: 12, unlocksSkill: 'dark_ones_blessing' },
        { level: 15, evolution: true, choices: [
            { id: 'fiend', featureName: 'El Infernal', description: 'Patrono infernal. Daño oscuro.', subclass: CharacterClass.WARLOCK, unlocksSkill: 'fire_ball' },
            { id: 'fey', featureName: 'El Feérico', description: 'Encantamiento feérico. Control.', subclass: CharacterClass.WARLOCK, unlocksSkill: 'tides_of_chaos' }
        ]},
        { level: 18, unlocksSkill: 'mystic_arcane' },
        { level: 20, unlocksSkill: 'fey_presence' },
        { level: 25, evolution: true, choices: [
            { id: 'demon_lord', featureName: 'Señor Demoníaco', description: 'Poder demoníaco supremo.', subclass: CharacterClass.WARLOCK, unlocksSkill: 'meteor_storm' },
            { id: 'fae_lord', featureName: 'Señor Feérico', description: 'Majestad feérica oscura.', subclass: CharacterClass.WARLOCK, unlocksSkill: 'mind_breaker' }
        ]},
        { level: 30, passiveEffect: 'MASTER_WARLOCK' }
    ],
    // ========== DRUID ==========
    [CharacterClass.DRUID]: [
        { level: 6, unlocksSkill: 'wild_shape' },
        { level: 7, unlocksSkill: 'entangle' },
        { level: 8, passiveEffect: 'MEDITATIO' },
        { level: 10, unlocksSkill: 'goodberry' },
        { level: 12, unlocksSkill: 'moonbeam' },
        { level: 15, evolution: true, choices: [
            { id: 'moon', featureName: 'Círculo de la Luna', description: 'Transformación primal guerrera. Forma de combate.', subclass: CharacterClass.DRUID, unlocksSkill: 'finger_offensive' },
            { id: 'land', featureName: 'Círculo de la Tierra', description: 'Recuperación natural. Sanación y buffs.', subclass: CharacterClass.DRUID, unlocksSkill: 'cleric_heal' }
        ]},
        { level: 18, unlocksSkill: 'assumptio' },
        { level: 20, unlocksSkill: 'magnificat' },
        { level: 25, evolution: true, choices: [
            { id: 'archdruid', featureName: 'Archidruida', description: 'Sabiduría natural suprema.', subclass: CharacterClass.DRUID, unlocksSkill: 'basilica' },
            { id: 'predator', featureName: 'Depredador Prime', description: 'El mejor depredador.', subclass: CharacterClass.DRUID, unlocksSkill: 'asura_strike' }
        ]},
        { level: 30, passiveEffect: 'MASTER_DRUID' }
    ],
    // ========== BARDO ==========
    [CharacterClass.BARD]: [
        { level: 6, unlocksSkill: 'jack_of_all_trades' },
        { level: 7, unlocksSkill: 'vicious_mockery' },
        { level: 8, passiveEffect: 'MUSICAL_KNOWLEDGE' },
        { level: 10, unlocksSkill: 'healing_word' },
        { level: 12, unlocksSkill: 'song_of_bravery' },
        { level: 15, evolution: true, choices: [
            { id: 'lore', featureName: 'Colegio del Saber', description: 'Conocimiento ancestral. Magía y buffs.', subclass: CharacterClass.BARD, unlocksSkill: 'dispell' },
            { id: 'valor', featureName: 'Colegio del Valor', description: 'Inspiración en combate. Soporte.', subclass: CharacterClass.BARD, unlocksSkill: 'inspire' }
        ]},
        { level: 18, unlocksSkill: 'drums_distraction' },
        { level: 20, unlocksSkill: 'tarot_card_of_fate' },
        { level: 25, evolution: true, choices: [
            { id: 'maestro', featureName: 'Maestro', description: 'Maestría musical y poder.', subclass: CharacterClass.BARD, unlocksSkill: 'meteor_storm' },
            { id: 'storyteller', featureName: 'Cuentacuentos', description: 'Poder de los mitos.', subclass: CharacterClass.BARD, unlocksSkill: 'improvisation' }
        ]},
        { level: 30, passiveEffect: 'MASTER_BARD' }
    ]
};
