
import { Attributes, Ability, PositionComponent, BattleCell, Entity, CombatStatsComponent, CharacterClass, EquipmentSlot, Difficulty, DamageType, ItemRarity, CharacterRace, CreatureType, EnemyDefinition, DerivedStats, MovementType, Dimension, StatusEffectType } from '../types';
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

// --- NUEVA LÓGICA TÁCTICA ---

export const calculateTacticalBonuses = (attacker: Entity, target: Entity, map: BattleCell[]) => {
    const attackerCell = map.find(c => c.x === attacker.position?.x && c.z === attacker.position?.y);
    const targetCell = map.find(c => c.x === target.position?.x && c.z === target.position?.y);
    
    if (!attackerCell || !targetCell) return { attackMod: 0, damageMod: 0, hasAdvantage: false };

    const heightDiff = attackerCell.height - targetCell.height;
    let attackMod = 0;
    let damageMod = 0;
    let hasAdvantage = false;

    // Ventaja por Altura (High Ground)
    if (heightDiff >= 2) {
        attackMod += 2;
        damageMod += rollDice(4, 1);
        hasAdvantage = true;
    } else if (heightDiff <= -2) {
        attackMod -= 2; // Desventaja por estar abajo
    }

    return { attackMod, damageMod, hasAdvantage };
};

export const calculateAttackRoll = (attacker: Entity, target?: Entity, dimension: Dimension = Dimension.NORMAL, allEntities: Entity[] = [], map: BattleCell[] = []) => {
    const stats = attacker.stats;
    let hasAdvantage = false;
    let hasDisadvantage = false;
    let bonusMod = 0;
    
    if (stats.activeStatusEffects?.some(s => s.type === StatusEffectType.HASTE)) hasAdvantage = true;
    if (stats.activeStatusEffects?.some(s => s.type === StatusEffectType.SLOW)) hasDisadvantage = true;

    // Tactical Check
    if (target && map.length > 0) {
        const tactical = calculateTacticalBonuses(attacker, target, map);
        bonusMod += tactical.attackMod;
        if (tactical.hasAdvantage) hasAdvantage = true;
    }

    let rollType: 'normal' | 'advantage' | 'disadvantage' = 'normal';
    if (hasAdvantage && !hasDisadvantage) rollType = 'advantage';
    else if (!hasAdvantage && hasDisadvantage) rollType = 'disadvantage';
    
    const critThreshold = stats.traits?.includes('CRIT_FOCUS') ? 19 : 20;
    const roll = rollD20(rollType);
    const mod = getRelevantAbilityMod(attacker, attacker.equipment?.[EquipmentSlot.MAIN_HAND]);
    const prof = getProficiencyBonus(stats.level || 1);
    const total = roll.result + mod + prof + bonusMod;

    return { total, isCrit: roll.result >= critThreshold, isAutoMiss: roll.result === 1, roll: roll.result, mod, prof, rollType };
};

export const calculateDamage = (attacker: any, weaponSlot: EquipmentSlot = EquipmentSlot.MAIN_HAND, isCrit: boolean = false, target?: any, map: BattleCell[] = []) => {
    if (!attacker || !attacker.stats) return { amount: 0, type: DamageType.BLUDGEONING, isMagical: false };
    
    let extraDamage = 0;
    
    // Bono de altura en daño
    if (target && map.length > 0) {
        const tactical = calculateTacticalBonuses(attacker, target, map);
        extraDamage += tactical.damageMod;
    }

    if (attacker.stats.activeStatusEffects?.some(s => s.type === 'RAGE')) extraDamage += 2;
    
    const weapon = attacker?.equipment?.[weaponSlot];
    const damageType = weapon?.equipmentStats?.damageType || DamageType.BLUDGEONING;
    const isMagical = weapon?.equipmentStats?.properties?.includes('Magical') || false;
    let diceCount = weapon?.equipmentStats?.diceCount || 1;
    let diceSides = weapon?.equipmentStats?.diceSides || 4; 
    
    const mod = getRelevantAbilityMod(attacker, weapon);
    if (isCrit) diceCount *= 2;
    
    const baseDmg = rollDice(diceSides, diceCount) + mod;
    return { amount: Math.max(1, baseDmg + extraDamage), type: damageType, isMagical };
};

// Fixed: Added missing calculateFinalDamage function to handle resistances and vulnerabilities
export const calculateFinalDamage = (amount: number, type: DamageType, target: Entity): { finalDamage: number } => {
    if (!target || !target.stats) return { finalDamage: amount };
    
    let multiplier = 1.0;
    const stats = target.stats;
    if (stats.immunities?.includes(type)) multiplier = 0;
    else if (stats.resistances?.includes(type)) multiplier = 0.5;
    else if (stats.vulnerabilities?.includes(type)) multiplier = 2.0;
    
    return { finalDamage: Math.floor(amount * multiplier) };
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
        maxMp: maxMp,
        thriller: 0 
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

export const getRelevantAbilityMod = (attacker: any, weapon: any): number => {
    const attributes = attacker?.stats?.attributes || { STR: 10, DEX: 10 };
    if (weapon?.equipmentStats?.properties?.includes('Range')) return getModifier(attributes.DEX);
    if (weapon?.equipmentStats?.properties?.includes('Finesse')) return Math.max(getModifier(attributes.STR), getModifier(attributes.DEX));
    return getModifier(attributes.STR);
};

export const getAttackRange = (entity: any): number => {
    if (!entity) return 1.5;
    const weapon = entity.equipment?.[EquipmentSlot.MAIN_HAND];
    let baseRange = 1.5;
    if (weapon?.equipmentStats?.properties?.includes('Range')) baseRange = 8; 
    if (entity.stats?.class === CharacterClass.RANGER) baseRange += 2;
    return baseRange;
};

export const calculateVisionRange = (wis: number, corruption: number = 0, worldTime: number = 480, dimension: Dimension = Dimension.NORMAL): number => {
  const mod = getModifier(wis);
  const corruptionPenalty = Math.floor((corruption || 0) / 25);
  const hours = Math.floor(worldTime / 60);
  const isNight = hours < 6 || hours >= 22;
  
  let baseVision = 5;
  if (dimension === Dimension.UPSIDE_DOWN) baseVision = 3;

  const nightPenalty = isNight ? 3 : 0; 
  return Math.max(1, baseVision + mod - corruptionPenalty - nightPenalty);
};

export const calculateEnemyStats = (def: EnemyDefinition, playerLevel: number, difficulty: Difficulty): CombatStatsComponent => {
    const diffMod = DIFFICULTY_SETTINGS[difficulty].enemyStatMod;
    const levelMod = 1 + (playerLevel - 1) * 0.15;
    const finalHp = Math.floor(def.hp * levelMod * diffMod);
    const attributes: Attributes = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    return {
        level: playerLevel, class: CharacterClass.FIGHTER, xp: 0, xpToNextLevel: 1000, hp: finalHp, maxHp: finalHp, stamina: 50, maxStamina: 50, ac: def.ac, initiativeBonus: def.initiativeBonus, speed: 30, movementType: MovementType.WALK, attributes, baseAttributes: attributes, spellSlots: { current: 0, max: 0 }, activeCooldowns: {}, activeStatusEffects: [], resistances: def.resistances || [], vulnerabilities: def.vulnerabilities || [], immunities: def.immunities || [], xpReward: def.xpReward, creatureType: def.type, derived: calculateDerivedStats(attributes, CharacterClass.FIGHTER, playerLevel)
    };
};
