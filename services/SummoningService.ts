
import { CharacterClass, CharacterRace, Attributes, ItemRarity, DamageType, Ability, CombatStatsComponent } from '../types';
import { RACE_BONUS, CLASS_TREES, RACE_SKILLS } from '../constants';
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
    generateFromSeed: (rawData: string, highPotential: boolean = false): SummonResult => {
        const hash = fnv1a(rawData);
        const rng = new SeededRNG(hash);
        const classStats = useContentStore.getState().classStats;

        // 1. Determine Rarity (Improved odds for Dungeon Reward)
        const roll = rng.next() * 100;
        let rarity = ItemRarity.COMMON;
        let statBonus = 0;
        
        if (highPotential) {
            // High Potential Rates: 15% Legendary, 35% Very Rare, 50% Rare
            if (roll > 85) { rarity = ItemRarity.LEGENDARY; statBonus = 8; }
            else if (roll > 50) { rarity = ItemRarity.VERY_RARE; statBonus = 5; }
            else { rarity = ItemRarity.RARE; statBonus = 3; }
        } else {
            // Normal Rates
            if (roll > 98) { rarity = ItemRarity.LEGENDARY; statBonus = 6; }
            else if (roll > 90) { rarity = ItemRarity.VERY_RARE; statBonus = 4; }
            else if (roll > 75) { rarity = ItemRarity.RARE; statBonus = 2; }
            else if (roll > 50) { rarity = ItemRarity.UNCOMMON; statBonus = 1; }
        }

        const cls = rng.pick(Object.values(CharacterClass));
        const race = rng.pick(Object.values(CharacterRace));
        const name = rng.pick(NAMES_PREFIX) + rng.pick(NAMES_SUFFIX);

        const base = { ...(classStats[cls] || { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }) };
        const raceBonus = RACE_BONUS[race];
        
        (Object.keys(base) as Ability[]).forEach(k => { if (raceBonus[k]) base[k] += raceBonus[k]!; });

        // Add Random Variance
        (Object.keys(base) as Ability[]).forEach(k => { base[k] += rng.range(-1, 2); });

        // Add Rarity Bonus
        for(let i=0; i<statBonus; i++) {
            const attr = rng.pick(Object.keys(base) as Ability[]);
            base[attr] += 1;
        }

        const affinities = [DamageType.FIRE, DamageType.COLD, DamageType.LIGHTNING, DamageType.RADIANT, DamageType.NECROTIC, DamageType.POISON];
        const affinity = rng.pick(affinities);

        const traits = [];
        const traitCount = rarity === ItemRarity.LEGENDARY ? 3 : (rarity === ItemRarity.COMMON ? 0 : 1);
        for(let i=0; i<traitCount; i++) { traits.push(rng.pick(TRAITS)); }

        const totalStats = (Object.values(base) as number[]).reduce((a, b) => a + b, 0);
        const potential = Math.min(100, Math.floor((totalStats / 95) * 100));

        return { name, race, class: cls, baseAttributes: base, rarity, affinity, traits: [...new Set(traits)], potential };
    }
};
