
import { Entity, EffectType, ActionEffect, DamageType, StatusEffectType, Ability, MagicSchool, Dimension, TileEffectType } from '../types';
import { rollDice, calculateFinalDamage, getModifier, calculateAttackRoll } from './dndRules';

export interface ActionResolution {
    targetId: string;
    hpChange: number;
    popups: { amount: string | number; color: string; isCrit: boolean; label?: string; damageType?: DamageType }[];
    statusChanges?: { type: StatusEffectType; duration: number }[];
    actorStatusChanges?: { type: StatusEffectType; duration: number }[];
    didHit: boolean;
    transformation?: string;
}

export const ActionResolver = {
    resolve: (actor: Entity, target: Entity, effects: ActionEffect[], dimension: Dimension = Dimension.NORMAL, allEntities: Entity[] = []): ActionResolution => {
        let totalHpChange = 0;
        const popups: ActionResolution['popups'] = [];
        const statusChanges: ActionResolution['statusChanges'] = [];
        const actorStatusChanges: ActionResolution['actorStatusChanges'] = [];
        let transformationId: string | undefined = undefined;

        if (!actor.stats || !target.stats) return { targetId: target.id, hpChange: 0, popups, didHit: false };

        // TIRADA DE IMPACTO CON FLANQUEO
        const needsHitRoll = effects.some(e => e.type === EffectType.DAMAGE);
        let didHit = true;
        let isCrit = false;

        if (needsHitRoll) {
            const attack = calculateAttackRoll(actor, target, dimension, allEntities);
            didHit = attack.total >= target.stats.ac && !attack.isAutoMiss;
            isCrit = attack.isCrit;
            if (!didHit) {
                popups.push({ amount: "MISS", color: "#94a3b8", isCrit: false });
                return { targetId: target.id, hpChange: 0, popups, didHit: false };
            }
        }

        effects.forEach(effect => {
            const attrValue = effect.attributeScale ? actor.stats.attributes[effect.attributeScale] : undefined;
            const scaleMod = (attrValue !== undefined) ? getModifier(attrValue) : 0;

            switch (effect.type) {
                case EffectType.DAMAGE: {
                    let diceCount = (effect.diceCount || 1) * (isCrit ? 2 : 1);
                    let baseRoll = rollDice(effect.diceSides || 6, diceCount) + scaleMod + (effect.fixedValue || 0);
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
                    if (effect.statusType) statusChanges.push({ type: effect.statusType, duration: effect.duration || 1 });
                    break;
                }
            }
        });

        return { targetId: target.id, hpChange: totalHpChange, popups, statusChanges, actorStatusChanges, didHit: true, transformation: transformationId };
    }
};
