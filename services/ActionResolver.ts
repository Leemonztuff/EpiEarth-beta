
import { Entity, EffectType, ActionEffect, DamageType, StatusEffectType, Ability, MagicSchool, Dimension, TileEffectType, StatusEffect, BattleCell, PositionComponent, TerrainType } from '../types';
import { rollDice, calculateFinalDamage, getModifier, calculateAttackRoll, getAttackRange } from './dndRules';
import { TERRAIN_COMBAT_EFFECTS } from '../constants';

export interface ActionResolution {
    targetId: string;
    hpChange: number;
    popups: { amount: string | number; color: string; isCrit: boolean; label?: string; damageType?: DamageType }[];
    statusChanges?: { type: StatusEffectType; duration: number; intensity?: number }[];
    actorStatusChanges?: { type: StatusEffectType; duration: number; intensity?: number }[];
    didHit: boolean;
    transformation?: string;
    reactions?: ReactionResult[];
}

export interface ReactionResult {
    type: 'AOO' | 'COUNTER' | 'RIPOSTE';
    source: Entity;
    target: Entity;
    damage: number;
    didHit: boolean;
}

export interface ReactionConfig {
    enableAOO: boolean;
    enableCounter: boolean;
    enableRiposte: boolean;
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

            let terrainEffect: any = null;
            let targetTerrainEffect: any = null;
            if (map.length > 0) {
                const actorCell = map.find(c => c.x === actor.position?.x && c.z === actor.position?.y);
                const targetCell = map.find(c => c.x === target.position?.x && c.z === target.position?.y);
                terrainEffect = actorCell ? TERRAIN_COMBAT_EFFECTS[actorCell.terrain as TerrainType] : null;
                targetTerrainEffect = targetCell ? TERRAIN_COMBAT_EFFECTS[targetCell.terrain as TerrainType] : null;
            }

            switch (effect.type) {
                case EffectType.DAMAGE: {
                    let diceCount = (effect.diceCount || 1) * (isCrit ? 2 : 1);
                    let tacticalBonus = 0;
                    if (map.length > 0) {
                        const actorCell = map.find(c => c.x === actor.position?.x && c.z === actor.position?.y);
                        const targetCell = map.find(c => c.x === target.position?.x && c.z === target.position?.y);
                        if (actorCell && targetCell && actorCell.height - targetCell.height >= 2) tacticalBonus = rollDice(4, 1);
                    }
                    
                    let terrainBonus = terrainEffect?.damageBonus || 0;
                    let baseRoll = rollDice(effect.diceSides || 6, diceCount) + scaleMod + (effect.fixedValue || 0) + tacticalBonus + terrainBonus;
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

    calculateReactions: (
        actor: Entity,
        target: Entity,
        allEntities: Entity[],
        config: ReactionConfig = { enableAOO: true, enableCounter: true, enableRiposte: true }
    ): ReactionResult[] => {
        const reactions: ReactionResult[] = [];
        
        if (!actor.position || !target.position || !actor.stats || !target.stats) return reactions;

        const enemies = allEntities.filter(e => e.type !== actor.type && e.stats.hp > 0 && e.position);
        
        enemies.forEach(enemy => {
            if (!enemy.position || !enemy.stats) return;
            
            const dist = Math.sqrt(
                Math.pow(enemy.position.x - target.position.x, 2) + 
                Math.pow(enemy.position.y - target.position.y, 2)
            );
            
            if (dist <= 1.5 && config.enableAOO) {
                const attack = calculateAttackRoll(enemy, actor, Dimension.NORMAL, allEntities, []);
                if (attack.total >= actor.stats.ac) {
                    const damage = rollDice(6, 1) + getModifier(enemy.stats.attributes.STR);
                    reactions.push({
                        type: 'AOO',
                        source: enemy,
                        target: actor,
                        damage: damage,
                        didHit: true
                    });
                }
            }
            
            if (dist <= getAttackRange(enemy) && config.enableCounter) {
                if (enemy.stats.level >= 5 || enemy.name.toLowerCase().includes('fighter') || enemy.name.toLowerCase().includes('warrior')) {
                    const attack = calculateAttackRoll(enemy, actor, Dimension.NORMAL, allEntities, []);
                    if (attack.total >= actor.stats.ac) {
                        const damage = rollDice(6, 1) + getModifier(enemy.stats.attributes.STR);
                        reactions.push({
                            type: 'COUNTER',
                            source: enemy,
                            target: actor,
                            damage: damage,
                            didHit: true
                        });
                    }
                }
            }
        });

        return reactions;
    },

    executeReaction: (
        actor: Entity,
        target: Entity,
        reaction: ReactionResult
    ): { hpChange: number, popups: any[] } => {
        const hpChange = -reaction.damage;
        const popups = [{
            amount: reaction.damage,
            color: '#f97316',
            isCrit: false,
            label: reaction.type
        }];
        
        return { hpChange, popups };
    },

    canPerformRiposte: (entity: Entity): boolean => {
        return entity.stats.level >= 7 || 
               entity.name.toLowerCase().includes('fighter') || 
               entity.name.toLowerCase().includes('duelist');
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
