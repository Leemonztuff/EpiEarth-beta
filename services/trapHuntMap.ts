export type TacticalCellType = 'FLOOR' | 'WALL' | 'BRUSH' | 'STONE' | 'WATER';

export interface TacticalMapCell {
    x: number;
    z: number;
    type: TacticalCellType;
    height: number;
    walkable: boolean;
}

export interface TacticalPosition {
    x: number;
    z: number;
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

            map[x][z] = { x, z, type, height, walkable };
        }
    }

    // Keep the central hunting lane readable.
    for (let x = 6; x <= 11; x++) {
        for (let z = 6; z <= 11; z++) {
            map[x][z] = { x, z, type: 'FLOOR', height: 0, walkable: true };
        }
    }

    return map;
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
