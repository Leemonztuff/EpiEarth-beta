
// @ts-nocheck
import { HexCell, TerrainType, WeatherType, Dimension, MovementType, NPCEntity, BattleCell } from '../types';
import { BATTLE_TEXTURES, BATTLE_MAP_SIZE } from '../constants';

class Mulberry32 {
    private state: number;
    constructor(seed: number) { this.state = seed; }
    next(): number {
        this.state |= 0; this.state = (this.state + 0x6D2B79F5) | 0;
        let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

const fnv1a = (str: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

export class WorldGenerator {
    private static seed: number = 0;

    static init(seed: number) {
        this.seed = seed;
    }

    static getTile(q: number, r: number, dimension: Dimension): HexCell {
        const key = `${q},${r},${dimension}`;
        const rng = new Mulberry32(fnv1a(key) ^ this.seed);
        
        const noise = rng.next();
        let terrain = TerrainType.GRASS;
        if (noise < 0.1) terrain = TerrainType.MOUNTAIN;
        else if (noise < 0.2) terrain = TerrainType.WATER;
        else if (noise < 0.3) terrain = TerrainType.FOREST;
        else if (noise < 0.35) terrain = TerrainType.DESERT;
        else if (noise < 0.4) terrain = TerrainType.SWAMP;

        if (dimension === Dimension.UPSIDE_DOWN) {
            if (terrain === TerrainType.GRASS) terrain = TerrainType.WASTELAND;
            if (terrain === TerrainType.WATER) terrain = TerrainType.CHASM;
        }

        const poiRoll = rng.next();
        let poiType: string | undefined = undefined;
        let hasPortal = rng.next() > 0.98;
        let hasEncounter = rng.next() > 0.92;

        if (poiRoll > 0.98) poiType = 'CITY';
        else if (poiRoll > 0.95) poiType = 'VILLAGE';
        else if (poiRoll > 0.92) poiType = 'DUNGEON';
        else if (poiRoll > 0.90) poiType = 'TEMPLE';

        return {
            q, r, terrain,
            isExplored: false, isVisible: false,
            weather: WeatherType.NONE,
            poiType, hasPortal, hasEncounter,
            regionName: `${terrain} Region ${Math.abs(q+r)}`,
            movementType: MovementType.WALK
        };
    }

    static generateSettlementMap(q: number, r: number, type: 'CITY' | 'VILLAGE'): HexCell[] {
        const cells: HexCell[] = [];
        for (let dq = -3; dq <= 3; dq++) {
            for (let dr = -3; dr <= 3; dr++) {
                if (Math.abs(dq + dr) <= 3) {
                    let terrain = TerrainType.COBBLESTONE;
                    let poiType: string | undefined = undefined;
                    if (dq === 0 && dr === 0) poiType = 'EXIT';
                    else if (Math.abs(dq) + Math.abs(dr) > 2) terrain = TerrainType.GRASS;
                    
                    cells.push({
                        q: dq, r: dr, terrain,
                        isExplored: true, isVisible: true,
                        weather: WeatherType.NONE,
                        poiType
                    });
                }
            }
        }
        return cells;
    }

    static generateDungeon(levels: number): HexCell[] {
        const cells: HexCell[] = [];
        for (let dq = -5; dq <= 5; dq++) {
            for (let dr = -5; dr <= 5; dr++) {
                if (Math.abs(dq + dr) <= 5) {
                    let terrain = TerrainType.DUNGEON_FLOOR;
                    let poiType: string | undefined = undefined;
                    if (dq === 0 && dr === 0) poiType = 'EXIT';
                    
                    cells.push({
                        q: dq, r: dr, terrain,
                        isExplored: true, isVisible: true,
                        weather: WeatherType.NONE,
                        poiType
                    });
                }
            }
        }
        return cells;
    }

    static generateBattleArena(biome: TerrainType, isVoid: boolean): BattleCell[] {
        const cells: BattleCell[] = [];
        const size = BATTLE_MAP_SIZE;
        const rng = new Mulberry32(fnv1a(`${biome}-${isVoid}`));
        
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                const distToCenter = Math.sqrt(Math.pow(x - size/2, 2) + Math.pow(z - size/2, 2));
                let height = 1 + Math.floor(rng.next() * 2);
                
                if (distToCenter > size/2.5) {
                    height += Math.floor(rng.next() * 3);
                }

                const terrainType = (rng.next() > 0.9 && biome !== TerrainType.WATER) ? TerrainType.MOUNTAIN : biome;
                
                // HP basado en dureza del bioma
                let baseHp = 20;
                if (terrainType === TerrainType.MOUNTAIN) baseHp = 50;
                if (terrainType === TerrainType.WATER || terrainType === TerrainType.LAVA) baseHp = 999; // Indestructible

                cells.push({
                    x, z,
                    height,
                    maxHeight: height,
                    hp: baseHp,
                    maxHp: baseHp,
                    offsetY: 0,
                    terrain: terrainType,
                    color: isVoid ? '#2d1b4e' : '#ffffff',
                    isObstacle: height > 3,
                    blocksSight: height > 3,
                    movementCost: terrainType === TerrainType.MOUNTAIN ? 2 : 1,
                    textureUrl: BATTLE_TEXTURES[terrainType] || BATTLE_TEXTURES[TerrainType.STONE_FLOOR]
                });
            }
        }
        return cells;
    }
}
