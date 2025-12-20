
// @ts-nocheck
import { HexCell, TerrainType, WeatherType, Dimension, MovementType, NPCEntity } from '../types';
import { useContentStore } from '../store/contentStore';

// Cube coordinates helper for hex math
interface Cube { q: number; r: number; s: number; }
function axialToCube(q: number, r: number): Cube { return { q, r, s: -q - r }; }
function cubeDistance(a: Cube, b: Cube): number { 
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2; 
}
function cubeLerp(a: Cube, b: Cube, t: number): Cube {
    return {
        q: a.q + (b.q - a.q) * t,
        r: a.r + (b.r - a.r) * t,
        s: a.s + (b.s - a.s) * t
    };
}
function cubeRound(c: Cube): Cube {
    let rq = Math.round(c.q);
    let rr = Math.round(c.r);
    let rs = Math.round(c.s);
    const qDiff = Math.abs(rq - c.q);
    const rDiff = Math.abs(rr - c.r);
    const sDiff = Math.abs(rs - c.s);
    if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
    else if (rDiff > sDiff) rr = -rq - rs;
    else rs = -rq - rr;
    return { q: rq, r: rr, s: rs };
}

export class Mulberry32 {
    private a: number;
    constructor(seed: number) { this.a = seed; }
    next(): number {
        var t = this.a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

const PERM = new Uint8Array(512);
const GRAD3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];

const seedNoise = (seed: number) => {
    const rng = new Mulberry32(seed);
    const p = new Uint8Array(256);
    for(let i=0; i<256; i++) p[i] = i;
    for(let i=0; i<256; i++) {
        const r = Math.floor(rng.next() * 256);
        const temp = p[i]; p[i] = p[r]; p[r] = temp;
    }
    for(let i=0; i<512; i++) PERM[i] = p[i & 255];
};

const dot = (g: number[], x: number, y: number) => g[0]*x + g[1]*y;

export const noise2D = (xin: number, yin: number): number => {
    let n0, n1, n2;
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1, j1;
    if(x0 > y0) { i1=1; j1=0; } else { i1=0; j1=1; }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = PERM[ii+PERM[jj]] % 12;
    const gi1 = PERM[ii+i1+PERM[jj+j1]] % 12;
    const gi2 = PERM[ii+1+PERM[jj+1]] % 12;
    let t0 = 0.5 - x0*x0 - y0*y0;
    if(t0<0) n0 = 0.0; else { t0 *= t0; n0 = t0 * t0 * dot(GRAD3[gi0], x0, y0); }
    let t1 = 0.5 - x1*x1 - y1*y1;
    if(t1<0) n1 = 0.0; else { t1 *= t1; n1 = t1 * t1 * dot(GRAD3[gi1], x1, y1); }
    let t2 = 0.5 - x2*x2 - y2*y2;
    if(t2<0) n2 = 0.0; else { t2 *= t2; n2 = t2 * t2 * dot(GRAD3[gi2], x2, y2); }
    return 70.0 * (n0 + n1 + n2);
};

const fbm = (x: number, y: number, octaves: number, persistence: number = 0.5): number => {
    let total = 0; let amplitude = 1; let frequency = 1; let maxValue = 0;
    for(let i=0; i<octaves; i++) {
        total += noise2D(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        frequency *= 2.0; amplitude *= persistence;
    }
    return total / maxValue;
};

const getBiome = (elevation: number, moisture: number, temperature: number, dimension: Dimension): { terrain: TerrainType, weather: WeatherType } => {
    if (dimension === Dimension.NORMAL) {
        if (elevation < -0.55) return { terrain: TerrainType.OCEAN, weather: moisture > 0.6 ? WeatherType.FOG : WeatherType.NONE };
        if (elevation < -0.35) return { terrain: TerrainType.WATER, weather: WeatherType.NONE };
        if (elevation > 0.75) return { terrain: TerrainType.MOUNTAIN, weather: temperature < 0 ? WeatherType.SNOW : WeatherType.NONE };
        
        if (temperature < -0.5) return { terrain: TerrainType.TUNDRA, weather: WeatherType.SNOW };
        if (temperature < -0.2) return { terrain: TerrainType.TAIGA, weather: WeatherType.SNOW };
        
        if (temperature > 0.5) {
            if (moisture > 0.5) return { terrain: TerrainType.JUNGLE, weather: WeatherType.RAIN };
            if (moisture < -0.3) return { terrain: TerrainType.DESERT, weather: WeatherType.SANDSTORM };
            return { terrain: TerrainType.SAVANNAH, weather: WeatherType.HEATWAVE };
        }

        if (moisture > 0.4) {
            if (elevation > 0.4) return { terrain: TerrainType.RUINS, weather: WeatherType.FOG };
            return { terrain: TerrainType.SWAMP, weather: WeatherType.FOG };
        }
        
        if (moisture > 0.1) return { terrain: TerrainType.FOREST, weather: WeatherType.NONE };
        return { terrain: TerrainType.GRASS, weather: WeatherType.NONE };
    } else {
        if (elevation < -0.2) return { terrain: TerrainType.CHASM, weather: WeatherType.ASH };
        if (elevation > 0.6) return { terrain: TerrainType.LAVA, weather: WeatherType.ASH };
        if (moisture > 0.3) return { terrain: TerrainType.FUNGUS, weather: WeatherType.FOG };
        return { terrain: TerrainType.BADLANDS, weather: WeatherType.FOG };
    }
};

const fnv1a = (str: string): number => {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

export class WorldGenerator {
    private static isInitialized = false;
    private static seed = 12345;
    private static chunkCache = new Map<string, Record<string, HexCell>>();
    private static HUB_SPACING = 20;

    static init(seed: number) {
        if (this.seed === seed && this.isInitialized) return;
        this.seed = seed; seedNoise(seed);
        this.chunkCache.clear(); this.isInitialized = true;
    }

    static getTile(q: number, r: number, dimension: Dimension): HexCell {
        if (!this.isInitialized) this.init(this.seed);
        const chunkQ = Math.floor(q / 16); const chunkR = Math.floor(r / 16);
        const chunkKey = `${chunkQ},${chunkR},${dimension}`;
        let chunk = this.chunkCache.get(chunkKey);
        if (!chunk) {
            chunk = {};
            for (let i = 0; i < 16; i++) {
                for (let j = 0; j < 16; j++) {
                    const lq = chunkQ * 16 + i; const lr = chunkR * 16 + j;
                    chunk[`${lq},${lr}`] = this.generateSingleTile(lq, lr, dimension);
                }
            }
            this.chunkCache.set(chunkKey, chunk);
        }
        return chunk[`${q},${r}`] || this.generateSingleTile(q, r, dimension);
    }

    private static getPOITypeAt(q: number, r: number, dimension: Dimension): string | undefined {
        const rng = new Mulberry32(fnv1a(`${q},${r},${dimension}`));
        
        // Asignación determinista de hubs basada en rejilla
        const isHub = (q % this.HUB_SPACING === 0 && r % this.HUB_SPACING === 0);
        if (isHub) {
            const typeRoll = rng.next();
            if (typeRoll > 0.92) return 'CITY';
            if (typeRoll > 0.75) return 'TOWN';
            return 'VILLAGE';
        }

        const scale = 0.08;
        const elevation = fbm(q * scale, r * scale, 4);
        
        // POIs naturales y especiales
        const chance = rng.next();
        if (elevation > 0.6 && chance > 0.992) return 'DUNGEON';
        if (elevation < 0.2 && chance > 0.995) return 'RUINS';
        if (chance > 0.999) return 'TEMPLE';
        
        return undefined;
    }

    private static generateSingleTile(q: number, r: number, dimension: Dimension): HexCell {
        const scale = 0.08;
        const elevation = fbm(q * scale, r * scale, 4);
        const moisture = fbm(q * scale + 200, r * scale + 200, 2);
        const temperature = fbm(q * scale - 200, r * scale - 200, 2);
        
        const biome = getBiome(elevation, moisture, temperature, dimension);
        const poiType = this.getPOITypeAt(q, r, dimension);
        const rng = new Mulberry32(fnv1a(`${q},${r},${dimension}`));

        let finalTerrain = biome.terrain;
        let isOnRoad = false;
        let roadType = TerrainType.DIRT_ROAD;

        // Lógica de Caminos jerárquica
        if (dimension === Dimension.NORMAL && finalTerrain !== TerrainType.WATER && finalTerrain !== TerrainType.OCEAN && !poiType) {
            const hq = Math.floor(q / this.HUB_SPACING) * this.HUB_SPACING;
            const hr = Math.floor(r / this.HUB_SPACING) * this.HUB_SPACING;
            
            const neighbors = [[0,0], [1,0], [0,1], [1,1], [-1,0], [0,-1]];

            for (const [dq, dr] of neighbors) {
                const hubA = { q: hq, r: hr };
                const hubB = { q: hq + dq * this.HUB_SPACING, r: hr + dr * this.HUB_SPACING };

                const typeA = this.getPOITypeAt(hubA.q, hubA.r, dimension);
                const typeB = this.getPOITypeAt(hubB.q, hubB.r, dimension);

                if (typeA && typeB) {
                    const cubeA = axialToCube(hubA.q, hubA.r);
                    const cubeB = axialToCube(hubB.q, hubB.r);
                    const cubeP = axialToCube(q, r);
                    
                    const distAB = cubeDistance(cubeA, cubeB);
                    if (distAB === 0) continue;

                    // Proyectar punto P sobre el segmento AB
                    for (let step = 0; step <= distAB; step++) {
                        const t = step / distAB;
                        const pos = cubeRound(cubeLerp(cubeA, cubeB, t));
                        if (pos.q === cubeP.q && pos.r === cubeP.r) {
                            isOnRoad = true;
                            // Calzada de piedra entre ciudades, tierra entre otros
                            if ((typeA === 'CITY' || typeA === 'TOWN') && (typeB === 'CITY' || typeB === 'TOWN')) {
                                roadType = TerrainType.COBBLESTONE;
                            }
                            break;
                        }
                    }
                }
                if (isOnRoad) break;
            }
            if (isOnRoad) finalTerrain = roadType;
        }

        const hasPortal = (biome.terrain === TerrainType.ANCIENT_MONUMENT || (elevation > 0.5 && rng.next() > 0.985));

        return {
            q, r, 
            terrain: finalTerrain, 
            weather: biome.weather,
            isExplored: false, isVisible: false,
            hasPortal,
            hasEncounter: finalTerrain !== TerrainType.WATER && finalTerrain !== TerrainType.OCEAN && !poiType && !isOnRoad && rng.next() > 0.96,
            regionName: this.getRegionName(q, r, poiType),
            poiType,
            movementType: (finalTerrain === TerrainType.WATER || finalTerrain === TerrainType.OCEAN) ? MovementType.SAIL : MovementType.WAL
        };
    }

    static getRegionName(q: number, r: number, poi?: string): string {
        const prefixes = ["Gilded", "Crimson", "Shattered", "Verdan", "Silent", "Iron", "Forgotten", "Clouded", "Burning", "Ancient"];
        const suffixes = ["Reach", "Barony", "Wilds", "March", "Valley", "Coast", "Plateau", "Delta", "Peaks", "Plains"];
        const cityNames = ["Aethelgard", "Oakhaven", "Stonehall", "Emberfall", "Cloudspire", "Ironforge", "Ravenport", "Lumina"];
        
        const n1 = noise2D(q * 0.005, r * 0.005);
        const idx = Math.floor(Math.abs(n1 * cityNames.length)) % cityNames.length;
        
        if (poi === 'CITY') return cityNames[idx];
        if (poi === 'TOWN' || poi === 'VILLAGE') return `${prefixes[idx % prefixes.length]} Settlement`;
        return `${prefixes[idx % prefixes.length]} ${suffixes[Math.floor(Math.abs(n1 * suffixes.length)) % suffixes.length]}`;
    }

    static generateSettlementMap(parentQ: number, parentR: number, type: 'VILLAGE' | 'TOWN' | 'CITY'): HexCell[] {
        const sizeMap = { VILLAGE: 4, TOWN: 7, CITY: 10 };
        const size = sizeMap[type] || 5;
        const cells: HexCell[] = [];
        const seed = fnv1a(`settlement_${parentQ}_${parentR}`);
        const rng = new Mulberry32(seed);

        for (let q = -size; q <= size; q++) {
            for (let r = -size; r <= size; r++) {
                if (Math.abs(q) + Math.abs(r) + Math.abs(-q - r) <= size * 2) {
                    const dist = (Math.abs(q) + Math.abs(r) + Math.abs(-q-r)) / 2;
                    let terrain = TerrainType.COBBLESTONE;
                    let poiType: any = undefined;
                    let npcs: NPCEntity[] | undefined = undefined;
                    
                    if (dist > size - 0.5) {
                        terrain = TerrainType.GRASS;
                        poiType = 'EXIT';
                    } else if (dist < 1) {
                         terrain = TerrainType.STONE_FLOOR;
                         poiType = 'PLAZA';
                         npcs = [{
                             id: `npc_${parentQ}_${parentR}_plaza`,
                             name: "Elder of " + (type === 'CITY' ? "Metropolis" : "Town"),
                             role: "Guía",
                             sprite: "units/human-magi/white-mage.png",
                             dialogue: ["Welcome traveler. The paths are treacherous these days."],
                             questId: rng.next() > 0.7 ? `q_${parentQ}_${parentR}` : undefined,
                             startNodeId: 'start',
                             dialogueNodes: {
                               'start': {
                                 id: 'start',
                                 text: "The fabric of our world is thinning, traveler. I see the light of Eternum in your eyes.",
                                 options: [
                                   { label: "What is happening to the world?", nextNodeId: 'history' },
                                   { label: "I am looking for work.", nextNodeId: 'quest_check' },
                                   { label: "Farewell.", action: 'CLOSE' }
                                 ]
                               },
                               'history': {
                                 id: 'history',
                                 text: "Centuries ago, the Shards were stable. Now, the Upside Down pulls at our reality. We need someone to anchor the dimensions.",
                                 options: [
                                   { label: "How can I help?", nextNodeId: 'quest_check' },
                                   { label: "Thank you for the information.", nextNodeId: 'start' }
                                 ]
                               },
                               'quest_check': {
                                 id: 'quest_check',
                                 text: "The Rift near our village has grown hostile. If you can cull the spirits there, I will reward you from our treasury.",
                                 options: [
                                   { label: "I will do it.", questTriggerId: 'rift_cull_1', nextNodeId: 'quest_accepted' },
                                   { label: "Maybe later.", nextNodeId: 'start' }
                                 ]
                               },
                               'quest_accepted': {
                                 id: 'quest_accepted',
                                 text: "May the light guide you. Return when the task is done.",
                                 options: [
                                   { label: "I will return.", action: 'CLOSE' }
                                 ]
                               }
                             }
                         }];
                    } else if (rng.next() > 0.9) {
                         const rand = rng.next();
                         poiType = rand > 0.5 ? 'SHOP' : 'INN';
                         terrain = TerrainType.DIRT_ROAD;
                    }

                    cells.push({
                        q, r, terrain,
                        weather: WeatherType.NONE,
                        isExplored: true, isVisible: true,
                        poiType, npcs,
                        regionName: "Settlement Interior"
                    });
                }
            }
        }
        return cells;
    }

    static generateDungeon(numStages: number): HexCell[] {
        const cells: HexCell[] = [];
        for (let i = 0; i <= numStages; i++) {
            cells.push({ q: 0, r: i, terrain: TerrainType.DUNGEON_FLOOR, weather: WeatherType.NONE, isExplored: true, isVisible: true, poiType: i === 0 ? 'EXIT' : 'RAID_ENCOUNTER', encounterId: i === 0 ? undefined : String(i - 1), regionName: "The Ancient Depths" });
        }
        return cells;
    }
}
