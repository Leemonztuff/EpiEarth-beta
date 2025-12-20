
// @ts-nocheck
import { StateCreator } from 'zustand';
import { CharacterRace, CharacterClass, Attributes, Difficulty, EquipmentSlot, Item, Ability, Entity, CombatStatsComponent, VisualComponent, Dimension, GameState, CreatureType, ItemRarity, MovementType } from '../../types';
import { calculateHp, getModifier, calculateVisionRange, getCorruptionPenalty, rollDice, calculateDerivedStats } from '../../services/dndRules';
import { BASE_STATS, RACE_BONUS, XP_TABLE, getSprite, CLASS_TREES, ITEMS } from '../../constants';
import { sfx } from '../../services/SoundSystem';
import { useContentStore } from '../contentStore';
import { SummoningService } from '../../services/SummoningService';
import { WorldGenerator } from '../../services/WorldGenerator';

const generateId = () => Math.random().toString(36).substr(2, 9);

export interface PlayerSlice {
  party: (Entity & { stats: CombatStatsComponent, visual: VisualComponent })[];
  characterPool: (Entity & { stats: CombatStatsComponent, visual: VisualComponent })[]; 
  hasHighPotentialSummon: boolean; 
  createCharacter: (name: string, race: CharacterRace, cls: CharacterClass, stats: Attributes, difficulty: Difficulty) => void;
  recalculateStats: (entity: Entity & { stats: CombatStatsComponent }) => CombatStatsComponent;
  applyLevelUp: (characterId: string, bonusAttributes: Partial<Attributes>, selectedChoices?: string[]) => void;
  summonCharacter: (seed: string, method: 'FORCE' | 'STABILIZE') => void;
  swapPartyMember: (partyIndex: number, poolIndex: number) => void;
  addToParty: (poolIndex: number) => void;
  removeFromParty: (partyIndex: number) => void;
  addPartyXp: (amount: number) => void;
}

const getHitDie = (cls: CharacterClass) => {
    if (cls === CharacterClass.BARBARIAN) return 12;
    if ([CharacterClass.FIGHTER, CharacterClass.PALADIN, CharacterClass.RANGER].includes(cls)) return 10;
    if ([CharacterClass.WIZARD, CharacterClass.SORCERER].includes(cls)) return 6;
    return 8; 
}

const calculateMaxStamina = (con: number, level: number) => {
    return 10 + getModifier(con) + Math.floor(level / 2);
}

const getCasterSlots = (cls: CharacterClass, level: number) => {
    if ([CharacterClass.WIZARD, CharacterClass.CLERIC, CharacterClass.DRUID, CharacterClass.SORCERER, CharacterClass.BARD].includes(cls)) {
        const slots = level < 5 ? level + 1 : Math.floor(level * 1.5);
        return { current: slots, max: slots }; 
    }
    return { current: 0, max: 0 };
}

const getUnlockedFeatures = (cls: CharacterClass, level: number) => {
    const tree = CLASS_TREES[cls] || [];
    const skills: string[] = [];
    const spells: string[] = [];
    const traits: string[] = [];
    let maxActions = 1;
    tree.forEach(node => {
        if (node.level <= level && !node.choices) {
            if (node.unlocksSkill) skills.push(node.unlocksSkill);
            if (node.unlocksSpell) spells.push(node.unlocksSpell);
            if (node.passiveEffect) traits.push(node.passiveEffect);
            if (node.passiveEffect === 'EXTRA_ATTACK') maxActions = 2;
        }
    });
    return { skills, spells, traits, maxActions };
};

const createCompanion = (name: string, race: CharacterRace, cls: CharacterClass) => {
    const stats = { ...BASE_STATS[cls] };
    const bonus = RACE_BONUS[race];
    Object.keys(stats).forEach(k => { if (bonus[k]) stats[k] += bonus[k]!; });
    const hitDie = getHitDie(cls);
    const maxHp = calculateHp(1, stats.CON, hitDie, race);
    const { skills, spells, traits, maxActions } = getUnlockedFeatures(cls, 1);
    const equipment: any = {};
    if (cls === CharacterClass.RANGER) equipment[EquipmentSlot.MAIN_HAND] = ITEMS.shortbow;
    else if (cls === CharacterClass.FIGHTER) equipment[EquipmentSlot.MAIN_HAND] = ITEMS.longsword;
    return {
        id: `companion_${generateId()}`, name, type: 'PLAYER', equipment,
        stats: {
            level: 1, class: cls, race, creatureType: CreatureType.HUMANOID,
            xp: 0, xpToNextLevel: XP_TABLE[1] || 300, hp: maxHp, maxHp, stamina: 20, maxStamina: 20, ac: 10, initiativeBonus: getModifier(stats.DEX), speed: 30, movementType: MovementType.WALK, attributes: stats, baseAttributes: { ...stats }, spellSlots: getCasterSlots(cls, 1), corruption: 0, activeCooldowns: {}, activeStatusEffects: [], resistances: [], vulnerabilities: [], immunities: [], knownSkills: skills, knownSpells: spells, traits, maxActions, derived: calculateDerivedStats(stats, cls, 1, equipment)
        },
        visual: { color: '#60a5fa', modelType: 'billboard', spriteUrl: getSprite(race, cls) }
    };
};

export const createPlayerSlice: StateCreator<any, [], [], PlayerSlice> = (set, get) => ({
  party: [],
  characterPool: [],
  hasHighPotentialSummon: false,

  addPartyXp: (amount) => {
      const { party } = get();
      set({ party: party.map(m => ({ ...m, stats: { ...m.stats, xp: m.stats.xp + amount } })) });
  },

  createCharacter: (name, race, cls, stats, difficulty) => {
    sfx.playVictory();
    const hitDie = getHitDie(cls);
    const maxHp = calculateHp(1, stats.CON, hitDie, race);
    const { skills, spells, traits, maxActions } = getUnlockedFeatures(cls, 1);
    const equipment: any = {};
    if (cls === CharacterClass.RANGER) equipment[EquipmentSlot.MAIN_HAND] = ITEMS.shortbow;
    else if (cls === CharacterClass.FIGHTER) equipment[EquipmentSlot.MAIN_HAND] = ITEMS.longsword;

    const leader = { 
        id: 'player_leader', name, type: 'PLAYER', equipment, 
        stats: { 
            level: 1, class: cls, race, creatureType: CreatureType.HUMANOID, 
            xp: 0, xpToNextLevel: XP_TABLE[1] || 300, hp: maxHp, maxHp, stamina: 20, maxStamina: 20, ac: 10, initiativeBonus: getModifier(stats.DEX), speed: 30, movementType: MovementType.WALK, attributes: stats, baseAttributes: { ...stats }, spellSlots: getCasterSlots(cls, 1), corruption: 0, activeCooldowns: {}, activeStatusEffects: [], resistances: [], vulnerabilities: [], immunities: [], knownSkills: skills, knownSpells: spells, traits, maxActions, derived: calculateDerivedStats(stats, cls, 1, equipment)
        }, 
        visual: { color: '#3b82f6', modelType: 'billboard', spriteUrl: getSprite(race, cls) } 
    };

    const c1 = createCompanion("Valerius", CharacterRace.HUMAN, CharacterClass.FIGHTER);
    const c2 = createCompanion("Elara", CharacterRace.ELF, CharacterClass.RANGER);
    
    const startTile = WorldGenerator.getTile(0, 0, Dimension.NORMAL);
    get().addItem(ITEMS.ration, 5);

    set({ 
        party: [leader, c1, c2], 
        difficulty, 
        playerPos: { x: 0, y: 0 }, 
        exploredTiles: { [Dimension.NORMAL]: new Set(['0,0', '1,1', '0,1', '1,0']), [Dimension.UPSIDE_DOWN]: new Set() },
        gameState: GameState.OVERWORLD,
        currentRegionName: startTile.regionName,
        // TRIGGER INMEDIATO DE CIUDAD INICIAL
        standingOnSettlement: startTile.poiType === 'CITY' || startTile.poiType === 'VILLAGE',
        standingOnTemple: startTile.poiType === 'TEMPLE',
        standingOnPortal: !!startTile.hasPortal
    });

    get().addLog(`The tether to Eternum is weak. You have arrived in ${startTile.regionName}.`, "narrative");
  },

  recalculateStats: (entity) => {
    const s = entity.stats;
    const maxHp = calculateHp(s.level, s.attributes.CON, getHitDie(s.class), s.race);
    return { ...s, maxHp, derived: calculateDerivedStats(s.attributes, s.class, s.level, entity.equipment) };
  },

  applyLevelUp: (id, bonus, choices = []) => {
    const { party } = get();
    const updated = party.map(m => {
        if (m.id !== id) return m;
        const nextLvl = m.stats.level + 1;
        const newAttrs = { ...m.stats.baseAttributes };
        Object.entries(bonus).forEach(([k, v]) => { if (v) newAttrs[k] += v; });
        const features = getUnlockedFeatures(m.stats.class, nextLvl);
        const temp = { ...m, stats: { ...m.stats, level: nextLvl, baseAttributes: newAttrs, attributes: newAttrs, xpToNextLevel: XP_TABLE[nextLvl] || 99999, knownSkills: Array.from(new Set([...m.stats.knownSkills, ...features.skills])), knownSpells: Array.from(new Set([...m.stats.knownSpells, ...features.spells])), traits: Array.from(new Set([...m.stats.traits, ...features.traits])) } };
        return { ...m, stats: get().recalculateStats(temp) };
    });
    set({ party: updated });
  },

  summonCharacter: (seed, method) => {
      const res = SummoningService.generateFromSeed(seed, get().hasHighPotentialSummon);
      const stats = res.baseAttributes;
      const hero = {
          id: `summoned_${generateId()}`, name: res.name, type: 'PLAYER', equipment: {},
          stats: {
              level: 1, class: res.class, race: res.race, creatureType: CreatureType.HUMANOID,
              xp: 0, xpToNextLevel: 300, hp: 20, maxHp: 20, stamina: 20, maxStamina: 20, ac: 10, initiativeBonus: getModifier(stats.DEX), speed: 30, movementType: MovementType.WALK, attributes: stats, baseAttributes: { ...stats }, spellSlots: getCasterSlots(res.class, 1), activeCooldowns: {}, activeStatusEffects: [], resistances: [], vulnerabilities: [], immunities: [], knownSkills: [], knownSpells: [], traits: res.traits, maxActions: 1, derived: calculateDerivedStats(stats, res.class, 1, {})
          },
          visual: { color: '#8b5cf6', modelType: 'billboard', spriteUrl: getSprite(res.race, res.class) }
      };
      set(s => ({ characterPool: [...s.characterPool, hero], hasHighPotentialSummon: false }));
  },

  swapPartyMember: (p, l) => { const nP = [...get().party], nL = [...get().characterPool], tmp = nP[p]; nP[p] = nL[l]; nL[l] = tmp; set({ party: nP, characterPool: nL }); },
  addToParty: (l) => { if(get().party.length < 4) set(s => ({ party: [...s.party, s.characterPool[l]], characterPool: s.characterPool.filter((_,i)=>i!==l) })); },
  removeFromParty: (p) => { if(p!==0 && get().party.length > 1) set(s => ({ characterPool: [...s.characterPool, s.party[p]], party: s.party.filter((_,i)=>i!==p) })); }
});
