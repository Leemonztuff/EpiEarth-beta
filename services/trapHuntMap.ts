export type TacticalCellType = 'FLOOR' | 'WALL' | 'BRUSH' | 'STONE' | 'WATER';
export type TacticalCellZone = 'ROOM' | 'CORRIDOR' | 'BOUNDARY';
export type TacticalEnvironmentTrapType = 'fire_pit' | 'crusher' | 'pendulum' | 'explosive_barrel' | 'electric_chair' | 'spike_wall';

export interface TacticalMapCell {
    x: number;
    z: number;
    type: TacticalCellType;
    height: number;
    walkable: boolean;
    zone: TacticalCellZone;
    envTrapType?: TacticalEnvironmentTrapType | null;
}

export interface TacticalPosition {
    x: number;
    z: number;
}

export interface TacticalEnvironmentTrap {
    id: string;
    type: TacticalEnvironmentTrapType;
    position: TacticalPosition;
    damage: number;
    stateEffect: 'stun' | 'launch' | 'knockback' | 'none';
    forceVector: TacticalPosition;
}

export interface DungeonRoomLayoutResult {
    map: TacticalMapCell[][];
    entrances: TacticalPosition[];
    environmentTraps: TacticalEnvironmentTrap[];
}

export const TACTICAL_MAP_SIZE = 18;
const MIN_PLAY_AREA = 1;
const MAX_PLAY_AREA = TACTICAL_MAP_SIZE - 2;

function hashSeed(seed: string): number {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function mulberry32(seed: number) {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

export function generateTacticalMap(seed: string): TacticalMapCell[][] {
    const random = mulberry32(hashSeed(seed));
    const map: TacticalMapCell[][] = [];

    for (let x = 0; x < TACTICAL_MAP_SIZE; x++) {
        map[x] = [];
        for (let z = 0; z < TACTICAL_MAP_SIZE; z++) {
            let type: TacticalCellType = 'FLOOR';
            let height = 0;
            let walkable = true;

            if (x === 0 || z === 0 || x === TACTICAL_MAP_SIZE - 1 || z === TACTICAL_MAP_SIZE - 1) {
                type = 'WALL';
                height = 2.5;
                walkable = false;
            } else {
                const roll = random();
                if (roll < 0.08) {
                    type = 'STONE';
                    height = 1.2;
                    walkable = false;
                } else if (roll < 0.18) {
                    type = 'BRUSH';
                    height = 0.25;
                } else if (roll < 0.22) {
                    type = 'WATER';
                    height = -0.15;
                    walkable = false;
                }
            }

            map[x][z] = { x, z, type, height, walkable, zone: walkable ? 'ROOM' : 'BOUNDARY' };
        }
    }

    // Keep the central hunting lane readable.
    for (let x = 6; x <= 11; x++) {
        for (let z = 6; z <= 11; z++) {
            map[x][z] = { x, z, type: 'FLOOR', height: 0, walkable: true, zone: 'ROOM' };
        }
    }

    return map;
}

function createBaseDungeonMap(): TacticalMapCell[][] {
    const map: TacticalMapCell[][] = [];
    for (let x = 0; x < TACTICAL_MAP_SIZE; x++) {
        map[x] = [];
        for (let z = 0; z < TACTICAL_MAP_SIZE; z++) {
            const boundary = x === 0 || z === 0 || x === TACTICAL_MAP_SIZE - 1 || z === TACTICAL_MAP_SIZE - 1;
            map[x][z] = {
                x,
                z,
                type: boundary ? 'WALL' : 'FLOOR',
                height: boundary ? 2.2 : 0,
                walkable: !boundary,
                zone: boundary ? 'BOUNDARY' : 'ROOM',
                envTrapType: null,
            };
        }
    }
    return map;
}

function carveCorridor(map: TacticalMapCell[][], from: TacticalPosition, to: TacticalPosition) {
    let cx = from.x;
    let cz = from.z;
    while (cx !== to.x || cz !== to.z) {
        if (cx < to.x) cx += 1;
        else if (cx > to.x) cx -= 1;
        else if (cz < to.z) cz += 1;
        else if (cz > to.z) cz -= 1;

        if (!isInBounds(cx, cz)) break;
        if (!map[cx][cz]) break;
        map[cx][cz] = {
            ...map[cx][cz],
            type: 'FLOOR',
            walkable: true,
            zone: 'CORRIDOR',
            envTrapType: null,
        };
    }
}

function envTrapByType(type: TacticalEnvironmentTrapType, x: number, z: number): TacticalEnvironmentTrap {
    switch (type) {
        case 'fire_pit':
            return { id: `env_${type}_${x}_${z}`, type, position: { x, z }, damage: 22, stateEffect: 'none', forceVector: { x: 0, z: 0 } };
        case 'crusher':
            return { id: `env_${type}_${x}_${z}`, type, position: { x, z }, damage: 30, stateEffect: 'stun', forceVector: { x: 0, z: 0 } };
        case 'pendulum':
            return { id: `env_${type}_${x}_${z}`, type, position: { x, z }, damage: 18, stateEffect: 'knockback', forceVector: { x: 1, z: 0 } };
        case 'explosive_barrel':
            return { id: `env_${type}_${x}_${z}`, type, position: { x, z }, damage: 35, stateEffect: 'launch', forceVector: { x: 0, z: 1 } };
        case 'electric_chair':
            return { id: `env_${type}_${x}_${z}`, type, position: { x, z }, damage: 12, stateEffect: 'stun', forceVector: { x: 0, z: 0 } };
        default:
            return { id: `env_${type}_${x}_${z}`, type, position: { x, z }, damage: 20, stateEffect: 'knockback', forceVector: { x: -1, z: 0 } };
    }
}

export function generateDungeonRoomMap(seed: string, roomKind: 'entry' | 'offense' | 'setup' | 'technical' = 'setup'): DungeonRoomLayoutResult {
    const random = mulberry32(hashSeed(seed));
    const map = createBaseDungeonMap();
    const center = { x: Math.floor(TACTICAL_MAP_SIZE / 2), z: Math.floor(TACTICAL_MAP_SIZE / 2) };
    const entrances: TacticalPosition[] = [
        { x: center.x, z: 1 },
        { x: TACTICAL_MAP_SIZE - 2, z: center.z },
        { x: center.x, z: TACTICAL_MAP_SIZE - 2 },
        { x: 1, z: center.z },
    ];

    entrances.forEach(ent => carveCorridor(map, ent, center));

    // subtle blockers to force local combo lanes
    for (let i = 0; i < 8; i++) {
        const x = 2 + Math.floor(random() * (TACTICAL_MAP_SIZE - 4));
        const z = 2 + Math.floor(random() * (TACTICAL_MAP_SIZE - 4));
        if (map[x][z].zone === 'CORRIDOR') continue;
        map[x][z] = { ...map[x][z], type: 'STONE', height: 1.0, walkable: false, zone: 'ROOM' };
    }

    const environmentTraps: TacticalEnvironmentTrap[] = [];
    const roomTrapPattern: Record<string, TacticalEnvironmentTrapType[]> = {
        entry: ['spike_wall'],
        offense: ['fire_pit', 'explosive_barrel', 'pendulum'],
        setup: ['electric_chair'],
        technical: ['crusher', 'pendulum'],
    };
    const selected = roomTrapPattern[roomKind] || roomTrapPattern.setup;
    const anchors = [
        { x: center.x, z: center.z },
        { x: center.x - 2, z: center.z + 1 },
        { x: center.x + 2, z: center.z - 1 },
    ];
    selected.forEach((type, idx) => {
        const anchor = anchors[idx % anchors.length];
        if (!isWalkable(map, anchor.x, anchor.z)) return;
        const envTrap = envTrapByType(type, anchor.x, anchor.z);
        environmentTraps.push(envTrap);
        map[anchor.x][anchor.z] = { ...map[anchor.x][anchor.z], envTrapType: type, zone: 'ROOM' };
    });

    return { map, entrances, environmentTraps };
}

export function isInBounds(x: number, z: number): boolean {
    return x >= 0 && z >= 0 && x < TACTICAL_MAP_SIZE && z < TACTICAL_MAP_SIZE;
}

export function isWalkable(map: TacticalMapCell[][], x: number, z: number): boolean {
    return isInBounds(x, z) && !!map[x]?.[z]?.walkable;
}

export function getNeighbors(map: TacticalMapCell[][], pos: TacticalPosition): TacticalPosition[] {
    const directions = [
        { x: 1, z: 0 },
        { x: -1, z: 0 },
        { x: 0, z: 1 },
        { x: 0, z: -1 },
    ];

    return directions
        .map(dir => ({ x: pos.x + dir.x, z: pos.z + dir.z }))
        .filter(next => isWalkable(map, next.x, next.z));
}

export function manhattanDistance(a: TacticalPosition, b: TacticalPosition): number {
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

export function findClosestStepTowards(
    map: TacticalMapCell[][],
    from: TacticalPosition,
    target: TacticalPosition,
    blocked: Set<string>
): TacticalPosition {
    const neighbors = getNeighbors(map, from).filter(next => !blocked.has(`${next.x},${next.z}`));
    if (neighbors.length === 0) {
        return from;
    }

    neighbors.sort((left, right) => manhattanDistance(left, target) - manhattanDistance(right, target));
    return neighbors[0];
}

export function findFreeSpawnPositions(
    map: TacticalMapCell[][],
    playerStart: TacticalPosition,
    count: number
): TacticalPosition[] {
    const positions: TacticalPosition[] = [];
    const occupied = new Set<string>([`${playerStart.x},${playerStart.z}`]);

    for (let x = MIN_PLAY_AREA; x <= MAX_PLAY_AREA; x++) {
        for (let z = MIN_PLAY_AREA; z <= MAX_PLAY_AREA; z++) {
            if (!isWalkable(map, x, z)) {
                continue;
            }

            const pos = { x, z };
            if (manhattanDistance(pos, playerStart) < 5) {
                continue;
            }

            const key = `${x},${z}`;
            if (occupied.has(key)) {
                continue;
            }

            positions.push(pos);
            occupied.add(key);
            if (positions.length >= count) {
                return positions;
            }
        }
    }

    return positions;
}

export function clampPlacementToRange(
    origin: TacticalPosition,
    target: TacticalPosition,
    range: number
): TacticalPosition | null {
    if (manhattanDistance(origin, target) > range) {
        return null;
    }

    return target;
}
