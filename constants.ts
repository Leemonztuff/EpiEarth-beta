
// @ts-nocheck
import { TerrainType, CharacterClass, Attributes, CharacterRace, ItemRarity, MovementType, MagicSchool, DamageType, Difficulty, EquipmentSlot, EffectType } from './types';

// Supabase Configuration
export const SUPABASE_PROJECT_URL = "https://iukchvkoumfwaxlgfhso.supabase.co";
export const ASSET_BUCKET = "game-assets";
export const WESNOTH_BASE_URL = `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${ASSET_BUCKET}`; 

// CDN Configuration
export const WESNOTH_CDN_URL = "https://cdn.jsdelivr.net/gh/wesnoth/wesnoth@master/data/core/images";
export const MINECRAFT_ASSETS_URL = "https://cdn.jsdelivr.net/gh/InventivetalentDev/minecraft-assets@1.19.3/assets/minecraft/textures/block";

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
    [CharacterClass.FIGHTER]: { icon: `units/human-loyalists/swordsman.png`, archetype: 'Guerrero' },
    [CharacterClass.RANGER]: { icon: `units/human-loyalists/huntsman.png`, archetype: 'Explorador' },
    [CharacterClass.WIZARD]: { icon: `units/human-magi/red-mage.png`, archetype: 'Mago Arcano' },
    [CharacterClass.CLERIC]: { icon: `units/human-magi/white-mage.png`, archetype: 'Clérigo' },
    [CharacterClass.ROGUE]: { icon: `units/human-outlaws/thief.png`, archetype: 'Pícaro' },
    [CharacterClass.BARBARIAN]: { icon: `units/human-outlaws/thug.png`, archetype: 'Bárbaro' },
    [CharacterClass.PALADIN]: { icon: `units/human-loyalists/paladin.png`, archetype: 'Paladín' },
    [CharacterClass.SORCERER]: { icon: `units/human-magi/silver-mage.png`, archetype: 'Hechicero' },
    [CharacterClass.WARLOCK]: { icon: `units/human-magi/dark-adept.png`, archetype: 'Brujo' },
    [CharacterClass.DRUID]: { icon: `units/elves-wood/shaman.png`, archetype: 'Druida' },
    [CharacterClass.BARD]: { icon: `units/human-loyalists/fencer.png`, archetype: 'Bardo' }
};

export const RACE_ICONS: Record<string, string> = { 
  [CharacterRace.HUMAN]: `units/human-loyalists/lieutenant.png`, 
  [CharacterRace.ELF]: `units/elves-wood/hero.png`, 
  [CharacterRace.DWARF]: `units/dwarves/fighter.png`, 
  [CharacterRace.HALFLING]: `units/human-outlaws/footpad.png`, 
  [CharacterRace.DRAGONBORN]: `units/drakes/fighter.png`, 
  [CharacterRace.GNOME]: `units/human-magi/white-mage.png`, 
  [CharacterRace.TIEFLING]: `units/human-magi/dark-adept.png`, 
  [CharacterRace.HALF_ORC]: `units/orcs/warrior.png` 
};

export const getSprite = (race: CharacterRace, cls: CharacterClass): string => {
    return CLASS_CONFIG[cls]?.icon || RACE_ICONS[race] || `units/human-loyalists/lieutenant.png`;
};

export const XP_TABLE: Record<number, number> = { 1: 300, 2: 900, 3: 2700, 4: 6500, 5: 14000, 6: 23000, 7: 34000, 8: 48000, 9: 64000, 10: 85000 };
export const DAMAGE_ICONS: Record<DamageType, string> = { 
    [DamageType.SLASHING]: `attacks/sword-human.png`, 
    [DamageType.PIERCING]: `attacks/spear.png`, 
    [DamageType.BLUDGEONING]: `attacks/mace.png`, 
    [TerrainType.FIRE]: `attacks/fireball.png`, 
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
export const BASE_STATS: Record<CharacterClass, Attributes> = { [CharacterClass.FIGHTER]: { STR: 15, DEX: 13, CON: 14, INT: 8, WIS: 10, CHA: 12 }, [CharacterClass.RANGER]: { STR: 12, DEX: 15, CON: 13, INT: 10, WIS: 14, CHA: 8 }, [CharacterClass.WIZARD]: { STR: 8, DEX: 13, CON: 12, INT: 15, WIS: 14, CHA: 10 }, [CharacterClass.CLERIC]: { STR: 14, DEX: 8, CON: 13, INT: 10, WIS: 15, CHA: 12 }, [CharacterClass.ROGUE]: { STR: 10, DEX: 15, CON: 12, INT: 13, WIS: 8, CHA: 14 }, [CharacterClass.BARBARIAN]: { STR: 15, DEX: 12, CON: 15, INT: 8, WIS: 10, CHA: 8 }, [CharacterClass.PALADIN]: { STR: 14, DEX: 8, CON: 14, INT: 10, WIS: 12, CHA: 15 }, [CharacterClass.SORCERER]: { STR: 8, DEX: 12, CON: 13, INT: 14, WIS: 10, CHA: 15 }, [CharacterClass.WARLOCK]: { STR: 10, DEX: 12, CON: 13, INT: 14, WIS: 8, CHA: 15 }, [CharacterClass.DRUID]: { STR: 12, DEX: 10, CON: 13, INT: 12, WIS: 15, CHA: 8 }, [CharacterClass.BARD]: { STR: 8, DEX: 14, CON: 12, INT: 12, WIS: 10, CHA: 15 } };
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
    [CharacterClass.FIGHTER]: [
        { level: 2, unlocksSkill: 'action_surge' },
        { level: 3, choices: [
            { id: 'f_champ', featureName: 'Champion', description: 'Improved Criticals.', passiveEffect: 'CRIT_FOCUS' },
            { id: 'f_bm', featureName: 'Battle Master', description: 'Tactical Maneuvers.', unlocksSkill: 'maneuver' }
        ]},
        { level: 5, passiveEffect: 'EXTRA_ATTACK' }
    ],
    [CharacterClass.RANGER]: [
        { level: 2, unlocksSpell: 'hunters_mark' },
        { level: 3, choices: [
            { id: 'r_hunter', featureName: 'Hunter', description: 'Expert prey tracking.', passiveEffect: 'HUNTER_SENSE' },
            { id: 'r_beast', featureName: 'Beast Master', description: 'Animal companion.', unlocksSkill: 'summon_beast' }
        ]},
        { level: 5, passiveEffect: 'EXTRA_ATTACK' }
    ],
    [CharacterClass.WIZARD]: [
        { level: 2, unlocksSpell: 'shield' },
        { level: 3, choices: [
            { id: 'w_evo', featureName: 'School of Evocation', description: 'Mastery of destructive elements.', magicSchool: MagicSchool.EVOCATION },
            { id: 'w_abj', featureName: 'School of Abjuration', description: 'Mastery of protective wards.', magicSchool: MagicSchool.ABJURATION }
        ]}
    ],
    [CharacterClass.CLERIC]: [
        { level: 2, unlocksSkill: 'channel_divinity' },
        { level: 3, choices: [
            { id: 'c_life', featureName: 'Life Domain', description: 'Divine healing energy.', magicSchool: MagicSchool.ABJURATION },
            { id: 'c_war', featureName: 'War Domain', description: 'Holy warrior spirit.', unlocksSkill: 'divine_strike' }
        ]}
    ],
    [CharacterClass.ROGUE]: [
        { level: 2, unlocksSkill: 'cunning_action' },
        { level: 3, choices: [
            { id: 'rog_thief', featureName: 'Thief', description: 'Expert infiltration.', passiveEffect: 'FAST_HANDS' },
            { id: 'rog_ass', featureName: 'Assassin', description: 'Lethal efficiency.', passiveEffect: 'SNEAK_ATTACK' }
        ]}
    ],
    [CharacterClass.BARBARIAN]: [
        { level: 2, unlocksSkill: 'reckless_attack' },
        { level: 3, choices: [
            { id: 'b_berserker', featureName: 'Path of the Berserker', description: 'Unstoppable rage.', passiveEffect: 'FRENZY' },
            { id: 'b_totem', featureName: 'Path of the Totem Warrior', description: 'Spirit animal guidance.', passiveEffect: 'BEAR_TOTEM' }
        ]},
        { level: 5, passiveEffect: 'EXTRA_ATTACK' }
    ],
    [CharacterClass.PALADIN]: [
        { level: 2, unlocksSkill: 'divine_smite' },
        { level: 3, choices: [
            { id: 'p_devotion', featureName: 'Oath of Devotion', description: 'Sacred protector.', magicSchool: MagicSchool.ABJURATION },
            { id: 'p_vengeance', featureName: 'Oath of Vengeance', description: 'Relentless pursuer.', unlocksSkill: 'vow_of_enmity' }
        ]}
    ],
    [CharacterClass.SORCERER]: [
        { level: 2, unlocksSkill: 'font_of_magic' },
        { level: 3, choices: [
            { id: 's_draconic', featureName: 'Draconic Bloodline', description: 'Inherited elemental power.', passiveEffect: 'DRACONIC_RESILIENCE' },
            { id: 's_wild', featureName: 'Wild Magic', description: 'Unpredictable chaos.', unlocksSkill: 'tides_of_chaos' }
        ]}
    ],
    [CharacterClass.WARLOCK]: [
        { level: 2, unlocksSkill: 'eldritch_invocations' },
        { level: 3, choices: [
            { id: 'war_fiend', featureName: 'The Fiend', description: 'Infernal patron gift.', unlocksSkill: 'dark_ones_blessing' },
            { id: 'war_fey', featureName: 'The Archfey', description: 'Fey presence charm.', unlocksSkill: 'fey_presence' }
        ]}
    ],
    [CharacterClass.DRUID]: [
        { level: 2, unlocksSkill: 'wild_shape' },
        { level: 3, choices: [
            { id: 'd_moon', featureName: 'Circle of the Moon', description: 'Primal shapeshifting.', unlocksSkill: 'wild_shape_combat' },
            { id: 'd_land', featureName: 'Circle of the Land', description: 'Nature recovery.', magicSchool: MagicSchool.CONJURATION }
        ]}
    ],
    [CharacterClass.BARD]: [
        { level: 2, unlocksSkill: 'jack_of_all_trades' },
        { level: 3, choices: [
            { id: 'brd_lore', featureName: 'College of Lore', description: 'Ancient knowledge mastery.', magicSchool: MagicSchool.DIVINATION },
            { id: 'brd_valor', featureName: 'College of Valor', description: 'Inspirational combat.', passiveEffect: 'COMBAT_INSPIRATION' }
        ]}
    ]
};
