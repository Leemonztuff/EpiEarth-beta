
import { Attributes, Ability, PositionComponent, BattleCell, Entity, CombatStatsComponent, CharacterClass, EquipmentSlot, Difficulty, DamageType, ItemRarity, CharacterRace, CreatureType, EnemyDefinition, DerivedStats, MovementType, Dimension } from '../types';
import { DIFFICULTY_SETTINGS, BASE_STATS, XP_TABLE, CORRUPTION_THRESHOLDS } from '../constants';

export const getModifier = (score: number): number => {
  return Math.floor(((score || 10) - 10) / 2);
};

export const getProficiencyBonus = (level: number): number => {
    return Math.floor(((level || 1) - 1) / 4) + 2;
};

export const rollDice = (sides: number, count: number = 1): number => {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * (sides || 1)) + 1; 
  }
  return total;
};

export const rollD20 = (type: 'normal' | 'advantage' | 'disadvantage' = 'normal'): { result: number, raw: number[] } => {
  const r1 = Math.floor(Math.random() * 20) + 1;
  const r2 = Math.floor(Math.random() * 20) + 1;

  if (type === 'advantage') {
    return { result: Math.max(r1, r2), raw: [r1, r2] };
  } else if (type === 'disadvantage') {
    return { result: Math.min(r1, r2), raw: [r1, r2] };
  }
  return { result: r1, raw: [r1] };
};

export const calculateDerivedStats = (attributes: Attributes, cls: CharacterClass, level: number, equipment?: any): DerivedStats => {
    const str = attributes.STR;
    const dex = attributes.DEX;
    const con = attributes.CON;
    const int = attributes.INT;
    const wis = attributes.WIS;

    const atk = str + (equipment?.main_hand?.equipmentStats?.diceCount ? (equipment.main_hand.equipmentStats.diceCount * equipment.main_hand.equipmentStats.diceSides / 2) : 0);
    const def = con + (equipment?.body?.equipmentStats?.ac || 0);
    const mag = Math.max(int, wis) * 1.5;
    const spd = dex;
    const crit = dex + (level * 0.5);
    
    const mpFactor = (cls === CharacterClass.WIZARD || cls === CharacterClass.SORCERER || cls === CharacterClass.CLERIC) ? 5 : 2;
    const maxMp = Math.floor(Math.max(int, wis) * mpFactor);

    return {
        atk: Math.floor(atk),
        def: Math.floor(def),
        mag: Math.floor(mag),
        spd: Math.floor(spd),
        crit: Math.floor(crit),
        mp: maxMp,
        maxMp: maxMp
    };
};

export const calculateAC = (dex: number, armorBase: number = 10, hasShield: boolean = false, armorType: 'light'|'medium'|'heavy' = 'light', statusEffects?: any[]): number => {
  let dexBonus = getModifier(dex);
  if (armorType === 'medium') dexBonus = Math.min(2, dexBonus);
  if (armorType === 'heavy') dexBonus = 0;
  
  let bonus = 0;
  if (statusEffects?.some(s => s.type === 'SHIELD')) bonus += 5;
  if (statusEffects?.some(s => s.type === 'HASTE')) bonus += 2;

  return armorBase + dexBonus + (hasShield ? 2 : 0) + bonus;
};

export const calculateHp = (level: number, con: number, hitDie: number, race?: CharacterRace): number => {
  const mod = getModifier(con);
  const baseHp = (hitDie + mod) + ((level - 1) * (Math.floor(hitDie / 2) + 1 + mod));
  const raceBonus = race === CharacterRace.DWARF ? level : 0;
  return Math.floor((baseHp + raceBonus) * 1.5);
};

export const calculateAttackRoll = (attacker: any, target?: any, dimension: Dimension = Dimension.NORMAL) => {
    const stats = attacker?.stats || {};
    let hasAdvantage = false;
    let hasDisadvantage = false;
    
    if (stats.activeStatusEffects?.some(s => s.type === 'HASTE')) hasAdvantage = true;
    if (stats.activeStatusEffects?.some(s => s.type === 'SLOW')) hasDisadvantage = true;

    // MECÁNICA DE PENUMBRA (Shadow Realm)
    if (dimension === Dimension.UPSIDE_DOWN && target) {
        const dist = Math.max(Math.abs(attacker.position.x - target.position.x), Math.abs(attacker.position.y - target.position.y));
        if (dist > 3) hasDisadvantage = true; // El aura oscura oculta a enemigos lejanos
    }

    let rollType: 'normal' | 'advantage' | 'disadvantage' = 'normal';
    if (hasAdvantage && !hasDisadvantage) rollType = 'advantage';
    else if (!hasAdvantage && hasDisadvantage) rollType = 'disadvantage';
    
    const critThreshold = stats.traits?.includes('CRIT_FOCUS') ? 19 : 20;
    const roll = rollD20(rollType);
    const mod = getRelevantAbilityMod(attacker, attacker.equipment?.[EquipmentSlot.MAIN_HAND]);
    const prof = getProficiencyBonus(stats.level || 1);
    
    const total = roll.result + mod + prof;

    return { 
        total, 
        isCrit: roll.result >= critThreshold, 
        isAutoMiss: roll.result === 1, 
        roll: roll.result, 
        mod, 
        prof, 
        rollType
    };
};

export const calculateHitChance = (attacker: any, target: any, dimension: Dimension = Dimension.NORMAL): number => {
    if (!attacker || !attacker.stats || !target || !target.stats) return 0;
    const atkRoll = calculateAttackRoll(attacker, target, dimension);
    const targetAC = target.stats.ac;
    const requiredRoll = targetAC - (atkRoll.mod + atkRoll.prof);
    let winningOutcomes = 21 - requiredRoll;
    if (winningOutcomes > 20) winningOutcomes = 20; 
    if (winningOutcomes < 1) winningOutcomes = 1;
    let probability = winningOutcomes / 20;
    
    if (atkRoll.rollType === 'advantage') probability = 1 - Math.pow((1 - probability), 2);
    if (atkRoll.rollType === 'disadvantage') probability = Math.pow(probability, 2);
    
    return Math.round(Math.max(5, Math.min(99, probability * 100)));
};

export const calculateDamage = (
    attacker: any, 
    weaponSlot: EquipmentSlot = EquipmentSlot.MAIN_HAND, 
    isCrit: boolean = false,
    target?: any,
    isFlanking?: boolean
): { amount: number, type: DamageType, isMagical: boolean, isSneakAttack?: boolean } => {
    if (!attacker || !attacker.stats) return { amount: 0, type: DamageType.BLUDGEONING, isMagical: false };

    let extraDamage = 0;
    let appliedSneak = false;

    if (attacker.stats.traits?.includes('SNEAK_ATTACK') && isFlanking) {
        const sneakDice = Math.ceil(attacker.stats.level / 2);
        extraDamage += rollDice(6, sneakDice);
        appliedSneak = true;
    }

    if (attacker.stats.activeStatusEffects?.some(s => s.type === 'RAGE')) {
        extraDamage += 2;
    }

    const equipment = attacker?.equipment || {};
    const weapon = equipment[weaponSlot];
    const damageType = weapon?.equipmentStats?.damageType || DamageType.BLUDGEONING;
    const isMagical = weapon?.equipmentStats?.properties?.includes('Magical') || false;

    let diceCount = weapon?.equipmentStats?.diceCount || 1;
    let diceSides = weapon?.equipmentStats?.diceSides || 4; 
    const mod = getRelevantAbilityMod(attacker, weapon);
    
    if (isCrit) diceCount *= 2;

    const baseDmg = rollDice(diceSides, diceCount) + mod;
    return { amount: Math.max(1, baseDmg + extraDamage), type: damageType, isMagical, isSneakAttack: appliedSneak };
};

export const calculateFinalDamage = (amount: number, type: DamageType, target: any): { finalDamage: number, isResistant: boolean, isVulnerable: boolean } => {
    const stats = target?.stats;
    if (!stats) return { finalDamage: amount, isResistant: false, isVulnerable: false };
    let multiplier = 1;
    let isResistant = false;
    let isVulnerable = false;
    if (stats.resistances?.includes(type)) { multiplier *= 0.5; isResistant = true; }
    if (stats.vulnerabilities?.includes(type)) { multiplier *= 2; isVulnerable = true; }
    const finalDamage = Math.max(0, Math.floor(amount * multiplier));
    return { finalDamage, isResistant, isVulnerable };
};

export const getRelevantAbilityMod = (attacker: any, weapon: any): number => {
    const attributes = attacker?.stats?.attributes || { STR: 10, DEX: 10 };
    // Ranged weapons and Finesse weapons use DEX if higher
    if (weapon?.equipmentStats?.properties?.includes('Range')) return getModifier(attributes.DEX);
    if (weapon?.equipmentStats?.properties?.includes('Finesse')) return Math.max(getModifier(attributes.STR), getModifier(attributes.DEX));
    return getModifier(attributes.STR);
};

export const getAttackRange = (entity: any): number => {
    if (!entity) return 1.5;
    const weapon = entity.equipment?.[EquipmentSlot.MAIN_HAND];
    
    let baseRange = 1.5;
    if (weapon?.equipmentStats?.properties?.includes('Range')) {
        baseRange = 8; // Rango estándar de arcos en grilla
    }
    
    // Bono de Clase: Rangers tienen mejor ojo y precisión
    if (entity.stats?.class === CharacterClass.RANGER) {
        baseRange += 2;
    }

    return baseRange;
};

export const getAoETiles = (center: PositionComponent, target: PositionComponent, type: 'CIRCLE' | 'CONE', radius: number): {x: number, y: number}[] => {
    const tiles: {x: number, y: number}[] = [];
    if (type === 'CIRCLE') {
        for (let x = target.x - radius; x <= target.x + radius; x++) {
            for (let y = target.y - radius; y <= target.y + radius; y++) {
                if (Math.sqrt(Math.pow(x - target.x, 2) + Math.pow(y - target.y, 2)) <= radius) tiles.push({ x, y });
            }
        }
    }
    return tiles;
};

export const checkLineOfSight = (start: PositionComponent, end: PositionComponent, map: BattleCell[]): boolean => true;
export const getDamageRange = (attacker: any): string => {
    const weapon = attacker.equipment?.[EquipmentSlot.MAIN_HAND];
    const diceCount = weapon?.equipmentStats?.diceCount || 1;
    const diceSides = weapon?.equipmentStats?.diceSides || 4;
    const mod = getRelevantAbilityMod(attacker, weapon);
    return `${diceCount + mod}-${(diceCount * diceSides) + mod}`;
};
export const isFlanking = (attacker: any, target: any, all: any[]): boolean => {
    const dist = Math.abs(attacker.position.x - target.position.x) + Math.abs(attacker.position.y - target.position.y);
    return dist === 1; 
};

export const calculateVisionRange = (wis: number, corruption: number = 0): number => {
  const mod = getModifier(wis);
  const corruptionPenalty = Math.floor(corruption / 25);
  return Math.max(2, 4 + mod - corruptionPenalty);
};

export const getCorruptionPenalty = (corruption: number): number => {
  if (corruption >= 100) return 10;
  if (corruption >= 75) return 5;
  if (corruption >= 50) return 2;
  return 0;
};

export const calculateEnemyStats = (def: EnemyDefinition, playerLevel: number, difficulty: Difficulty): CombatStatsComponent => {
    const diffMod = DIFFICULTY_SETTINGS[difficulty].enemyStatMod;
    const levelMod = 1 + (playerLevel - 1) * 0.15;
    
    const finalHp = Math.floor(def.hp * levelMod * diffMod);
    const attributes: Attributes = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };

    return {
        level: playerLevel,
        class: CharacterClass.FIGHTER,
        xp: 0,
        xpToNextLevel: 1000,
        hp: finalHp,
        maxHp: finalHp,
        stamina: 50,
        maxStamina: 50,
        ac: def.ac,
        initiativeBonus: def.initiativeBonus,
        speed: 30,
        movementType: MovementType.WALK,
        attributes,
        baseAttributes: attributes,
        spellSlots: { current: 0, max: 0 },
        activeCooldowns: {},
        activeStatusEffects: [],
        resistances: def.resistances || [],
        vulnerabilities: def.vulnerabilities || [],
        immunities: def.immunities || [],
        xpReward: def.xpReward,
        creatureType: def.type,
        derived: calculateDerivedStats(attributes, CharacterClass.FIGHTER, playerLevel)
    };
};
