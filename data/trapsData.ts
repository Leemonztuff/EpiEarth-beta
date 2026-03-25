import { TrapType, DamageType } from '../types';

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
}

export const TRAP_DATA: Record<TrapType, TrapData> = {
    [TrapType.SPIKE]: {
        id: 'spike_trap',
        name: 'Trampa de Púas',
        type: TrapType.SPIKE,
        description: 'Daña al objetivo que la active. Daño físico',
        damage: 20,
        damageType: DamageType.PIERCING,
        range: 1,
        manaCost: 10,
        cooldown: 3,
        duration: 5,
        triggerMessage: '¡Púas emergen del suelo!',
        trapColor: '#8b5cf6'
    },
    [TrapType.FIRE]: {
        id: 'fire_trap',
        name: 'Trampa de Fuego',
        type: TrapType.FIRE,
        description: 'Llamas erupcionan al activarse. Daño de fuego',
        damage: 30,
        damageType: DamageType.FIRE,
        range: 2,
        manaCost: 15,
        cooldown: 4,
        duration: 4,
        triggerMessage: '¡Una explosión de llamas!',
        trapColor: '#ef4444',
        particleEffect: 'fire'
    },
    [TrapType.ICE]: {
        id: 'ice_trap',
        name: 'Trampa de Hielo',
        type: TrapType.ICE,
        description: 'Congela al objetivo. Puede ralentizar',
        damage: 15,
        damageType: DamageType.COLD,
        range: 1,
        manaCost: 12,
        cooldown: 4,
        duration: 3,
        triggerMessage: '¡Hielo cristalino!',
        trapColor: '#06b6d4',
        particleEffect: 'ice'
    },
    [TrapType.POISON]: {
        id: 'poison_trap',
        name: 'Trampa Venenosa',
        type: TrapType.POISON,
        description: 'Envenena al objetivo con daño en el tiempo',
        damage: 10,
        damageType: DamageType.POISON,
        range: 1,
        manaCost: 8,
        cooldown: 3,
        duration: 5,
        triggerMessage: '¡Gas venenoso liberado!',
        trapColor: '#22c55e',
        particleEffect: 'smoke'
    },
    [TrapType.EXPLOSIVE]: {
        id: 'explosive_trap',
        name: 'Trampa Explosiva',
        type: TrapType.EXPLOSIVE,
        description: 'Gran explosión en área. Daño masivo',
        damage: 50,
        damageType: DamageType.FIRE,
        range: 3,
        manaCost: 25,
        cooldown: 6,
        duration: 3,
        triggerMessage: '¡BOOM!',
        trapColor: '#f97316',
        particleEffect: 'explosion'
    },
    [TrapType.STUN]: {
        id: 'stun_trap',
        name: 'Trampa de Aturdimiento',
        type: TrapType.STUN,
        description: 'Aturde al objetivo por un turno',
        damage: 5,
        damageType: DamageType.MAGIC,
        range: 1,
        manaCost: 15,
        cooldown: 5,
        duration: 2,
        triggerMessage: '¡Relámpago!',
        trapColor: '#eab308',
        particleEffect: 'lightning'
    },
    [TrapType.TELEPORT]: {
        id: 'teleport_trap',
        name: 'Trampa de Teletransporte',
        type: TrapType.TELEPORT,
        description: 'Mueve al objetivo a una ubicación aleatoria',
        damage: 0,
        damageType: DamageType.FORCE,
        range: 0,
        manaCost: 20,
        cooldown: 8,
        duration: 1,
        triggerMessage: '¡El objetivo desaparece!',
        trapColor: '#a855f7'
    },
    [TrapType.DECOY]: {
        id: 'decoy_trap',
        name: 'Señuelo',
        type: TrapType.DECOY,
        description: 'Distrae a los enemigos cercanos',
        damage: 0,
        damageType: DamageType.MAGIC,
        range: 2,
        manaCost: 15,
        cooldown: 6,
        duration: 4,
        triggerMessage: '¡Un señuelo aparece!',
        trapColor: '#ec4899'
    },
    [TrapType.TRAP_DOOR]: {
        id: 'trap_door_trap',
        name: 'Trampa Mortal',
        type: TrapType.TRAP_DOOR,
        description: 'Caída masiva de daño. Puede ser letal',
        damage: 40,
        damageType: DamageType.BLUDGEONING,
        range: 1,
        manaCost: 30,
        cooldown: 8,
        duration: 2,
        triggerMessage: '¡El suelo cede!',
        trapColor: '#475569'
    },
    [TrapType.ALARM]: {
        id: 'alarm_trap',
        name: 'Alarma',
        type: TrapType.ALARM,
        description: 'Alerta de presencia. No hace daño',
        damage: 0,
        damageType: DamageType.MAGIC,
        range: 5,
        manaCost: 5,
        cooldown: 2,
        duration: 3,
        triggerMessage: '¡Alarma activada!',
        trapColor: '#dc2626'
    }
};

export const TRAP_ICONS: Record<TrapType, string> = {
    [TrapType.SPIKE]: '⚙️',
    [TrapType.FIRE]: '🔥',
    [TrapType.ICE]: '❄️',
    [TrapType.POISON]: '☠️',
    [TrapType.EXPLOSIVE]: '💥',
    [TrapType.STUN]: '⚡',
    [TrapType.TELEPORT]: '🌀',
    [TrapType.DECOY]: '🎭',
    [TrapType.TRAP_DOOR]: '🕳️',
    [TrapType.ALARM]: '🔔'
};

export const PLAYER_TRAP_LIMIT = 5;
export const TRAP_DETECTION_RANGE = 2;
