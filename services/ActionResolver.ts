
import { Entity, EffectType, ActionEffect, DamageType, StatusEffectType, Ability, MagicSchool, Dimension } from '../types';
import { rollDice, calculateFinalDamage, getModifier, calculateAttackRoll } from './dndRules';

export interface ActionResolution {
    targetId: string;
    hpChange: number;
    popups: { amount: string | number; color: string; isCrit: boolean; label?: string; damageType?: DamageType }[];
    statusChanges?: { type: StatusEffectType; duration: number }[];
    actorStatusChanges?: { type: StatusEffectType; duration: number }[];
    didHit: boolean;
    transformation?: string; // ID de la criatura para transformar
}

/**
 * ACTION RESOLVER: Servicio centralizado para procesar interacciones de combate.
 */
export const ActionResolver = {
    resolve: (actor: Entity, target: Entity, effects: ActionEffect[], dimension: Dimension = Dimension.NORMAL, school?: MagicSchool): ActionResolution => {
        let totalHpChange = 0;
        const popups: ActionResolution['popups'] = [];
        const statusChanges: ActionResolution['statusChanges'] = [];
        const actorStatusChanges: ActionResolution['actorStatusChanges'] = [];
        let transformationId: string | undefined = undefined;

        if (!actor.stats || !target.stats) {
             return { targetId: target.id, hpChange: 0, popups, didHit: false };
        }

        // --- LÓGICA DE FUEGO AMIGO ---
        const isHarmful = effects.some(e => e.type === EffectType.DAMAGE || e.type === EffectType.DEBUFF || e.type === EffectType.DRAIN || e.type === EffectType.STATUS);
        const isHelpful = effects.some(e => e.type === EffectType.HEAL || e.type === EffectType.BUFF || e.type === EffectType.TRANSFORM);
        
        if (actor.type === target.type && isHarmful && !isHelpful) return { targetId: target.id, hpChange: 0, popups, didHit: false };
        if (actor.type !== target.type && isHelpful && !isHarmful) return { targetId: target.id, hpChange: 0, popups, didHit: false };

        // --- TIRADA DE IMPACTO ---
        const needsHitRoll = effects.some(e => e.type === EffectType.DAMAGE);
        let didHit = true;
        let isCrit = false;

        if (needsHitRoll) {
            const attack = calculateAttackRoll(actor, target, dimension);
            didHit = attack.total >= target.stats.ac && !attack.isAutoMiss;
            isCrit = attack.isCrit;

            if (!didHit) {
                popups.push({ amount: "MISS", color: "#94a3b8", isCrit: false, label: "¡Fallo!" });
                return { targetId: target.id, hpChange: 0, popups, didHit: false };
            }
            if (isCrit) {
                popups.push({ amount: "CRIT", color: "#f59e0b", isCrit: true, label: "¡CRÍTICO!" });
            }
        }

        // --- PROCESAMIENTO DE EFECTOS ---
        effects.forEach(effect => {
            const attrValue = effect.attributeScale ? actor.stats.attributes[effect.attributeScale] : undefined;
            const scaleMod = (attrValue !== undefined) ? getModifier(attrValue) : 0;
            const chance = effect.chance !== undefined ? effect.chance : 1.0;

            if (Math.random() > chance) return;

            switch (effect.type) {
                case EffectType.DAMAGE: {
                    let diceCount = (effect.diceCount || 1) * (isCrit ? 2 : 1);
                    let baseRoll = rollDice(effect.diceSides || 6, diceCount) + scaleMod + (effect.fixedValue || 0);
                    
                    const final = calculateFinalDamage(baseRoll, effect.damageType || DamageType.MAGIC, target);
                    totalHpChange -= final.finalDamage;
                    popups.push({ amount: final.finalDamage, color: isCrit ? '#f59e0b' : '#ef4444', isCrit: isCrit, damageType: effect.damageType });
                    break;
                }

                case EffectType.HEAL: {
                    const healRoll = rollDice(effect.diceSides || 8, effect.diceCount || 1) + scaleMod + (effect.fixedValue || 0);
                    totalHpChange += healRoll;
                    popups.push({ amount: `+${healRoll}`, color: '#22c55e', isCrit: false });
                    break;
                }

                case EffectType.STATUS:
                case EffectType.BUFF:
                case EffectType.DEBUFF: {
                    if (effect.statusType && (effect.duration || 0) > 0) {
                        statusChanges.push({ type: effect.statusType, duration: effect.duration || 1 });
                        popups.push({ amount: effect.statusType, color: '#3b82f6', isCrit: false });
                    }
                    break;
                }

                case EffectType.TRANSFORM: {
                    if (effect.summonDefId) {
                        transformationId = effect.summonDefId;
                        popups.push({ amount: "WILD SHAPE", color: "#10b981", isCrit: false });
                    }
                    break;
                }

                case EffectType.DRAIN: {
                    const drainVal = Math.floor((effect.fixedValue || 10) * (1 + scaleMod/10));
                    totalHpChange -= drainVal;
                    actorStatusChanges.push({ type: StatusEffectType.REGEN, duration: 1 });
                    popups.push({ amount: drainVal, color: '#a855f7', isCrit: false, damageType: DamageType.NECROTIC });
                    break;
                }
            }
        });

        return {
            targetId: target.id,
            hpChange: totalHpChange,
            popups,
            statusChanges,
            actorStatusChanges,
            didHit: true,
            transformation: transformationId
        };
    }
};
