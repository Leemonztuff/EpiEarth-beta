import { Entity, BattleCell, PositionComponent } from '../types';
import { findBattlePath, getReachableTiles } from './pathfinding';
import { rollDice, getModifier, getAttackRange } from './dndRules';

export enum EnemyType {
  MELEE = 'MELEE',
  RANGED = 'RANGED',
  CASTER = 'CASTER',
  HEALER = 'HEALER',
  TANK = 'TANK',
  SCOUT = 'SCOUT'
}

export enum AIState {
  IDLE = 'IDLE',
  APPROACH = 'APPROACH',
  ATTACK = 'ATTACK',
  HEAL = 'HEAL',
  BUFF = 'BUFF',
  RETREAT = 'RETREAT',
  FLANK = 'FLANK',
  CAST_SPELL = 'CAST_SPELL',
  WAIT = 'WAIT'
}

interface TacticalAnalysis {
  bestTarget: Entity | null;
  bestMovePosition: PositionComponent | null;
  recommendedAction: AIState;
  score: number;
  canReachAnyPlayer: boolean;
  threatLevel: number;
  allyCount: number;
}

export class EnemyAI {
  private entity: Entity;
  private allies: Entity[];
  private enemies: Entity[];
  private battleMap: BattleCell[];
  private dimension: string;

  constructor(entity: Entity, allies: Entity[], enemies: Entity[], battleMap: BattleCell[], dimension: string) {
    this.entity = entity;
    this.allies = allies;
    this.enemies = enemies;
    this.battleMap = battleMap;
    this.dimension = dimension;
  }

  private getEnemyType(): EnemyType {
    const name = this.entity.name.toLowerCase();
    const stats = this.entity.stats;
    
    if (name.includes('healer') || name.includes('cleric') || name.includes('shaman')) return EnemyType.HEALER;
    if (name.includes('mage') || name.includes('wizard') || name.includes('sorcerer') || name.includes('caster')) return EnemyType.CASTER;
    if (name.includes('archer') || name.includes('ranger') || name.includes('ranged')) return EnemyType.RANGED;
    if (name.includes('tank') || name.includes('golem') || name.includes('guardian')) return EnemyType.TANK;
    if (name.includes('scout') || name.includes('assassin') || name.includes('rogue')) return EnemyType.SCOUT;
    if (name.includes('goblin') || name.includes('orc') || name.includes('wolf')) return EnemyType.SCOUT;
    
    return EnemyType.MELEE;
  }

  private getDistance(pos1: PositionComponent, pos2: PositionComponent): number {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  }

  private getTileHeight(x: number, z: number): number {
    const cell = this.battleMap.find(c => c.x === x && c.z === z);
    return cell?.height || 0;
  }

  private getHeightAdvantage(target: Entity): number {
    const myHeight = this.getTileHeight(this.entity.position.x, this.entity.position.y);
    const targetHeight = this.getTileHeight(target.position.x, target.position.y);
    return myHeight - targetHeight;
  }

  private canAttackTarget(target: Entity): boolean {
    const range = getAttackRange(this.entity);
    const dist = this.getDistance(this.entity.position, target.position);
    return dist <= range;
  }

  private evaluateTarget(target: Entity): number {
    let score = 0;
    const dist = this.getDistance(this.entity.position, target.position);
    
    score -= dist * 2;
    
    if (target.stats.hp < target.stats.maxHp * 0.3) score += 30;
    else if (target.stats.hp < target.stats.maxHp * 0.5) score += 15;
    
    if (this.getHeightAdvantage(target) > 1) score += 20;
    
    const hasLowAC = target.stats.ac < 12;
    if (hasLowAC) score += 10;
    
    const role = this.getEnemyType();
    if (role === EnemyType.SCOUT && target.stats.hp < target.stats.maxHp * 0.5) score += 25;
    
    const isHealer = target.name.toLowerCase().includes('healer') || 
                     target.name.toLowerCase().includes('cleric');
    if (isHealer) score += 20;
    
    return score;
  }

  private findBestMovePosition(target: Entity): PositionComponent | null {
    const moveRange = Math.floor(this.entity.stats.speed / 5);
    if (moveRange <= 0) return null;

    const occupied = new Set(
      [...this.allies, ...this.enemies]
        .filter(e => e.stats.hp > 0 && e.position)
        .map(e => `${e.position.x},${e.position.y}`)
    );

    const reachable = getReachableTiles(
      this.entity.position,
      moveRange,
      this.battleMap,
      occupied,
      this.entity.stats.class
    );

    if (reachable.length === 0) return null;

    let bestPos: PositionComponent | null = null;
    let bestScore = -Infinity;

    const attackRange = getAttackRange(this.entity);
    const idealDist = this.getEnemyType() === EnemyType.RANGED ? attackRange - 1 : 1;

    for (const pos of reachable) {
      let score = 0;
      const dist = this.getDistance(pos, target.position);
      
      const heightDiff = this.getTileHeight(pos.x, pos.y) - this.getTileHeight(target.position.x, target.position.y);
      score += heightDiff * 15;
      
      score -= Math.abs(dist - idealDist) * 3;
      
      let allySupport = 0;
      for (const ally of this.allies) {
        if (ally.id !== this.entity.id && ally.stats.hp > 0) {
          const allyDist = this.getDistance(pos, ally.position);
          if (allyDist <= 3) allySupport += (3 - allyDist) * 5;
        }
      }
      score += allySupport;

      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }

    return bestPos;
  }

  private findHealingTarget(): Entity | null {
    const woundedAllies = this.allies
      .filter(a => a.id !== this.entity.id && a.stats.hp < a.stats.maxHp * 0.6 && a.stats.hp > 0)
      .sort((a, b) => (a.stats.hp / a.stats.maxHp) - (b.stats.hp / b.stats.maxHp));
    
    return woundedAllies[0] || null;
  }

  private shouldRetreat(): boolean {
    const hpPercent = this.entity.stats.hp / this.entity.stats.maxHp;
    if (hpPercent < 0.2) return true;
    
    const playerCount = this.enemies.filter(e => e.type === 'PLAYER' && e.stats.hp > 0).length;
    const allyCount = this.allies.filter(a => a.stats.hp > 0).length;
    
    if (allyCount === 0 && playerCount > 1 && hpPercent < 0.4) return true;
    
    return false;
  }

  private findRetreatPosition(): PositionComponent | null {
    const moveRange = Math.floor(this.entity.stats.speed / 5);
    if (moveRange <= 0) return null;

    const occupied = new Set(
      [...this.allies, ...this.enemies]
        .filter(e => e.stats.hp > 0 && e.position)
        .map(e => `${e.position.x},${e.position.y}`)
    );

    const reachable = getReachableTiles(
      this.entity.position,
      moveRange,
      this.battleMap,
      occupied,
      this.entity.stats.class
    );

    if (reachable.length === 0) return null;

    let bestPos: PositionComponent | null = null;
    let bestScore = -Infinity;

    for (const pos of reachable) {
      let minPlayerDist = Infinity;
      for (const player of this.enemies) {
        if (player.type === 'PLAYER' && player.stats.hp > 0) {
          const dist = this.getDistance(pos, player.position);
          minPlayerDist = Math.min(minPlayerDist, dist);
        }
      }
      
      const score = minPlayerDist * 2 + this.getTileHeight(pos.x, pos.y) * 10;
      
      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }

    return bestPos;
  }

  analyze(): TacticalAnalysis {
    const alivePlayers = this.enemies.filter(e => e.type === 'PLAYER' && e.stats.hp > 0);
    if (alivePlayers.length === 0) {
      return { bestTarget: null, bestMovePosition: null, recommendedAction: AIState.WAIT, score: 0, canReachAnyPlayer: false, threatLevel: 0, allyCount: 0 };
    }

    const type = this.getEnemyType();
    let bestTarget = alivePlayers[0];
    let bestScore = -Infinity;

    for (const player of alivePlayers) {
      const score = this.evaluateTarget(player);
      if (score > bestScore) {
        bestScore = score;
        bestTarget = player;
      }
    }

    const canReachAny = alivePlayers.some(p => this.canAttackTarget(p));
    const bestMovePos = bestTarget ? this.findBestMovePosition(bestTarget) : null;
    const allyCount = this.allies.filter(a => a.stats.hp > 0).length;
    
    let threatLevel = 0;
    for (const player of alivePlayers) {
      if (this.canAttackTarget(player)) {
        const dmg = rollDice(8, 1) + getModifier(player.stats.attributes.STR);
        threatLevel += dmg;
      }
    }

    let recommendedAction = AIState.ATTACK;

    if (type === EnemyType.HEALER) {
      const woundedAlly = this.findHealingTarget();
      if (woundedAlly) {
        recommendedAction = AIState.HEAL;
      } else if (!canReachAny && bestMovePos) {
        recommendedAction = AIState.APPROACH;
      }
    } else if (type === EnemyType.CASTER) {
      if (canReachAny) {
        recommendedAction = AIState.CAST_SPELL;
      } else if (bestMovePos) {
        recommendedAction = AIState.APPROACH;
      }
    } else if (type === EnemyType.RANGED) {
      if (!canReachAny && bestMovePos) {
        recommendedAction = AIState.APPROACH;
      } else if (canReachAny) {
        recommendedAction = AIState.ATTACK;
      }
    } else if (type === EnemyType.TANK) {
      if (this.shouldRetreat()) {
        recommendedAction = AIState.RETREAT;
      } else if (!canReachAny && bestMovePos) {
        recommendedAction = AIState.FLANK;
      }
    } else {
      if (this.shouldRetreat()) {
        recommendedAction = AIState.RETREAT;
      } else if (!canReachAny && bestMovePos) {
        recommendedAction = AIState.APPROACH;
      }
    }

    return {
      bestTarget,
      bestMovePosition: bestMovePos,
      recommendedAction,
      score: bestScore,
      canReachAnyPlayer: canReachAny,
      threatLevel,
      allyCount
    };
  }

  getBestMovePosition(): PositionComponent | null {
    const analysis = this.analyze();
    return analysis.bestMovePosition;
  }

  getRecommendedAction(): AIState {
    const analysis = this.analyze();
    return analysis.recommendedAction;
  }

  getBestTarget(): Entity | null {
    const analysis = this.analyze();
    return analysis.bestTarget;
  }
}

export function createEnemyAI(
  entity: Entity,
  allies: Entity[],
  enemies: Entity[],
  battleMap: BattleCell[],
  dimension: string
): EnemyAI {
  return new EnemyAI(entity, allies, enemies, battleMap, dimension);
}
