
// @ts-nocheck
import { TerrainType, CharacterClass, Attributes, CharacterRace, ItemRarity, MovementType, MagicSchool, DamageType, Difficulty, EquipmentSlot, EffectType } from './types';

export const WESNOTH_BASE_URL = "https://cdn.jsdelivr.net/gh/wesnoth/wesnoth@master/data/core/images"; 
export const NOISE_TEXTURE_URL = "https://www.transparenttextures.com/patterns/asfalt-dark.png";

export const HEX_SIZE = 32;
export const BATTLE_MAP_SIZE = 16;
export const DEFAULT_MAP_WIDTH = 40;
export const DEFAULT_MAP_HEIGHT = 30;

// Configuración de Colores y Estética (Permanecen aquí por rendimiento de renderizado)
export const TERRAIN_COLORS: Record<TerrainType, string> = {
    [TerrainType.GRASS]: '#4ade80', [TerrainType.PLAINS]: '#bef264', [TerrainType.FOREST]: '#15803d',
    [TerrainType.JUNGLE]: '#064e3b', [TerrainType.MOUNTAIN]: '#57534e', [TerrainType.WATER]: '#3b82f6',
    [TerrainType.OCEAN]: '#1e3a8a', [TerrainType.CASTLE]: '#a8a29e', [TerrainType.VILLAGE]: '#fbbf24',
    [TerrainType.DESERT]: '#fde047', [TerrainType.SWAMP]: '#3f6212', [TerrainType.RUINS]: '#78716c',
    [TerrainType.ANCIENT_MONUMENT]: '#a855f7', [TerrainType.TUNDRA]: '#e5e7eb', [TerrainType.TAIGA]: '#065f46',
    [TerrainType.COBBLESTONE]: '#525252', [TerrainType.DIRT_ROAD]: '#b45309', [TerrainType.STONE_FLOOR]: '#44403c',
    [TerrainType.CAVE_FLOOR]: '#292524', [TerrainType.DUNGEON_FLOOR]: '#44403c', [TerrainType.FUNGUS]: '#7e22ce',
    [TerrainType.LAVA]: '#ef4444', [TerrainType.CHASM]: '#020617', [TerrainType.VOID]: '#000000',
    [TerrainType.SAVANNAH]: '#d97706', [TerrainType.WASTELAND]: '#7f1d1d', [TerrainType.BADLANDS]: '#c2410c'
};

export const TERRAIN_MOVEMENT_COST: Record<MovementType, Partial<Record<TerrainType, number>>> = {
    [MovementType.WALK]: { [TerrainType.GRASS]: 1, [TerrainType.MOUNTAIN]: 5, [TerrainType.WATER]: 99, [TerrainType.OCEAN]: 99, [TerrainType.DIRT_ROAD]: 0.8 },
    [MovementType.SAIL]: { [TerrainType.WATER]: 1, [TerrainType.OCEAN]: 0.8, [TerrainType.GRASS]: 99 },
    [MovementType.FLY]: { [TerrainType.MOUNTAIN]: 1, [TerrainType.WATER]: 1, [TerrainType.OCEAN]: 1, [TerrainType.GRASS]: 1 }
};

export const RARITY_COLORS: Record<ItemRarity, string> = { [ItemRarity.COMMON]: '#94a3b8', [ItemRarity.UNCOMMON]: '#22c55e', [ItemRarity.RARE]: '#3b82f6', [ItemRarity.VERY_RARE]: '#a855f7', [ItemRarity.LEGENDARY]: '#f59e0b' };
export const SCHOOL_COLORS: Record<MagicSchool, string> = { [MagicSchool.ABJURATION]: '#60a5fa', [MagicSchool.CONJURATION]: '#f59e0b', [MagicSchool.DIVINATION]: '#a855f7', [MagicSchool.ENCHANTMENT]: '#ec4899', [MagicSchool.EVOCATION]: '#ef4444', [MagicSchool.ILLUSION]: '#8b5cf6', [MagicSchool.NECROMANCY]: '#4b5563', [MagicSchool.TRANSMUTATION]: '#10b981' };

// Estos objetos ahora solo sirven de "Fallback" si Supabase falla
export const CLASS_CONFIG: Record<CharacterClass, any> = {
    [CharacterClass.FIGHTER]: { icon: `${WESNOTH_BASE_URL}/units/human-loyalists/swordsman.png`, archetype: 'Melee Specialist' },
    [CharacterClass.RANGER]: { icon: `${WESNOTH_BASE_URL}/units/human-loyalists/huntsman.png`, archetype: 'Ranged Scout' },
    [CharacterClass.WIZARD]: { icon: `${WESNOTH_BASE_URL}/units/human-magi/red-mage.png`, archetype: 'Arcane Master' },
    [CharacterClass.CLERIC]: { icon: `${WESNOTH_BASE_URL}/units/human-magi/white-mage.png`, archetype: 'Divine Healer' },
    [CharacterClass.ROGUE]: { icon: `${WESNOTH_BASE_URL}/units/human-outlaws/thief.png`, archetype: 'Cunning Infiltrator' },
    [CharacterClass.BARBARIAN]: { icon: `${WESNOTH_BASE_URL}/units/human-outlaws/thug.png`, archetype: 'Furious Warrior' },
    [CharacterClass.PALADIN]: { icon: `${WESNOTH_BASE_URL}/units/human-loyalists/paladin.png`, archetype: 'Holy Protector' },
    [CharacterClass.SORCERER]: { icon: `${WESNOTH_BASE_URL}/units/human-magi/silver-mage.png`, archetype: 'Innate Spellcaster' },
    [CharacterClass.WARLOCK]: { icon: `${WESNOTH_BASE_URL}/units/human-magi/dark-adept.png`, archetype: 'Pact Maker' },
    [CharacterClass.DRUID]: { icon: `${WESNOTH_BASE_URL}/units/elves-wood/shaman.png`, archetype: 'Nature Guardian' },
    [CharacterClass.BARD]: { icon: `${WESNOTH_BASE_URL}/units/human-loyalists/fencer.png`, archetype: 'Master Performer' }
};

export const RACE_ICONS: Record<string, string> = { [CharacterRace.HUMAN]: `${WESNOTH_BASE_URL}/units/human-loyalists/lieutenant.png`, [CharacterRace.ELF]: `${WESNOTH_BASE_URL}/units/elves-wood/hero.png`, [CharacterRace.DWARF]: `${WESNOTH_BASE_URL}/units/dwarves/fighter.png`, [CharacterRace.HALFLING]: `${WESNOTH_BASE_URL}/units/human-outlaws/footpad.png`, [CharacterRace.DRAGONBORN]: `${WESNOTH_BASE_URL}/units/drakes/fighter.png`, [CharacterRace.GNOME]: `${WESNOTH_BASE_URL}/units/human-magi/white-mage.png`, [CharacterRace.TIEFLING]: `${WESNOTH_BASE_URL}/units/human-magi/dark-adept.png`, [CharacterRace.HALF_ORC]: `${WESNOTH_BASE_URL}/units/orcs/warrior.png` };
export const getSprite = (race: CharacterRace, cls: CharacterClass): string => CLASS_CONFIG[cls]?.icon || RACE_ICONS[race];
export const ASSETS = { TERRAIN: { [TerrainType.GRASS]: `${WESNOTH_BASE_URL}/terrain/grass/green.png`, [TerrainType.PLAINS]: `${WESNOTH_BASE_URL}/terrain/grass/semi-dry.png`, [TerrainType.FOREST]: `${WESNOTH_BASE_URL}/terrain/forest/deciduous-summer-tile.png`, [TerrainType.MOUNTAIN]: `${WESNOTH_BASE_URL}/terrain/mountains/basic.png`, [TerrainType.WATER]: `${WESNOTH_BASE_URL}/terrain/water/coast.png`, [TerrainType.OCEAN]: `${WESNOTH_BASE_URL}/terrain/water/ocean.png`, [TerrainType.VILLAGE]: `${WESNOTH_BASE_URL}/terrain/village/human-cottage.png`, [TerrainType.DESERT]: `${WESNOTH_BASE_URL}/terrain/sand/desert.png`, [TerrainType.TUNDRA]: `${WESNOTH_BASE_URL}/terrain/frozen/snow.png` } };
export const XP_TABLE: Record<number, number> = { 1: 300, 2: 900, 3: 2700, 4: 6500, 5: 14000, 6: 23000, 7: 34000, 8: 48000, 9: 64000, 10: 85000 };
export const DAMAGE_ICONS: Record<DamageType, string> = { [DamageType.SLASHING]: `${WESNOTH_BASE_URL}/attacks/sword-human.png`, [DamageType.PIERCING]: `${WESNOTH_BASE_URL}/attacks/spear.png`, [DamageType.BLUDGEONING]: `${WESNOTH_BASE_URL}/attacks/mace.png`, [DamageType.FIRE]: `${WESNOTH_BASE_URL}/attacks/fireball.png`, [DamageType.COLD]: `${WESNOTH_BASE_URL}/attacks/iceball.png`, [DamageType.LIGHTNING]: `${WESNOTH_BASE_URL}/attacks/lightning.png`, [DamageType.POISON]: `${WESNOTH_BASE_URL}/attacks/fang.png`, [DamageType.ACID]: `${WESNOTH_BASE_URL}/attacks/slime.png`, [DamageType.NECROTIC]: `${WESNOTH_BASE_URL}/attacks/dark-missile.png`, [DamageType.RADIANT]: `${WESNOTH_BASE_URL}/attacks/lightbeam.png`, [DamageType.FORCE]: `${WESNOTH_BASE_URL}/attacks/magic-missile.png`, [DamageType.THUNDER]: `${WESNOTH_BASE_URL}/attacks/mace.png`, [DamageType.PSYCHIC]: `${WESNOTH_BASE_URL}/attacks/dark-missile.png`, [DamageType.MAGIC]: `${WESNOTH_BASE_URL}/attacks/magic-missile.png` };
export const BASE_STATS: Record<CharacterClass, Attributes> = { [CharacterClass.FIGHTER]: { STR: 15, DEX: 13, CON: 14, INT: 8, WIS: 10, CHA: 12 }, [CharacterClass.RANGER]: { STR: 12, DEX: 15, CON: 13, INT: 10, WIS: 14, CHA: 8 }, [CharacterClass.WIZARD]: { STR: 8, DEX: 13, CON: 12, INT: 15, WIS: 14, CHA: 10 }, [CharacterClass.CLERIC]: { STR: 14, DEX: 8, CON: 13, INT: 10, WIS: 15, CHA: 12 }, [CharacterClass.ROGUE]: { STR: 10, DEX: 15, CON: 12, INT: 13, WIS: 8, CHA: 14 }, [CharacterClass.BARBARIAN]: { STR: 15, DEX: 12, CON: 15, INT: 8, WIS: 10, CHA: 8 }, [CharacterClass.PALADIN]: { STR: 14, DEX: 8, CON: 14, INT: 10, WIS: 12, CHA: 15 }, [CharacterClass.SORCERER]: { STR: 8, DEX: 12, CON: 13, INT: 14, WIS: 10, CHA: 15 }, [CharacterClass.WARLOCK]: { STR: 10, DEX: 12, CON: 13, INT: 14, WIS: 8, CHA: 15 }, [CharacterClass.DRUID]: { STR: 12, DEX: 10, CON: 13, INT: 12, WIS: 15, CHA: 8 }, [CharacterClass.BARD]: { STR: 8, DEX: 14, CON: 12, INT: 12, WIS: 10, CHA: 15 } };
export const RACE_BONUS: Record<CharacterRace, Partial<Attributes>> = { [CharacterRace.HUMAN]: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 }, [CharacterRace.ELF]: { DEX: 2, WIS: 1 }, [CharacterRace.DWARF]: { CON: 2, STR: 1 }, [CharacterRace.HALFLING]: { DEX: 2, CHA: 1 }, [CharacterRace.DRAGONBORN]: { STR: 2, CHA: 1 }, [CharacterRace.GNOME]: { INT: 2, DEX: 1 }, [CharacterRace.TIEFLING]: { CHA: 2, INT: 1 }, [CharacterRace.HALF_ORC]: { STR: 2, CON: 1 } };
// Árboles de clase (Placeholder, se migrará a DB)
export const CLASS_TREES: Record<CharacterClass, any[]> = { [CharacterClass.WIZARD]: [], [CharacterClass.FIGHTER]: [], [CharacterClass.ROGUE]: [], [CharacterClass.BARBARIAN]: [], [CharacterClass.CLERIC]: [], [CharacterClass.DRUID]: [], [CharacterClass.PALADIN]: [], [CharacterClass.RANGER]: [], [CharacterClass.SORCERER]: [], [CharacterClass.WARLOCK]: [], [CharacterClass.BARD]: [] };

// Game Balance Config
export const DIFFICULTY_SETTINGS: Record<Difficulty, { enemyStatMod: number }> = {
    [Difficulty.EASY]: { enemyStatMod: 0.8 },
    [Difficulty.NORMAL]: { enemyStatMod: 1.0 },
    [Difficulty.HARD]: { enemyStatMod: 1.3 }
};

export const CORRUPTION_THRESHOLDS = [25, 50, 75, 100];

export const ITEMS: Record<string, any> = {
    shortbow: { id: 'shortbow', name: 'Shortbow', type: 'equipment', rarity: ItemRarity.COMMON, description: 'A simple bow.', icon: '🏹', equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 6, damageType: DamageType.PIERCING, properties: ['Range'] } },
    longsword: { id: 'longsword', name: 'Longsword', type: 'equipment', rarity: ItemRarity.COMMON, description: 'A sturdy blade.', icon: '🗡️', equipmentStats: { slot: EquipmentSlot.MAIN_HAND, diceCount: 1, diceSides: 8, damageType: DamageType.SLASHING } },
    ration: { id: 'ration', name: 'Ration', type: 'consumable', rarity: ItemRarity.COMMON, description: 'Travel food.', icon: '🍞', effect: { type: EffectType.HEAL, fixedValue: 5 } }
};

export const RACE_SKILLS: Record<string, string[]> = {
    [CharacterRace.HUMAN]: [],
    [CharacterRace.ELF]: [],
    [CharacterRace.DWARF]: [],
    [CharacterRace.HALFLING]: [],
    [CharacterRace.DRAGONBORN]: [],
    [CharacterRace.GNOME]: [],
    [CharacterRace.TIEFLING]: [],
    [CharacterRace.HALF_ORC]: []
};
