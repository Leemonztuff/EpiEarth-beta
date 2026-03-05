import { Skill, ActionEffect, EffectType, DamageType, StatusEffectType } from '../types';

const createSkill = (
    id: string,
    name: string,
    description: string,
    range: number,
    effect: ActionEffect[],
    type: 'active' | 'passive' = 'active',
    mpCost?: number,
    cooldown?: number
): Skill => ({
    id,
    name,
    description,
    range,
    effect,
    type,
    mpCost,
    cooldown
});

export const DEFAULT_SKILLS: Record<string, Skill> = {
    // ========== NOVICE SKILLS ==========
    basic_attack: createSkill(
        'basic_attack',
        'Basic Attack',
        'A standard melee attack. Can be improved up to level 5.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.SLASHING, diceCount: 1, diceSides: 6 }]
    ),
    defend: createSkill(
        'defend',
        'Defend',
        'Assume a defensive stance, increasing AC temporarily.',
        0,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.SHIELD, duration: 2 }]
    ),
    focus: createSkill(
        'focus',
        'Focus',
        'Meditate to restore focus and improve next attack accuracy.',
        0,
        []
    ),

    // ========== SWORDSMAN / GUERRERO SKILLS ==========
    bash: createSkill(
        'bash',
        'Bash',
        'A powerful strike that damages and stuns. Can be improved up to level 5.',
        1,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.BLUDGEONING, diceCount: 2, diceSides: 8 },
            { type: EffectType.STATUS, statusType: StatusEffectType.STUN, duration: 1, chance: 25 }
        ], 'active',
        10,
        3
    ),
    magnum_break: createSkill(
        'magnum_break',
        'Magnum Break',
        'A shockwave that damages nearby enemies. Potentiated by rage.',
        2,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.FIRE, diceCount: 3, diceSides: 8 }
        ], 'active',
        15,
        5
    ),
    increase_str: createSkill(
        'increase_str',
        'Increase STR',
        'Passively increases Strength and Constitution.',
        0,
        [],
        'passive'
    ),
    power_strike: createSkill(
        'power_strike',
        'Power Strike',
        'A heavy blow that deals increased damage.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.SLASHING, diceCount: 4, diceSides: 8 }], 'active',
        20,
        4
    ),
    shield_bash: createSkill(
        'shield_bash',
        'Shield Bash',
        'Strike with your shield to stun enemies.',
        1,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.BLUDGEONING, diceCount: 2, diceSides: 6 },
            { type: EffectType.STATUS, statusType: StatusEffectType.STUN, duration: 1, chance: 30 }
        ], 'active',
        12,
        3
    ),
    rally: createSkill(
        'rally',
        'Rally',
        'Inspire allies to increase their attack power.',
        3,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.RAGE, duration: 3 }], 'active',
        15,
        6
    ),

    // ========== KNIGHT SPECIALIZATION ==========
    brandish_spear: createSkill(
        'brandish_spear',
        'Brandish Spear',
        'A sweeping lance attack that hits multiple enemies.',
        2,
        [{ type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 3, diceSides: 10 }], 'active',
        25,
        5
    ),
    provoke: createSkill(
        'provoke',
        'Provoke',
        'Taunt an enemy, forcing them to attack you and reducing their defense.',
        3,
        [
            { type: EffectType.STATUS, statusType: StatusEffectType.FRIGHTENED, duration: 2 }
        ], 'active',
        10,
        4
    ),
    riding: createSkill(
        'riding',
        'Riding',
        'Mount a pet to increase mobility. Passive skill.',
        0,
        [],
        'passive'
    ),

    // ========== CRUSADER SPECIALIZATION ==========
    holy_cross: createSkill(
        'holy_cross',
        'Holy Cross',
        'A sacred strike that deals additional damage to undead and demons.',
        1,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.RADIANT, diceCount: 3, diceSides: 8 },
            { type: EffectType.DAMAGE, damageType: DamageType.SLASHING, diceCount: 1, diceSides: 8 }
        ], 'active',
        15,
        4
    ),
    faith: createSkill(
        'faith',
        'Faith',
        'Passively increases defense and magic resistance.',
        0,
        [],
        'passive'
    ),
    shield_boomerang: createSkill(
        'shield_boomerang',
        'Shield Boomerang',
        'Throw your shield as a projectile to damage distant enemies.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.BLUDGEONING, diceCount: 2, diceSides: 8 }], 'active',
        20,
        5
    ),

    // ========== LORD KNIGHT (Advanced) ==========
    spiral_pierce: createSkill(
        'spiral_pierce',
        'Spiral Pierce',
        'A spinning lance attack that ignores part of enemy defense. Boss skill.',
        2,
        [{ type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 6, diceSides: 12 }], 'active',
        40,
        8
    ),
    fury: createSkill(
        'fury',
        'Fury',
        'Enter a fury state that drastically increases damage but decreases defense.',
        0,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.RAGE, duration: 3 }], 'active',
        25,
        10
    ),

    // ========== PALADIN (Advanced) ==========
    shield_reflect: createSkill(
        'shield_reflect',
        'Shield Reflect',
        'Reflect a percentage of incoming damage back to the attacker.',
        0,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.SHIELD, duration: 2 }], 'active',
        20,
        6
    ),
    heal: createSkill(
        'heal',
        'Heal',
        'Restore health to an ally. Limited version for Paladins.',
        3,
        [{ type: EffectType.HEAL, fixedValue: 30 }], 'active',
        15,
        4
    ),

    // ========== MAGE SKILLS ==========
    fire_bolt: createSkill(
        'fire_bolt',
        'Fire Bolt',
        'Launch a fire projectile. Can be improved up to level 5.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.FIRE, diceCount: 1, diceSides: 10 }], 'active',
        8,
        2
    ),
    cold_bolt: createSkill(
        'cold_bolt',
        'Cold Bolt',
        'Launch an ice projectile that can slow enemies.',
        4,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.COLD, diceCount: 1, diceSides: 10 },
            { type: EffectType.STATUS, statusType: StatusEffectType.SLOW, duration: 2, chance: 30 }
        ], 'active',
        8,
        2
    ),
    increase_int: createSkill(
        'increase_int',
        'Increase INT',
        'Passively increases Intelligence and mana regeneration.',
        0,
        [],
        'passive'
    ),
    shield: createSkill(
        'shield',
        'Shield',
        'Magical barrier that provides protection.',
        0,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.SHIELD, duration: 3 }], 'active',
        10,
        3
    ),
    magic_missile: createSkill(
        'magic_missile',
        'Magic Missile',
        'Launch magical missiles at the enemy.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.MAGIC, diceCount: 2, diceSides: 6 }], 'active',
        12,
        2
    ),
    burning_hands: createSkill(
        'burning_hands',
        'Burning Hands',
        'A cone of fire that damages enemies in front.',
        2,
        [{ type: EffectType.DAMAGE, damageType: DamageType.FIRE, diceCount: 2, diceSides: 8 }], 'active',
        15,
        3
    ),

    // ========== WIZARD SPECIALIZATION ==========
    fire_ball: createSkill(
        'fire_ball',
        'Fire Ball',
        'An explosive fireball that damages a small area.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.FIRE, diceCount: 4, diceSides: 8 }], 'active',
        20,
        5
    ),
    frost_diver: createSkill(
        'frost_diver',
        'Frost Diver',
        'Freeze an enemy in place.',
        3,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.COLD, diceCount: 2, diceSides: 8 },
            { type: EffectType.STATUS, statusType: StatusEffectType.FREEZE, duration: 2 }
        ], 'active',
        18,
        4
    ),
    magic_critical: createSkill(
        'magic_critical',
        'Magic Critical',
        'Increases the chance of critical hits with spells.',
        0,
        [],
        'passive'
    ),

    // ========== SAGE SPECIALIZATION ==========
    elemental_change: createSkill(
        'elemental_change',
        'Elemental Change',
        'Temporarily change the elemental property of an ally weapon.',
        3,
        [], 'active',
        20,
        5
    ),
    dispell: createSkill(
        'dispell',
        'Dispell',
        'Remove positive magical effects from an enemy.',
        3,
        [], 'active',
        15,
        4
    ),
    auto_spell: createSkill(
        'auto_spell',
        'Auto Spell',
        'When attacking, have a chance to automatically cast a simple spell.',
        0,
        [],
        'passive'
    ),

    // ========== HIGH WIZARD (Advanced) ==========
    meteor_storm: createSkill(
        'meteor_storm',
        'Meteor Storm',
        'Invoke a rain of meteors that massively damages a large area. Definitive skill.',
        5,
        [{ type: EffectType.DAMAGE, damageType: DamageType.FIRE, diceCount: 8, diceSides: 12 }], 'active',
        60,
        12
    ),
    amplify_magic: createSkill(
        'amplify_magic',
        'Amplify Magic',
        'Double the damage of your next spell, but with greater mana cost.',
        0,
        [], 'active',
        30,
        8
    ),

    // ========== PROFESSOR (Advanced) ==========
    mind_breaker: createSkill(
        'mind_breaker',
        'Mind Breaker',
        'A psychic blow that damages enemy mind and increases their mana cost to cast spells.',
        3,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.PSYCHIC, diceCount: 3, diceSides: 10 },
            { type: EffectType.STATUS, statusType: StatusEffectType.SILENCE, duration: 2 }
        ], 'active',
        25,
        5
    ),
    spell_fist: createSkill(
        'spell_fist',
        'Spell Fist',
        'Imbue your weapon with magical power to damage in melee combat while casting.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.MAGIC, diceCount: 4, diceSides: 8 }], 'active',
        30,
        6
    ),

    // ========== ACOLYTE / CLERIC SKILLS ==========
    increase_agi: createSkill(
        'increase_agi',
        'Increase AGI',
        'Increase agility of an ally.',
        3,
        [], 'active',
        10,
        3
    ),
    meditatio: createSkill(
        'meditatio',
        'Meditatio',
        'Passively increases mana regeneration.',
        0,
        [],
        'passive'
    ),
    cleric_heal: createSkill(
        'cleric_heal',
        'Heal',
        'Restore health to an ally. Can be improved up to level 5.',
        3,
        [{ type: EffectType.HEAL, fixedValue: 40 }], 'active',
        12,
        3
    ),

    // ========== PRIEST SPECIALIZATION ==========
    magnificat: createSkill(
        'magnificat',
        'Magnificat',
        'Double the mana regeneration of the entire group for a time.',
        0,
        [], 'active',
        30,
        8
    ),
    resurrection: createSkill(
        'resurrection',
        'Resurrection',
        'Revive a fallen ally.',
        3,
        [{ type: EffectType.HEAL, fixedValue: 50 }], 'active',
        50,
        10
    ),
    safety_wall: createSkill(
        'safety_wall',
        'Safety Wall',
        'Create a sacred wall that protects from physical attacks.',
        2,
        [], 'active',
        25,
        6
    ),

    // ========== MONK SPECIALIZATION ==========
    finger_offensive: createSkill(
        'finger_offensive',
        'Finger Offensive',
        'Fire a kinetic energy ray at an enemy.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.FORCE, diceCount: 3, diceSides: 8 }], 'active',
        15,
        3
    ),
    spiritual_cadence: createSkill(
        'spiritual_cadence',
        'Spiritual Cadence',
        'Increase attack speed and critical hit chance.',
        0,
        [], 'active',
        20,
        5
    ),
    iron_fist: createSkill(
        'iron_fist',
        'Iron Fist',
        'Unarmed attacks ignore part of physical defense.',
        0,
        [],
        'passive'
    ),

    // ========== HIGH PRIEST (Advanced) ==========
    basilica: createSkill(
        'basilica',
        'Basilica',
        'Summon a sacred area where the group cannot be damaged or act, only heal. Elite skill.',
        4,
        [], 'active',
        60,
        15
    ),
    assumptio: createSkill(
        'assumptio',
        'Assumptio',
        'Double the physical defense of an ally for a short time.',
        3,
        [], 'active',
        25,
        5
    ),

    // ========== CHAMPION (Advanced) ==========
    asura_strike: createSkill(
        'asura_strike',
        'Asura Strike',
        'A devastating palm strike that consumes all mana to deal damage proportional to remaining amount.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.FORCE, diceCount: 10, diceSides: 10 }], 'active',
        50,
        10
    ),
    guillotine_fist: createSkill(
        'guillotine_fist',
        'Guillotine Fist',
        'A melee attack with high critical hit probability.',
        1,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.BLUDGEONING, diceCount: 5, diceSides: 10 },
            { type: EffectType.STATUS, statusType: StatusEffectType.BLEED, duration: 3, chance: 50 }
        ], 'active',
        35,
        6
    ),

    // ========== THIEF / ROGUE SKILLS ==========
    double_attack: createSkill(
        'double_attack',
        'Double Attack',
        'Chance to strike twice with a basic attack. Can be improved up to level 5.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 1, diceSides: 6, chance: 50 }],
        'passive'
    ),
    steal: createSkill(
        'steal',
        'Steal',
        'Steal an item from an enemy.',
        1,
        [], 'active',
        10,
        5
    ),
    envenom: createSkill(
        'envenom',
        'Envenom',
        'Imbue your weapon with poison, causing damage over time.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.POISON, diceCount: 1, diceSides: 4 }], 'active',
        8,
        3
    ),
    sneak_attack: createSkill(
        'sneak_attack',
        'Sneak Attack',
        'Attack from behind for increased damage.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 3, diceSides: 8 }], 'active',
        15,
        3
    ),
    evasion: createSkill(
        'evasion',
        'Evasion',
        'Increase evasion chance.',
        0,
        [],
        'passive'
    ),

    // ========== ASSASSIN SPECIALIZATION ==========
    sonic_blow: createSkill(
        'sonic_blow',
        'Sonic Blow',
        'A rapid series of strikes ending with a powerful slash.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.SLASHING, diceCount: 5, diceSides: 10 }], 'active',
        30,
        6
    ),
    cloaking: createSkill(
        'cloaking',
        'Cloaking',
        'Become invisible while moving slowly.',
        0,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.PARALYSIS, duration: 3 }], 'active',
        25,
        8
    ),
    venom_splasher: createSkill(
        'venom_splasher',
        'Venom Splasher',
        'When a poisoned enemy dies, they explode damaging others.',
        0,
        [{ type: EffectType.DAMAGE, damageType: DamageType.POISON, diceCount: 3, diceSides: 8 }],
        'passive'
    ),

    // ========== ROGUE SPECIALIZATION ==========
    snatch: createSkill(
        'snatch',
        'Snatch',
        'Steal an item while damaging the enemy.',
        1,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 2, diceSides: 6 },
        ], 'active',
        15,
        5
    ),
    gank: createSkill(
        'gank',
        'Gank',
        'Attack from behind that damages more and silences.',
        1,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 3, diceSides: 8 },
            { type: EffectType.STATUS, statusType: StatusEffectType.SILENCE, duration: 2 }
        ], 'active',
        20,
        4
    ),
    strip_weapon: createSkill(
        'strip_weapon',
        'Strip Weapon',
        'Disarm an enemy, preventing them from using their weapon.',
        2,
        [], 'active',
        15,
        5
    ),

    // ========== ASSASSIN CROSS (Advanced) ==========
    meteor_assault: createSkill(
        'meteor_assault',
        'Meteor Assault',
        'Launch yourself like a meteor onto an enemy, damaging them and nearby enemies.',
        3,
        [{ type: EffectType.DAMAGE, damageType: DamageType.BLUDGEONING, diceCount: 6, diceSides: 10 }], 'active',
        40,
        8
    ),
    enchant_deadly_poison: createSkill(
        'enchant_deadly_poison',
        'Enchant Deadly Poison',
        'Enhance your poison to be lethal, ignoring resistances.',
        0,
        [], 'active',
        30,
        10
    ),

    // ========== STALKER (Advanced) ==========
    full_strip: createSkill(
        'full_strip',
        'Full Strip',
        'Strip an enemy of weapon, armor, and shield at once.',
        2,
        [], 'active',
        35,
        8
    ),
    preserve: createSkill(
        'preserve',
        'Preserve',
        'Prevent your own buffs from being dispelled.',
        0,
        [],
        'passive'
    ),

    // ========== ARCHER / RANGER SKILLS ==========
    double_strafe: createSkill(
        'double_strafe',
        'Double Strafe',
        'Fire two arrows quickly at an enemy. Can be improved up to level 5.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 1, diceSides: 10 }], 'active',
        12,
        2
    ),
    arrow_shower: createSkill(
        'arrow_shower',
        'Arrow Shower',
        'A rain of arrows that damages a small area.',
        3,
        [{ type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 2, diceSides: 8 }], 'active',
        18,
        4
    ),
    vultures_eye: createSkill(
        'vultures_eye',
        "Vulture's Eye",
        'Passively increases attack range with bow.',
        0,
        [],
        'passive'
    ),
    precise_shot: createSkill(
        'precise_shot',
        'Precise Shot',
        'A precise shot that deals increased damage.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 3, diceSides: 10 }], 'active',
        15,
        3
    ),
    camouflage: createSkill(
        'camouflage',
        'Camouflage',
        'Become harder to detect.',
        0,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.HASTE, duration: 3 }], 'active',
        20,
        5
    ),
    volley: createSkill(
        'volley',
        'Volley',
        'Fire a volley of arrows in all directions.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 4, diceSides: 8 }], 'active',
        25,
        5
    ),

    // ========== HUNTER SPECIALIZATION ==========
    beastmaster: createSkill(
        'beastmaster',
        'Beastmaster',
        'Unlock an animal companion (hawk, wolf) that attacks automatically.',
        0,
        [],
        'passive'
    ),
    blitz_beat: createSkill(
        'blitz_beat',
        'Blitz Beat',
        'Your companion animal executes a devastating attack.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 4, diceSides: 10 }], 'active',
        25,
        5
    ),
    land_mine: createSkill(
        'land_mine',
        'Land Mine',
        'Place a trap that damages and knocks down.',
        3,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 3, diceSides: 8 },
            { type: EffectType.STATUS, statusType: StatusEffectType.STUN, duration: 1 }
        ], 'active',
        20,
        5
    ),

    // ========== BARD SPECIALIZATION ==========
    song_of_bravery: createSkill(
        'song_of_bravery',
        'Song of Bravery',
        'Songs that increase the attack of allies.',
        3,
        [], 'active',
        20,
        5
    ),
    drums_distraction: createSkill(
        'drums_distraction',
        "Drum's Distraction",
        'Music that confuses enemies.',
        3,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.CONFUSION, duration: 2 }], 'active',
        25,
        6
    ),
    musical_knowledge: createSkill(
        'musical_knowledge',
        'Musical Knowledge',
        'Can use musical instruments as weapons.',
        0,
        [],
        'passive'
    ),

    // ========== SNIPER (Advanced) ==========
    focused_arrow_strike: createSkill(
        'focused_arrow_strike',
        'Focused Arrow Strike',
        'A lethal precise shot that can pierce through the target.',
        5,
        [{ type: EffectType.DAMAGE, damageType: DamageType.PIERCING, diceCount: 6, diceSides: 12 }], 'active',
        40,
        8
    ),
    wind_walk: createSkill(
        'wind_walk',
        'Wind Walk',
        'Drastically increase evasion and movement speed.',
        0,
        [
            { type: EffectType.STATUS, statusType: StatusEffectType.HASTE, duration: 4 },
            { type: EffectType.STATUS, statusType: StatusEffectType.SLOW, duration: 4 }
        ], 'active',
        30,
        10
    ),

    // ========== CLOWN (Advanced) ==========
    improvisation: createSkill(
        'improvisation',
        'Improvisation',
        'Your songs have a chance to apply a random secondary effect.',
        0,
        [],
        'passive'
    ),
    tarot_card_of_fate: createSkill(
        'tarot_card_of_fate',
        'Tarot Card of Fate',
        'Launch a card that causes a random effect (from silence to sudden death) on an enemy.',
        4,
        [], 'active',
        35,
        10
    ),

    // ========== MERCHANT / BLACKSMITH SKILLS ==========
    enlarge_weight_limit: createSkill(
        'enlarge_weight_limit',
        'Enlarge Weight Limit',
        'Passively increases carrying capacity. Can be improved up to level 5.',
        0,
        [],
        'passive'
    ),
    discount: createSkill(
        'discount',
        'Discount',
        'Buy items from NPCs cheaper.',
        0,
        [],
        'passive'
    ),
    mammonite: createSkill(
        'mammonite',
        'Mammonite',
        'A strike that spends money to cause extra damage.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.BLUDGEONING, diceCount: 4, diceSides: 8 }], 'active',
        10,
        3
    ),
    hammer_fall: createSkill(
        'hammer_fall',
        'Hammer Fall',
        'Strike the ground with a hammer, damaging and stunning in an area.',
        2,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.BLUDGEONING, diceCount: 3, diceSides: 8 },
            { type: EffectType.STATUS, statusType: StatusEffectType.STUN, duration: 1 }
        ], 'active',
        20,
        4
    ),
    weapon_perfection: createSkill(
        'weapon_perfection',
        'Weapon Perfection',
        'Your weapon never wears and your attack ignores construct defense.',
        0,
        [],
        'passive'
    ),
    forge: createSkill(
        'forge',
        'Forge',
        'Create objects and weapons anywhere.',
        0,
        [], 'active',
        30,
        10
    ),

    // ========== ALCHEMIST SPECIALIZATION ==========
    acid_terror: createSkill(
        'acid_terror',
        'Acid Terror',
        'Throw an acid flask that damages and corrodes enemy armor.',
        2,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.ACID, diceCount: 2, diceSides: 8 },
            { type: EffectType.STATUS, statusType: StatusEffectType.VULNERABLE, duration: 3 }
        ], 'active',
        18,
        4
    ),
    bomb: createSkill(
        'bomb',
        'Bomb',
        'Throw an explosive potion that damages in an area.',
        3,
        [{ type: EffectType.DAMAGE, damageType: DamageType.FIRE, diceCount: 4, diceSides: 8 }], 'active',
        25,
        5
    ),
    homunculus: createSkill(
        'homunculus',
        'Homunculus',
        'Create an alchemical creature that assists you in combat.',
        0,
        [], 'active',
        40,
        15
    ),

    // ========== WHITESMITH (Advanced) ==========
    weaponry_research: createSkill(
        'weaponry_research',
        'Weaponry Research',
        'Passively increases damage of all party weapons.',
        0,
        [],
        'passive'
    ),
    over_thrust: createSkill(
        'over_thrust',
        'Over Thrust',
        'Drastically increase physical attack, but with risk of damaging the weapon.',
        0,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.RAGE, duration: 3 }], 'active',
        35,
        8
    ),

    // ========== CREATOR (Advanced) ==========
    biology_research: createSkill(
        'biology_research',
        'Biology Research',
        'Improve your Homunculus, granting new abilities.',
        0,
        [],
        'passive'
    ),
    slim_potion_pitcher: createSkill(
        'slim_potion_pitcher',
        'Slim Potion Pitcher',
        'Throw potions to heal or buff multiple allies at once.',
        4,
        [{ type: EffectType.HEAL, fixedValue: 35 }], 'active',
        30,
        6
    ),

    // ========== ADDITIONAL FIGHTER/PALADIN SKILLS ==========
    action_surge: createSkill(
        'action_surge',
        'Action Surge',
        'Gain an additional action in combat.',
        0,
        [], 'active',
        25,
        8
    ),
    maneuver: createSkill(
        'maneuver',
        'Maneuver',
        'Tactical maneuver that provides combat advantage.',
        2,
        [], 'active',
        15,
        4
    ),
    divine_smite: createSkill(
        'divine_smite',
        'Divine Smite',
        'A holy strike that deals additional radiant damage.',
        1,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.SLASHING, diceCount: 2, diceSides: 8 },
            { type: EffectType.DAMAGE, damageType: DamageType.RADIANT, diceCount: 2, diceSides: 6 }
        ], 'active',
        20,
        4
    ),
    lay_on_hands: createSkill(
        'lay_on_hands',
        'Lay on Hands',
        'Restore health using holy power.',
        2,
        [{ type: EffectType.HEAL, fixedValue: 45 }], 'active',
        25,
        6
    ),

    // ========== ADDITIONAL CLASS SKILLS ==========
    reckless_attack: createSkill(
        'reckless_attack',
        'Reckless Attack',
        'Attack with desperation, gaining power but taking more damage.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.SLASHING, diceCount: 3, diceSides: 10 }], 'active',
        15,
        3
    ),
    rage: createSkill(
        'rage',
        'Rage',
        'Enter a rage state that increases damage.',
        0,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.RAGE, duration: 3 }], 'active',
        20,
        5
    ),
    intimidating_presence: createSkill(
        'intimidating_presence',
        'Intimidating Presence',
        'Frighten nearby enemies.',
        2,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.FRIGHTENED, duration: 2 }], 'active',
        15,
        4
    ),
    primal_path: createSkill(
        'primal_path',
        'Primal Path',
        'Unlock primal combat techniques.',
        0,
        [],
        'passive'
    ),

    // ========== SORCERER/WARLOCK/BARD/DRUID SKILLS ==========
    font_of_magic: createSkill(
        'font_of_magic',
        'Font of Magic',
        'Access to magical reserve for flexible spellcasting.',
        0,
        [],
        'passive'
    ),
    chromatic_orb: createSkill(
        'chromatic_orb',
        'Chromatic Orb',
        'Versatile elemental projectile.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.MAGIC, diceCount: 2, diceSides: 8 }], 'active',
        12,
        2
    ),
    mage_armor: createSkill(
        'mage_armor',
        'Mage Armor',
        'Magical armor that protects.',
        0,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.SHIELD, duration: 4 }], 'active',
        10,
        3
    ),
    tides_of_chaos: createSkill(
        'tides_of_chaos',
        'Tides of Chaos',
        'Unleash unpredictable wild magic.',
        3,
        [{ type: EffectType.DAMAGE, damageType: DamageType.MAGIC, diceCount: 4, diceSides: 10 }], 'active',
        25,
        6
    ),
    eldritch_invocations: createSkill(
        'eldritch_invocations',
        'Eldritch Invocations',
        'Unlock eldritch abilities from your patron.',
        0,
        [],
        'passive'
    ),
    eldritch_blast: createSkill(
        'eldritch_blast',
        'Eldritch Blast',
        'A beam of crackling energy.',
        4,
        [{ type: EffectType.DAMAGE, damageType: DamageType.FORCE, diceCount: 2, diceSides: 10 }], 'active',
        12,
        2
    ),
    hex: createSkill(
        'hex',
        'Hex',
        'Curse an enemy, dealing extra damage each hit.',
        3,
        [{ type: EffectType.DAMAGE, damageType: DamageType.NECROTIC, diceCount: 1, diceSides: 6 }], 'active',
        18,
        4
    ),
    mystic_arcane: createSkill(
        'mystic_arcane',
        'Mystic Arcane',
        'Unlock advanced eldritch secrets.',
        0,
        [],
        'passive'
    ),
    wild_shape: createSkill(
        'wild_shape',
        'Wild Shape',
        'Transform into an animal form.',
        0,
        [], 'active',
        30,
        8
    ),
    entangle: createSkill(
        'entangle',
        'Entangle',
        'Cause plants to grasp enemies.',
        3,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.SLOW, duration: 3 }], 'active',
        15,
        3
    ),
    goodberry: createSkill(
        'goodberry',
        'Goodberry',
        'Create magical berries that heal.',
        0,
        [{ type: EffectType.HEAL, fixedValue: 20 }], 'active',
        10,
        4
    ),
    moonbeam: createSkill(
        'moonbeam',
        'Moonbeam',
        'A beam of moonlight that damages enemies.',
        3,
        [{ type: EffectType.DAMAGE, damageType: DamageType.RADIANT, diceCount: 3, diceSides: 10 }], 'active',
        25,
        5
    ),
    jack_of_all_trades: createSkill(
        'jack_of_all_trades',
        'Jack of All Trades',
        'Add half proficiency bonus to ability checks.',
        0,
        [],
        'passive'
    ),
    vicious_mockery: createSkill(
        'vicious_mockery',
        'Vicious Mockery',
        'A mocking remark that damages and may impair.',
        4,
        [
            { type: EffectType.DAMAGE, damageType: DamageType.PSYCHIC, diceCount: 1, diceSides: 8 },
            { type: EffectType.STATUS, statusType: StatusEffectType.VULNERABLE, duration: 1, chance: 25 }
        ], 'active',
        8,
        2
    ),
    healing_word: createSkill(
        'healing_word',
        'Healing Word',
        'A bonus action heal.',
        4,
        [{ type: EffectType.HEAL, fixedValue: 25 }], 'active',
        10,
        2
    ),
    inspire: createSkill(
        'inspire',
        'Inspire',
        'Inspire allies to fight harder.',
        3,
        [], 'active',
        20,
        5
    ),

    // ========== COMBAT ACTIONS ==========
    attack: createSkill(
        'attack',
        'Attack',
        'Make a basic attack.',
        1,
        [{ type: EffectType.DAMAGE, damageType: DamageType.SLASHING, diceCount: 1, diceSides: 8 }]
    ),
    wait: createSkill(
        'wait',
        'Wait',
        'Skip your turn to act later.',
        0,
        []
    ),
    defend_action: createSkill(
        'defend_action',
        'Defend',
        'Take a defensive stance.',
        0,
        [{ type: EffectType.STATUS, statusType: StatusEffectType.SHIELD, duration: 1 }]
    ),
};
