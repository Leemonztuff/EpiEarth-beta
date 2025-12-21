
import { Entity, EffectType, ActionEffect, DamageType, StatusEffectType, Ability, MagicSchool, Dimension, TileEffectType, StatusEffect, BattleCell } from '../types';
import { rollDice, calculateFinalDamage, getModifier, calculateAttackRoll } from './dndRules';

export interface ActionResolution {
    targetId: string;
    hpChange: number;
    popups: { amount: string | number; color: string; isCrit: boolean; label?: string; damageType?: DamageType }[];
    statusChanges?: { type: StatusEffectType; duration: number; intensity?: number }[];
    actorStatusChanges?: { type: StatusEffectType; duration: number; intensity?: number }[];
    didHit: boolean;
    transformation?: string;
}

export const ActionResolver = {
    /**
     * Resolves an array of ActionEffects against a target.
     * Handles hit rolls, criticals, and tactical bonuses.
     */
    resolve: (actor: Entity, target: Entity, effects: ActionEffect[], dimension: Dimension = Dimension.NORMAL, allEntities: Entity[] = [], map: BattleCell[] = []): ActionResolution => {
        let totalHpChange = 0;
        const popups: ActionResolution['popups'] = [];
        const statusChanges: ActionResolution['statusChanges'] = [];
        const actorStatusChanges: ActionResolution['actorStatusChanges'] = [];
        let transformationId: string | undefined = undefined;

        if (!actor.stats || !target.stats) return { targetId: target.id, hpChange: 0, popups, didHit: false };

        const needsHitRoll = effects.some(e => e.type === EffectType.DAMAGE || e.type === EffectType.DRAIN);
        let didHit = true;
        let isCrit = false;

        if (needsHitRoll) {
            const attack = calculateAttackRoll(actor, target, dimension, allEntities, map);
            didHit = attack.total >= target.stats.ac && !attack.isAutoMiss;
            isCrit = attack.isCrit;
            
            if (!didHit) {
                popups.push({ amount: "MISS", color: "#94a3b8", isCrit: false });
                return { targetId: target.id, hpChange: 0, popups, didHit: false };
            }
        }

        effects.forEach(effect => {
            if (effect.chance && Math.random() * 100 > effect.chance) return;
            const attrValue = effect.attributeScale ? actor.stats.attributes[effect.attributeScale] : undefined;
            const scaleMod = (attrValue !== undefined) ? getModifier(attrValue) : 0;

            switch (effect.type) {
                case EffectType.DAMAGE: {
                    let diceCount = (effect.diceCount || 1) * (isCrit ? 2 : 1);
                    // Bono extra por táctica de altura
                    let tacticalBonus = 0;
                    if (map.length > 0) {
                        const actorCell = map.find(c => c.x === actor.position?.x && c.z === actor.position?.y);
                        const targetCell = map.find(c => c.x === target.position?.x && c.z === target.position?.y);
                        if (actorCell && targetCell && actorCell.height - targetCell.height >= 2) tacticalBonus = rollDice(4, 1);
                    }
                    
                    let baseRoll = rollDice(effect.diceSides || 6, diceCount) + scaleMod + (effect.fixedValue || 0) + tacticalBonus;
                    const final = calculateFinalDamage(baseRoll, effect.damageType || DamageType.MAGIC, target);
                    totalHpChange -= final.finalDamage;
                    popups.push({ amount: final.finalDamage, color: isCrit ? '#f59e0b' : '#ef4444', isCrit, damageType: effect.damageType });
                    break;
                }
                case EffectType.HEAL: {
                    const healRoll = rollDice(effect.diceSides || 8, effect.diceCount || 1) + scaleMod + (effect.fixedValue || 0);
                    totalHpChange += healRoll;
                    popups.push({ amount: `+${healRoll}`, color: '#22c55e', isCrit: false });
                    break;
                }
                case EffectType.STATUS: {
                    if (effect.statusType) statusChanges.push({ type: effect.statusType, duration: effect.duration || 1, intensity: 1 });
                    break;
                }
            }
        });

        return { targetId: target.id, hpChange: totalHpChange, popups, statusChanges, actorStatusChanges, didHit: true, transformation: transformationId };
    },

    processStatusTick: (entity: Entity): { hpChange: number, popups: any[], updatedEffects: StatusEffect[] } => {
        let hpChange = 0;
        const popups = [];
        const updatedEffects: StatusEffect[] = [];
        if (!entity.stats.activeStatusEffects) return { hpChange: 0, popups: [], updatedEffects: [] };

        entity.stats.activeStatusEffects.forEach(effect => {
            let effectDamage = 0;
            let color = '#ffffff';
            let label = '';
            switch (effect.type) {
                case StatusEffectType.POISON: effectDamage = (effect.intensity || 1) * rollDice(4, 1); color = '#4ade80'; label = 'Poisoned'; break;
                case StatusEffectType.BURN: effectDamage = (effect.intensity || 1) * rollDice(6, 1); color = '#fb923c'; label = 'Burning'; break;
                case StatusEffectType.REGEN: effectDamage = -((effect.intensity || 1) * rollDice(4, 1)); color = '#22c55e'; break;
            }
            if (effectDamage !== 0) {
                hpChange -= effectDamage;
                popups.push({ amount: effectDamage > 0 ? effectDamage : `+${Math.abs(effectDamage)}`, color, isCrit: false, label });
            }
            if (effect.duration > 1) updatedEffects.push({ ...effect, duration: effect.duration - 1 });
        });
        return { hpChange, popups, updatedEffects };
    }
};
