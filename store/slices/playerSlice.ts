
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
  addPartyXp: (amount: number) => void; // NUEVO: Acción para XP global
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
    if (cls === CharacterClass.WARLOCK) return { current: Math.ceil(level/2), max: Math.ceil(level/2) };
    if ([CharacterClass.PALADIN, CharacterClass.RANGER].includes(cls)) return { current: Math.floor(level/2), max: Math.floor(level/2) };
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
    (Object.keys(stats) as Ability[]).forEach(k => { if (bonus[k]) stats[k] += bonus[k]!; });

    const hitDie = getHitDie(cls);
    const maxHp = calculateHp(1, stats.CON, hitDie, race);
    const maxStamina = calculateMaxStamina(stats.CON, 1);
    const startSlots = getCasterSlots(cls, 1);
    const { skills, spells, traits, maxActions } = getUnlockedFeatures(cls, 1);

    const equipment: any = {};
    if (cls === CharacterClass.RANGER) equipment[EquipmentSlot.MAIN_HAND] = ITEMS.shortbow;
    else if (cls === CharacterClass.FIGHTER) equipment[EquipmentSlot.MAIN_HAND] = ITEMS.longsword;

    return {
        id: `companion_${generateId()}`,
        name,
        type: 'PLAYER' as const,
        equipment: equipment,
        stats: {
            level: 1, class: cls, race, creatureType: CreatureType.HUMANOID,
            xp: 0, xpToNextLevel: XP_TABLE[1] || 300, hp: maxHp, maxHp, stamina: maxStamina, maxStamina, ac: 10, initiativeBonus: getModifier(stats.DEX), speed: 30, movementType: MovementType.WALK, attributes: stats, baseAttributes: { ...stats }, spellSlots: startSlots, corruption: 0, activeCooldowns: {},
            activeStatusEffects: [], resistances: [], vulnerabilities: [], immunities: [],
            knownSkills: skills, knownSpells: spells, traits, maxActions,
            derived: calculateDerivedStats(stats, cls, 1, equipment)
        },
        visual: { color: '#60a5fa', modelType: 'billboard' as const, spriteUrl: getSprite(race, cls) }
    };
};

export const createPlayerSlice: StateCreator<any, [], [], PlayerSlice> = (set, get) => ({
  party: [],
  characterPool: [],
  hasHighPotentialSummon: false,

  addPartyXp: (amount) => {
      const { party } = get();
      const updatedParty = party.map(member => ({
          ...member,
          stats: {
              ...member.stats,
              xp: member.stats.xp + amount
          }
      }));
      set({ party: updatedParty });
  },

  createCharacter: (name, race, cls, stats, difficulty) => {
    sfx.playVictory();
    
    const hitDie = getHitDie(cls);
    const maxHp = calculateHp(1, stats.CON, hitDie, race);
    const maxStamina = calculateMaxStamina(stats.CON, 1);
    const startSlots = getCasterSlots(cls, 1);
    const { skills, spells, traits, maxActions } = getUnlockedFeatures(cls, 1);

    const equipment: any = {};
    if (cls === CharacterClass.RANGER) equipment[EquipmentSlot.MAIN_HAND] = ITEMS.shortbow;
    else if (cls === CharacterClass.WIZARD || cls === CharacterClass.SORCERER) {}
    else equipment[EquipmentSlot.MAIN_HAND] = ITEMS.longsword;

    const leader = { 
        id: 'player_leader', name, type: 'PLAYER' as const, equipment: equipment, 
        stats: { 
            level: 1, class: cls, race, creatureType: CreatureType.HUMANOID, 
            xp: 0, xpToNextLevel: XP_TABLE[1] || 300, hp: maxHp, maxHp, stamina: maxStamina, maxStamina, ac: 10, initiativeBonus: getModifier(stats.DEX), speed: 30, movementType: MovementType.WALK, attributes: stats, baseAttributes: { ...stats }, spellSlots: startSlots, corruption: 0, activeCooldowns: {},
            activeStatusEffects: [], resistances: [], vulnerabilities: [], immunities: [],
            knownSkills: skills, knownSpells: spells, traits, maxActions,
            derived: calculateDerivedStats(stats, cls, 1, equipment)
        }, 
        visual: { color: '#3b82f6', modelType: 'billboard' as const, spriteUrl: getSprite(race, cls) } 
    };

    const companion1 = createCompanion("Valerius", CharacterRace.HUMAN, CharacterClass.FIGHTER);
    const companion2 = createCompanion("Elara", CharacterRace.ELF, CharacterClass.RANGER);
    
    const initialExplored = {
        [Dimension.NORMAL]: new Set(['0,0', '0,1', '1,0', '-1,1', '0,-1', '1,-1', '-1,0']),
        [Dimension.UPSIDE_DOWN]: new Set()
    };

    const startTile = WorldGenerator.getTile(0, 0, Dimension.NORMAL);
    get().addItem(ITEMS.ration, 5);

    set({ 
        party: [leader, companion1, companion2], 
        difficulty, 
        playerPos: { x: 0, y: 0 }, 
        exploredTiles: initialExplored,
        gameState: GameState.OVERWORLD,
        currentRegionName: startTile.regionName
    });

    get().addLog(`The tether to Eternum is weak. Two spirits manifest to aid you.`, "narrative");
  },

  recalculateStats: (entity) => {
    const s = entity.stats;
    const hitDie = getHitDie(s.class);
    const maxHp = calculateHp(s.level, s.attributes.CON, hitDie, s.race);
    return { ...s, maxHp, maxStamina: calculateMaxStamina(s.attributes.CON, s.level), derived: calculateDerivedStats(s.attributes, s.class, s.level, entity.equipment) };
  },

  applyLevelUp: (characterId, bonusAttributes, selectedChoices = []) => {
    const { party } = get();
    const updatedParty = party.map(member => {
        if (member.id !== characterId) return member;
        const nextLevel = member.stats.level + 1;
        const newBaseAttributes = { ...member.stats.baseAttributes };
        Object.entries(bonusAttributes).forEach(([key, val]) => { if (val) newBaseAttributes[key as keyof Attributes] += val; });

        const { skills: autoSkills, spells: autoSpells, traits: autoTraits, maxActions: autoMaxActions } = getUnlockedFeatures(member.stats.class, nextLevel);
        const chosenSkills: string[] = [];
        const chosenSpells: string[] = [];
        const chosenTraits: string[] = [];
        const tree = CLASS_TREES[member.stats.class] || [];
        const choiceNodes = tree.filter(n => n.level === nextLevel && n.choices);
        choiceNodes.forEach(node => {
            node.choices?.forEach(opt => {
                if (selectedChoices.includes(opt.id)) {
                    if (opt.unlocksSkill) chosenSkills.push(opt.unlocksSkill);
                    if (opt.unlocksSpell) chosenSpells.push(opt.unlocksSpell);
                    if (opt.passiveEffect) chosenTraits.push(opt.passiveEffect);
                }
            });
        });
        
        const tempSlots = getCasterSlots(member.stats.class, nextLevel);

        const tempEntity = { 
            ...member, 
            stats: { 
                ...member.stats, 
                level: nextLevel, 
                baseAttributes: newBaseAttributes, 
                attributes: newBaseAttributes,
                xpToNextLevel: XP_TABLE[nextLevel] || 999999,
                spellSlots: tempSlots,
                knownSkills: Array.from(new Set([...(member.stats.knownSkills || []), ...autoSkills, ...chosenSkills])),
                knownSpells: Array.from(new Set([...(member.stats.knownSpells || []), ...autoSpells, ...chosenSpells])),
                traits: Array.from(new Set([...(member.stats.traits || []), ...autoTraits, ...chosenTraits])),
                maxActions: Math.max(member.stats.maxActions || 1, autoMaxActions)
            } 
        };
        const final = get().recalculateStats(tempEntity);
        return { ...member, stats: { ...final, hp: final.maxHp, stamina: final.maxStamina } };
    });
    set({ party: updatedParty });
    get().addLog(`${party.find(p => p.id === characterId)?.name} attained Level ${updatedParty.find(p => p.id === characterId)?.stats.level}!`, "levelup");
  },

  summonCharacter: (seed, method) => {
      const res = SummoningService.generateFromSeed(seed, get().hasHighPotentialSummon);
      const stats = res.baseAttributes;
      const hitDie = getHitDie(res.class);
      const maxHp = calculateHp(1, stats.CON, hitDie, res.race);
      const slots = getCasterSlots(res.class, 1);
      const features = getUnlockedFeatures(res.class, 1);

      const newHero = {
          id: `summoned_${generateId()}`,
          name: res.name,
          type: 'PLAYER' as const,
          equipment: {},
          stats: {
              level: 1, class: res.class, race: res.race, creatureType: CreatureType.HUMANOID,
              xp: 0, xpToNextLevel: XP_TABLE[1] || 300, hp: maxHp, maxHp, stamina: 20, maxStamina: 20, ac: 10, initiativeBonus: getModifier(stats.DEX), speed: 30, movementType: MovementType.WALK, attributes: stats, baseAttributes: { ...stats }, spellSlots: slots, activeCooldowns: {}, activeStatusEffects: [], resistances: [], vulnerabilities: [], immunities: [],
              knownSkills: features.skills, knownSpells: features.spells, traits: [...features.traits, ...res.traits], maxActions: features.maxActions,
              rarity: res.rarity, affinity: res.affinity,
              derived: calculateDerivedStats(stats, res.class, 1, {})
          },
          visual: { color: '#8b5cf6', modelType: 'billboard' as const, spriteUrl: getSprite(res.race, res.class) }
      };

      set(s => ({ characterPool: [...s.characterPool, newHero], hasHighPotentialSummon: false }));
      get().addLog(`Ritual Complete: ${res.name} has joined the reserve.`, "narrative");
  },

  swapPartyMember: (pIdx, poolIdx) => {
      const { party, characterPool } = get();
      if (pIdx === 0) return; 
      const newParty = [...party];
      const newPool = [...characterPool];
      const fromParty = newParty[pIdx];
      const fromPool = newPool[poolIdx];
      newParty[pIdx] = fromPool;
      newPool[poolIdx] = fromParty;
      set({ party: newParty, characterPool: newPool });
      sfx.playUiClick();
  },

  addToParty: (poolIdx) => {
      const { party, characterPool } = get();
      if (party.length >= 4) return;
      const hero = characterPool[poolIdx];
      set({
          party: [...party, hero],
          characterPool: characterPool.filter((_, i) => i !== poolIdx)
      });
      sfx.playUiClick();
  },

  removeFromParty: (partyIndex) => {
      const { party, characterPool } = get();
      if (partyIndex === 0 || party.length <= 1) return;
      const hero = party[partyIndex];
      set({
          party: party.filter((_, i) => i !== partyIndex),
          characterPool: [...characterPool, hero]
      });
      sfx.playUiClick();
  }
});
