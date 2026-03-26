import {
    DamageType,
    TrapPlacementSurface,
    TrapStateEffect,
    TrapTriggerMode,
    TrapType
} from '../types';

export interface TrapData {
    id: string;
    name: string;
    type: TrapType;
    description: string;
    damage: number;
    damageType: DamageType;
    range: number;
    manaCost: number;
    cooldown: number;
    duration: number;
    triggerMessage: string;
    trapColor: string;
    particleEffect?: string;
    placementSurface?: TrapPlacementSurface;
    triggerMode?: TrapTriggerMode;
    stateEffect?: TrapStateEffect;
    forceVector?: { x: number; z: number };
}

const AUTO: TrapTriggerMode = 'auto';
const MANUAL: TrapTriggerMode = 'manual';
const FLOOR: TrapPlacementSurface = 'floor';
const WALL: TrapPlacementSurface = 'wall';
const CEILING: TrapPlacementSurface = 'ceiling';

export const TRAP_DATA: Record<TrapType, TrapData> = {
    [TrapType.SPIKE]: {
        id: 'spike_trap',
        name: 'Spike',
        type: TrapType.SPIKE,
        description: 'Piercing floor trap, good opener.',
        damage: 20,
        damageType: DamageType.PIERCING,
        range: 1,
        manaCost: 10,
        cooldown: 3,
        duration: 5,
        triggerMessage: 'Spikes burst from the floor!',
        trapColor: '#8b5cf6',
        placementSurface: FLOOR,
        triggerMode: AUTO,
        stateEffect: 'knockback',
        forceVector: { x: 0, z: 1 },
    },
    [TrapType.FIRE]: {
        id: 'fire_trap',
        name: 'Fire',
        type: TrapType.FIRE,
        description: 'Manual blast for combo extension.',
        damage: 30,
        damageType: DamageType.FIRE,
        range: 2,
        manaCost: 15,
        cooldown: 4,
        duration: 4,
        triggerMessage: 'A burst of flames erupts!',
        trapColor: '#ef4444',
        particleEffect: 'fire',
        placementSurface: FLOOR,
        triggerMode: MANUAL,
        stateEffect: 'launch',
    },
    [TrapType.ICE]: {
        id: 'ice_trap',
        name: 'Ice',
        type: TrapType.ICE,
        description: 'Applies stun setup for chains.',
        damage: 15,
        damageType: DamageType.COLD,
        range: 1,
        manaCost: 12,
        cooldown: 4,
        duration: 3,
        triggerMessage: 'Frozen shock!',
        trapColor: '#06b6d4',
        particleEffect: 'ice',
        placementSurface: FLOOR,
        triggerMode: AUTO,
        stateEffect: 'stun',
    },
    [TrapType.POISON]: {
        id: 'poison_trap',
        name: 'Poison',
        type: TrapType.POISON,
        description: 'Wall toxin for sustained pressure.',
        damage: 10,
        damageType: DamageType.POISON,
        range: 1,
        manaCost: 8,
        cooldown: 3,
        duration: 5,
        triggerMessage: 'Poison gas spreads!',
        trapColor: '#22c55e',
        particleEffect: 'smoke',
        placementSurface: WALL,
        triggerMode: AUTO,
        stateEffect: 'poison',
    },
    [TrapType.EXPLOSIVE]: {
        id: 'explosive_trap',
        name: 'Explosive',
        type: TrapType.EXPLOSIVE,
        description: 'Heavy manual detonation.',
        damage: 50,
        damageType: DamageType.FIRE,
        range: 3,
        manaCost: 25,
        cooldown: 6,
        duration: 3,
        triggerMessage: 'BOOM!',
        trapColor: '#f97316',
        particleEffect: 'explosion',
        placementSurface: FLOOR,
        triggerMode: MANUAL,
        stateEffect: 'launch',
    },
    [TrapType.STUN]: {
        id: 'stun_trap',
        name: 'Stun',
        type: TrapType.STUN,
        description: 'Ceiling shock for hard control.',
        damage: 5,
        damageType: DamageType.MAGIC,
        range: 1,
        manaCost: 15,
        cooldown: 5,
        duration: 2,
        triggerMessage: 'Lightning strike!',
        trapColor: '#eab308',
        particleEffect: 'lightning',
        placementSurface: CEILING,
        triggerMode: MANUAL,
        stateEffect: 'stun',
    },
    [TrapType.TELEPORT]: {
        id: 'teleport_trap',
        name: 'Teleport',
        type: TrapType.TELEPORT,
        description: 'Displaces target and breaks line.',
        damage: 0,
        damageType: DamageType.FORCE,
        range: 0,
        manaCost: 20,
        cooldown: 8,
        duration: 1,
        triggerMessage: 'Target blinks away!',
        trapColor: '#a855f7',
        placementSurface: FLOOR,
        triggerMode: MANUAL,
        stateEffect: 'none',
    },
    [TrapType.DECOY]: {
        id: 'decoy_trap',
        name: 'Decoy',
        type: TrapType.DECOY,
        description: 'Bait tool for enemy routing.',
        damage: 0,
        damageType: DamageType.MAGIC,
        range: 2,
        manaCost: 15,
        cooldown: 6,
        duration: 4,
        triggerMessage: 'A decoy lures enemies!',
        trapColor: '#ec4899',
        placementSurface: WALL,
        triggerMode: MANUAL,
        stateEffect: 'none',
    },
    [TrapType.TRAP_DOOR]: {
        id: 'trap_door_trap',
        name: 'Trap Door',
        type: TrapType.TRAP_DOOR,
        description: 'High launch burst from floor.',
        damage: 40,
        damageType: DamageType.BLUDGEONING,
        range: 1,
        manaCost: 30,
        cooldown: 8,
        duration: 2,
        triggerMessage: 'The floor collapses!',
        trapColor: '#475569',
        placementSurface: FLOOR,
        triggerMode: AUTO,
        stateEffect: 'launch',
    },
    [TrapType.ALARM]: {
        id: 'alarm_trap',
        name: 'Alarm',
        type: TrapType.ALARM,
        description: 'Alert and pressure control.',
        damage: 0,
        damageType: DamageType.MAGIC,
        range: 5,
        manaCost: 5,
        cooldown: 2,
        duration: 3,
        triggerMessage: 'Alarm triggered!',
        trapColor: '#dc2626',
        placementSurface: WALL,
        triggerMode: AUTO,
        stateEffect: 'none',
    },
};

export const TRAP_ICONS: Record<TrapType, string> = {
    [TrapType.SPIKE]: 'S',
    [TrapType.FIRE]: 'F',
    [TrapType.ICE]: 'I',
    [TrapType.POISON]: 'P',
    [TrapType.EXPLOSIVE]: 'X',
    [TrapType.STUN]: 'T',
    [TrapType.TELEPORT]: 'R',
    [TrapType.DECOY]: 'D',
    [TrapType.TRAP_DOOR]: 'O',
    [TrapType.ALARM]: 'A'
};

export const PLAYER_TRAP_LIMIT = 5;
export const TRAP_DETECTION_RANGE = 2;
