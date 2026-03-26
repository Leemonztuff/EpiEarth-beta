import { DoorState, DungeonBlueprint, DungeonRoomGraph, DungeonRoomNode } from '../types';

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

function addConnection(rooms: Record<string, DungeonRoomNode>, from: string, to: string) {
    if (!rooms[from] || !rooms[to]) return;
    if (!rooms[from].neighbors.includes(to)) {
        rooms[from].neighbors.push(to);
    }
    if (!rooms[to].neighbors.includes(from)) {
        rooms[to].neighbors.push(from);
    }
}

export function generateMixedDungeonLayout(blueprint: DungeonBlueprint, layoutSeed: string): DungeonRoomGraph {
    const random = mulberry32(hashSeed(layoutSeed));
    const rooms: Record<string, DungeonRoomNode> = {};

    blueprint.rooms.forEach(room => {
        rooms[room.id] = {
            id: room.id,
            label: room.label,
            objective: room.objective,
            isSecret: room.isSecret,
            elite: room.elite,
            neighbors: [],
        };
    });

    // Template backbone (linear) first.
    for (let i = 0; i < blueprint.rooms.length - 1; i++) {
        addConnection(rooms, blueprint.rooms[i].id, blueprint.rooms[i + 1].id);
    }

    // Procedural shortcuts/branches (mixed layout).
    for (let i = 0; i < blueprint.rooms.length; i++) {
        for (let j = i + 2; j < blueprint.rooms.length; j++) {
            const chance = blueprint.rooms[j].isSecret ? 0.12 : 0.2;
            if (random() < chance) {
                addConnection(rooms, blueprint.rooms[i].id, blueprint.rooms[j].id);
            }
        }
    }

    const doors: DungeonRoomGraph['doors'] = {};
    const seen = new Set<string>();
    Object.values(rooms).forEach(room => {
        room.neighbors.forEach(neighbor => {
            const key = room.id < neighbor ? `${room.id}|${neighbor}` : `${neighbor}|${room.id}`;
            if (seen.has(key)) return;
            seen.add(key);
            const doorId = `door_${room.id}_${neighbor}`.replace(/[^a-zA-Z0-9_]/g, '_');
            const isSecretPath = rooms[neighbor]?.isSecret || room.isSecret;
            const initialState: DoorState = isSecretPath ? 'locked' : 'closed';
            doors[doorId] = {
                id: doorId,
                fromRoomId: room.id,
                toRoomId: neighbor,
                state: initialState,
                blocksLineOfSight: true,
            };
        });
    });

    return {
        rooms,
        doors,
        entryRoomId: blueprint.rooms[0]?.id ?? '',
    };
}
