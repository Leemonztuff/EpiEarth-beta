
import { CharacterClass, CharacterRace, Attributes, ItemRarity, DamageType, Ability, CombatStatsComponent } from '../types';
// Fix: Removed non-existent and unused RACE_SKILLS import from constants
import { RACE_BONUS, CLASS_TREES } from '../constants';
import { useContentStore } from '../store/contentStore';
import { rollDice, getModifier } from './dndRules';

const fnv1a = (str: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

class SeededRNG {
    private seed: number;
    constructor(seed: number) { this.seed = seed; }
    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    range(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    pick<T>(array: T[]): T {
        return array[this.range(0, array.length - 1)];
    }
}

const TRAITS = ['Brave', 'Stoic', 'Reckless', 'Wise', 'Loyal', 'Mystic', 'Brutal', 'Swift', 'Arcane-Blessed', 'Giant-Slayer'];
const NAMES_PREFIX = ['Aer', 'Thal', 'Mor', 'Zyl', 'Kael', 'Vor', 'Lun', 'Pyr', 'Syl', 'Drak', 'Grim', 'Fen'];
const NAMES_SUFFIX = ['on', 'ia', 'us', 'ar', 'en', 'is', 'a', 'or', 'ix', 'um', 'ash', 'os'];

export interface SummonInfluence {
    r: number; // STR / Physical
    g: number; // CON / Nature
    b: number; // INT / Magic
}

export interface SummonResult {
    name: string;
    race: CharacterRace;
    class: CharacterClass;
    baseAttributes: Attributes;
    rarity: ItemRarity;
    affinity: DamageType;
    traits: string[];
    potential: number;
}

export const SummoningService = {
    generateFromSeed: (rawData: string, highPotential: boolean = false, influence?: SummonInfluence): SummonResult => {
        const hash = fnv1a(rawData);
        const rng = new SeededRNG(hash);
        const classStats = useContentStore.getState().classStats;

        // 1. Determine Rarity
        const roll = rng.next() * 100;
        let rarity = ItemRarity.COMMON;
        let statBonus = 0;
        
        if (highPotential) {
            if (roll > 85) { rarity = ItemRarity.LEGENDARY; statBonus = 10; }
            else if (roll > 50) { rarity = ItemRarity.VERY_RARE; statBonus = 6; }
            else { rarity = ItemRarity.RARE; statBonus = 4; }
        } else {
            if (roll > 98) { rarity = ItemRarity.LEGENDARY; statBonus = 8; }
            else if (roll > 90) { rarity = ItemRarity.VERY_RARE; statBonus = 5; }
            else if (roll > 75) { rarity = ItemRarity.RARE; statBonus = 3; }
            else if (roll > 40) { rarity = ItemRarity.UNCOMMON; statBonus = 1; }
        }

        // 2. Influence Class/Race by Color
        let clsChoices = Object.values(CharacterClass);
        let raceChoices = Object.values(CharacterRace);

        if (influence) {
            const { r, g, b } = influence;
            if (r > g && r > b) { // Red Influence -> Combat
                clsChoices = [CharacterClass.FIGHTER, CharacterClass.BARBARIAN, CharacterClass.PALADIN];
                raceChoices = [CharacterRace.HALF_ORC, CharacterRace.DRAGONBORN, CharacterRace.HUMAN];
            } else if (b > r && b > g) { // Blue Influence -> Magic
                clsChoices = [CharacterClass.WIZARD, CharacterClass.SORCERER, CharacterClass.WARLOCK];
                raceChoices = [CharacterRace.ELF, CharacterRace.GNOME, CharacterRace.TIEFLING];
            } else if (g > r && g > b) { // Green Influence -> Nature/Agility
                clsChoices = [CharacterClass.RANGER, CharacterClass.DRUID, CharacterClass.ROGUE];
                raceChoices = [CharacterRace.HALFLING, CharacterRace.ELF, CharacterRace.GNOME];
            }
        }

        const cls = rng.pick(clsChoices);
        const race = rng.pick(raceChoices);
        const name = rng.pick(NAMES_PREFIX) + rng.pick(NAMES_SUFFIX);

        const base = { ...(classStats[cls] || { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }) };
        const raceBonus = RACE_BONUS[race];
        
        (Object.keys(base) as Ability[]).forEach(k => { if (raceBonus[k]) base[k] += raceBonus[k]!; });

        // Variance
        (Object.keys(base) as Ability[]).forEach(k => { base[k] += rng.range(-1, 2); });

        // Add Rarity Bonus influenced by colors
        for(let i=0; i<statBonus; i++) {
            let targetAttr: Ability = rng.pick(Object.keys(base) as Ability[]);
            if (influence) {
                const total = influence.r + influence.g + influence.b;
                const rand = rng.next() * total;
                if (rand < influence.r) targetAttr = Ability.STR;
                else if (rand < influence.r + influence.g) targetAttr = Ability.CON;
                else targetAttr = Ability.INT;
            }
            base[targetAttr] += 1;
        }

        const affinities = [DamageType.FIRE, DamageType.COLD, DamageType.LIGHTNING, DamageType.RADIANT, DamageType.NECROTIC, DamageType.POISON];
        const affinity = rng.pick(affinities);

        const traits = [];
        const traitCount = rarity === ItemRarity.LEGENDARY ? 3 : (rarity === ItemRarity.COMMON ? 0 : 1);
        for(let i=0; i<traitCount; i++) { traits.push(rng.pick(TRAITS)); }

        const totalStats = (Object.values(base) as number[]).reduce((a, b) => a + b, 0);
        const potential = Math.min(100, Math.floor((totalStats / 100) * 100));

        return { name, race, class: cls, baseAttributes: base, rarity, affinity, traits: [...new Set(traits)], potential };
    }
};
