import { 
    KageroRoom, 
    KageroDoor, 
    TrapSlot, 
    TrapSurface, 
    KageroMission, 
    KageroEnemyState, 
    KageroEnemyType,
    TrapResistances,
    TrapType 
} from '../types';

const CELL_SIZE = 2;
const ROOM_SIZE = 12;
const CORRIDOR_WIDTH = 4;

interface RoomTemplate {
    id: string;
    name: string;
    type: 'entry' | 'combat' | 'treasure' | 'boss';
    width: number;
    depth: number;
    trapSlotCount: number;
}

const ROOM_TEMPLATES: RoomTemplate[] = [
    { id: 'entry', name: 'Sala de Entrada', type: 'entry', width: 10, depth: 10, trapSlotCount: 4 },
    { id: 'combat_small', name: 'Cuarto de Caza', type: 'combat', width: 12, depth: 12, trapSlotCount: 6 },
    { id: 'combat_large', name: 'Gran Salon', type: 'combat', width: 16, depth: 16, trapSlotCount: 8 },
    { id: 'corridor_long', name: 'Pasillo', type: 'combat', width: 4, depth: 14, trapSlotCount: 2 },
    { id: 'treasure', name: 'Sala del Tesoro', type: 'treasure', width: 8, depth: 8, trapSlotCount: 3 },
    { id: 'boss', name: 'Camara del Senor', type: 'boss', width: 18, depth: 18, trapSlotCount: 10 },
];

const ENEMY_TEMPLATES: Record<KageroEnemyType, { name: string; baseHp: number; speed: number; detection: number; resistances: TrapResistances; gold: number }> = {
    [KageroEnemyType.GUARD]: {
        name: 'Guardia',
        baseHp: 40,
        speed: 1.0,
        detection: 4,
        resistances: { physical: 20, magical: 10, launch: 0, stun: 30, poison: 20, freeze: 30 },
        gold: 15,
    },
    [KageroEnemyType.BRUTE]: {
        name: 'Bruto',
        baseHp: 80,
        speed: 0.6,
        detection: 3,
        resistances: { physical: 40, magical: 20, launch: 10, stun: 50, poison: 40, freeze: 50 },
        gold: 25,
    },
    [KageroEnemyType.ROGUE]: {
        name: 'Picara',
        baseHp: 25,
        speed: 1.4,
        detection: 5,
        resistances: { physical: 10, magical: 30, launch: 30, stun: 10, poison: 10, freeze: 20 },
        gold: 20,
    },
    [KageroEnemyType.MAGE]: {
        name: 'Mago',
        baseHp: 30,
        speed: 0.9,
        detection: 6,
        resistances: { physical: 5, magical: 50, launch: 20, stun: 60, poison: 30, freeze: 70 },
        gold: 30,
    },
    [KageroEnemyType.ELITE]: {
        name: 'Elite',
        baseHp: 60,
        speed: 1.2,
        detection: 5,
        resistances: { physical: 30, magical: 40, launch: 20, stun: 40, poison: 30, freeze: 40 },
        gold: 40,
    },
    [KageroEnemyType.BOSS]: {
        name: 'Senor del Calabozo',
        baseHp: 150,
        speed: 0.8,
        detection: 6,
        resistances: { physical: 50, magical: 60, launch: 30, stun: 70, poison: 60, freeze: 70 },
        gold: 100,
    },
};

function mulberry32(seed: number) {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

function hashSeed(seed: string): number {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function generateDungeonLayout(seed: string, dungeonType: 'castle' | 'dungeon' | 'mansion' | 'prison'): RoomTemplate[] {
    const random = mulberry32(hashSeed(seed));
    const layouts: Record<string, RoomTemplate[]> = {
        castle: [
            { id: 'entry', name: 'Patio de Entrada', type: 'entry', width: 12, depth: 12, trapSlotCount: 5 },
            { id: 'corridor_long', name: 'Gran Salon', type: 'combat', width: 4, depth: 16, trapSlotCount: 3 },
            { id: 'combat_small', name: 'Torre Norte', type: 'combat', width: 10, depth: 10, trapSlotCount: 6 },
            { id: 'combat_large', name: 'Salon Principal', type: 'combat', width: 14, depth: 14, trapSlotCount: 8 },
            { id: 'boss', name: 'Trono del Senor', type: 'boss', width: 16, depth: 16, trapSlotCount: 10 },
        ],
        dungeon: [
            { id: 'entry', name: 'Entrada del Calabozo', type: 'entry', width: 10, depth: 10, trapSlotCount: 4 },
            { id: 'corridor_long', name: 'Pasillo Oscuro', type: 'combat', width: 4, depth: 12, trapSlotCount: 2 },
            { id: 'combat_small', name: 'Celda de Tortura', type: 'combat', width: 10, depth: 10, trapSlotCount: 5 },
            { id: 'combat_small', name: 'Almacen', type: 'combat', width: 12, depth: 8, trapSlotCount: 4 },
            { id: 'combat_large', name: 'Sala de Ejecucion', type: 'combat', width: 14, depth: 14, trapSlotCount: 8 },
            { id: 'boss', name: 'Foso del Demonio', type: 'boss', width: 16, depth: 16, trapSlotCount: 10 },
        ],
        mansion: [
            { id: 'entry', name: 'Vestibulo', type: 'entry', width: 10, depth: 10, trapSlotCount: 4 },
            { id: 'combat_small', name: 'Salon de Baile', type: 'combat', width: 14, depth: 12, trapSlotCount: 7 },
            { id: 'corridor_long', name: 'Galeria', type: 'combat', width: 4, depth: 14, trapSlotCount: 2 },
            { id: 'combat_small', name: 'Biblioteca', type: 'combat', width: 10, depth: 10, trapSlotCount: 5 },
            { id: 'treasure', name: 'Sala del Tesoro', type: 'treasure', width: 10, depth: 10, trapSlotCount: 3 },
            { id: 'boss', name: 'Santuario', type: 'boss', width: 16, depth: 16, trapSlotCount: 10 },
        ],
        prison: [
            { id: 'entry', name: 'Entrada', type: 'entry', width: 10, depth: 10, trapSlotCount: 4 },
            { id: 'corridor_long', name: 'Pasillo de Celdas', type: 'combat', width: 4, depth: 20, trapSlotCount: 3 },
            { id: 'combat_small', name: 'Celda de Aislamiento', type: 'combat', width: 8, depth: 8, trapSlotCount: 4 },
            { id: 'combat_small', name: 'Taller', type: 'combat', width: 12, depth: 10, trapSlotCount: 5 },
            { id: 'combat_large', name: 'Area Comun', type: 'combat', width: 14, depth: 14, trapSlotCount: 7 },
            { id: 'boss', name: 'Guardia Principal', type: 'boss', width: 14, depth: 14, trapSlotCount: 9 },
        ],
    };
    
    return layouts[dungeonType] || layouts.dungeon;
}

function generateTrapSlots(roomId: string, template: RoomTemplate, roomOffsetX: number, roomOffsetZ: number): TrapSlot[] {
    const slots: TrapSlot[] = [];
    const random = mulberry32(hashSeed(`${roomId}_slots`));
    
    const floorCount = Math.floor(template.trapSlotCount * 0.6);
    const wallCount = Math.floor(template.trapSlotCount * 0.3);
    const ceilingCount = template.trapSlotCount - floorCount - wallCount;
    
    for (let i = 0; i < floorCount; i++) {
        const x = roomOffsetX + 2 + Math.floor(random() * (template.width - 4));
        const z = roomOffsetZ + 2 + Math.floor(random() * (template.depth - 4));
        slots.push({
            id: `slot_${roomId}_floor_${i}`,
            roomId: roomId,
            surface: TrapSurface.FLOOR,
            position: { x: x * CELL_SIZE, y: 0.1, z: z * CELL_SIZE },
            rotation: 0,
            occupied: false,
            occupiedBy: null,
            trapId: null,
            validForSurface: [TrapSurface.FLOOR],
        });
    }
    
    for (let i = 0; i < wallCount; i++) {
        const isXWall = random() > 0.5;
        const x = isXWall ? (random() > 0.5 ? roomOffsetX + 1 : roomOffsetX + template.width - 2) : roomOffsetX + 2 + Math.floor(random() * (template.width - 4));
        const z = !isXWall ? (random() > 0.5 ? roomOffsetZ + 1 : roomOffsetZ + template.depth - 2) : roomOffsetZ + 2 + Math.floor(random() * (template.depth - 4));
        slots.push({
            id: `slot_${roomId}_wall_${i}`,
            roomId: roomId,
            surface: TrapSurface.WALL,
            position: { x: x * CELL_SIZE, y: 2, z: z * CELL_SIZE },
            rotation: isXWall ? 0 : Math.PI / 2,
            occupied: false,
            occupiedBy: null,
            trapId: null,
            validForSurface: [TrapSurface.WALL, TrapSurface.FLOOR],
        });
    }
    
    for (let i = 0; i < ceilingCount; i++) {
        const x = roomOffsetX + 2 + Math.floor(random() * (template.width - 4));
        const z = roomOffsetZ + 2 + Math.floor(random() * (template.depth - 4));
        slots.push({
            id: `slot_${roomId}_ceiling_${i}`,
            roomId: roomId,
            surface: TrapSurface.CEILING,
            position: { x: x * CELL_SIZE, y: 5, z: z * CELL_SIZE },
            rotation: 0,
            occupied: false,
            occupiedBy: null,
            trapId: null,
            validForSurface: [TrapSurface.CEILING, TrapSurface.FLOOR, TrapSurface.WALL],
        });
    }
    
    return slots;
}

function generateEnemiesForRoom(roomId: string, roomType: string, roomTemplate: RoomTemplate, roomOffsetX: number, roomOffsetZ: number, seed: string, tier: number = 1): KageroEnemyState[] {
    const random = mulberry32(hashSeed(`${roomId}_enemies`));
    const enemies: KageroEnemyState[] = [];
    
    let enemyCount = 0;
    if (roomTemplate.type === 'entry') enemyCount = 1 + Math.floor(random() * 2);
    else if (roomTemplate.type === 'combat') enemyCount = 2 + Math.floor(random() * 3);
    else if (roomTemplate.type === 'treasure') enemyCount = 1 + Math.floor(random() * 2);
    else if (roomTemplate.type === 'boss') enemyCount = 1;
    
    const enemyPool: KageroEnemyType[] = [];
    if (roomType === 'entry') {
        enemyPool.push(KageroEnemyType.GUARD, KageroEnemyType.GUARD);
    } else if (roomType === 'combat') {
        enemyPool.push(KageroEnemyType.GUARD, KageroEnemyType.GUARD, KageroEnemyType.ROGUE, KageroEnemyType.BRUTE);
    } else if (roomType === 'boss') {
        enemyPool.push(KageroEnemyType.BOSS);
    }
    
    for (let i = 0; i < enemyCount; i++) {
        const type = enemyPool[Math.floor(random() * enemyPool.length)];
        const enemyTemplate = ENEMY_TEMPLATES[type];
        
        const patrolPath = [
            { x: roomOffsetX + 3 + Math.floor(random() * (roomTemplate.width - 6)), z: roomOffsetZ + 3 + Math.floor(random() * (roomTemplate.depth - 6)) },
            { x: roomOffsetX + 3 + Math.floor(random() * (roomTemplate.width - 6)), z: roomOffsetZ + 3 + Math.floor(random() * (roomTemplate.depth - 6)) },
            { x: roomOffsetX + 3 + Math.floor(random() * (roomTemplate.width - 6)), z: roomOffsetZ + 3 + Math.floor(random() * (roomTemplate.depth - 6)) },
        ];
        
        const hp = Math.floor(enemyTemplate.baseHp * (1 + (tier - 1) * 0.5));
        
        enemies.push({
            id: `enemy_${roomId}_${i}`,
            name: `${enemyTemplate.name} ${i + 1}`,
            type,
            hp,
            maxHp: hp,
            position: { x: patrolPath[0].x * CELL_SIZE, y: 0.5, z: patrolPath[0].z * CELL_SIZE },
            roomId,
            aiState: 'patrol',
            patrolPath,
            patrolIndex: 0,
            targetPosition: null,
            detectionRadius: enemyTemplate.detection,
            moveSpeed: enemyTemplate.speed,
            alertLevel: 0,
            stunnedTurns: 0,
            poisonTurns: 0,
            confusedTurns: 0,
            frozenTurns: 0,
            resistances: { ...enemyTemplate.resistances },
            goldReward: Math.floor(enemyTemplate.gold * (1 + (tier - 1) * 0.3)),
            isAlive: true,
            isStunnedByTrap: null,
        });
    }
    
    return enemies;
}

export function generateKageroMission(
    seed: string,
    dungeonType: 'castle' | 'dungeon' | 'mansion' | 'prison',
    missionName: string,
    tier: number = 1
): KageroMission {
    const templates = generateDungeonLayout(seed, dungeonType);
    const random = mulberry32(hashSeed(seed + '_layout'));
    const rooms: KageroRoom[] = [];
    const doors: KageroDoor[] = [];
    const allEnemies: KageroEnemyState[] = [];
    
    let currentX = 0;
    let currentZ = 0;
    let maxDepth = 0;
    
    templates.forEach((roomTemplate, index) => {
        const roomId = `room_${index}`;
        const room: KageroRoom = {
            id: roomId,
            name: roomTemplate.name,
            roomType: roomTemplate.type,
            bounds: {
                minX: currentX,
                maxX: currentX + roomTemplate.width,
                minY: 0,
                maxY: 6,
                minZ: currentZ,
                maxZ: currentZ + roomTemplate.depth,
            },
            center: {
                x: (currentX + roomTemplate.width / 2) * CELL_SIZE,
                y: 2,
                z: (currentZ + roomTemplate.depth / 2) * CELL_SIZE,
            },
            trapSlots: generateTrapSlots(roomId, roomTemplate, currentX, currentZ),
            connectedRooms: [],
            doors: [],
            floorHeight: 0,
            wallHeight: 5,
            isCleared: roomTemplate.type === 'entry',
            enemySpawnPoints: [],
        };
        
        const enemies = generateEnemiesForRoom(roomId, roomTemplate.type, roomTemplate, currentX, currentZ, seed, tier);
        allEnemies.push(...enemies);
        
        rooms.push(room);
        
        maxDepth = Math.max(maxDepth, currentZ + roomTemplate.depth);
        
        if (index < templates.length - 1) {
            const corridorLength = 4 + Math.floor(random() * 6);
            currentZ += roomTemplate.depth + corridorLength;
        }
    });
    
    for (let i = 0; i < rooms.length - 1; i++) {
        const fromRoom = rooms[i];
        const toRoom = rooms[i + 1];
        
        const doorId = `door_${i}_${i + 1}`;
        doors.push({
            id: doorId,
            fromRoomId: fromRoom.id,
            toRoomId: toRoom.id,
            position: {
                x: fromRoom.center.x,
                y: 1,
                z: (fromRoom.bounds.maxZ + toRoom.bounds.minZ) / 2 * CELL_SIZE,
            },
            rotation: 0,
            isOpen: false,
            isLocked: i === rooms.length - 2,
        });
        
        fromRoom.connectedRooms.push(toRoom.id);
        fromRoom.doors.push(doors[doors.length - 1]);
        
        toRoom.connectedRooms.push(fromRoom.id);
        toRoom.doors.push(doors[doors.length - 1]);
    }
    
    const entryRoom = rooms[0];
    
    return {
        missionId: `kagero_${seed}`,
        missionName,
        dungeonType,
        seed,
        rooms,
        currentRoomId: entryRoom.id,
        enemies: allEnemies,
        placedTraps: [],
        totalEnemies: allEnemies.length,
        enemiesAlive: allEnemies.length,
        enemiesDefeated: 0,
        currentStep: 0,
        comboCount: 0,
        maxCombo: 0,
        missionProgress: 0,
        goldEarned: 0,
        missionComplete: false,
        missionFailed: false,
        playerPosition: { x: entryRoom.center.x, y: 0.8, z: entryRoom.center.z },
        playerRoomId: entryRoom.id,
    };
}

export function getMissionForTile(tileType: string, biome: string, tier: number = 1): { dungeonType: 'castle' | 'dungeon' | 'mansion' | 'prison', name: string } {
    const dungeonTypes: Record<string, { dungeonType: 'castle' | 'dungeon' | 'mansion' | 'prison', name: string }[]> = {
        forest: [
            { dungeonType: 'mansion', name: 'Mansion Encantada' },
            { dungeonType: 'castle', name: 'Castillo en Ruinas' },
        ],
        dungeon: [
            { dungeonType: 'dungeon', name: 'Calabozo Profundo' },
            { dungeonType: 'prison', name: 'Prision Abandonada' },
        ],
        mountain: [
            { dungeonType: 'castle', name: 'Fortaleza de Montaña' },
            { dungeonType: 'dungeon', name: 'Cueva del Dragón' },
        ],
        swamp: [
            { dungeonType: 'mansion', name: 'Casa de los Muertos' },
            { dungeonType: 'dungeon', name: 'Cripta del Pantano' },
        ],
        desert: [
            { dungeonType: 'castle', name: 'Templo Perdido' },
            { dungeonType: 'dungeon', name: 'Pirámide Maldita' },
        ],
    };
    
    const options = dungeonTypes[biome] || dungeonTypes.forest;
    return options[Math.floor(Math.random() * options.length)];
}
