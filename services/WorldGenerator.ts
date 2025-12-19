
// @ts-nocheck
import { HexCell, TerrainType, WeatherType, Dimension, MovementType } from '../types';
import { useContentStore } from '../store/contentStore';

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

    private static generateSingleTile(q: number, r: number, dimension: Dimension): HexCell {
        const scale = 0.08;
        const elevation = fbm(q * scale, r * scale, 4);
        const moisture = fbm(q * scale + 200, r * scale + 200, 2);
        const temperature = fbm(q * scale - 200, r * scale - 200, 2);
        
        const biome = getBiome(elevation, moisture, temperature, dimension);
        const rng = new Mulberry32(fnv1a(`${q},${r},${dimension}`));
        
        let poiType: any = undefined;
        if (biome.terrain === TerrainType.MOUNTAIN && rng.next() > 0.99) poiType = 'DUNGEON';
        else if (biome.terrain === TerrainType.DESERT && rng.next() > 0.995) poiType = 'RUINS';
        else if (biome.terrain === TerrainType.GRASS && rng.next() > 0.997) poiType = 'TEMPLE';
        else if (biome.terrain === TerrainType.WATER && rng.next() > 0.99) poiType = 'PORT';
        else if (rng.next() > 0.999) poiType = 'ANCIENT_MONUMENT';

        const hasPortal = dimension === Dimension.NORMAL && (biome.terrain === TerrainType.ANCIENT_MONUMENT || (biome.terrain === TerrainType.MOUNTAIN && rng.next() > 0.98));

        return {
            q, r, 
            terrain: biome.terrain, 
            weather: biome.weather,
            isExplored: false, isVisible: false,
            hasPortal,
            hasEncounter: biome.terrain !== TerrainType.WATER && biome.terrain !== TerrainType.OCEAN && rng.next() > 0.94,
            regionName: this.getRegionName(q, r),
            poiType,
            movementType: (biome.terrain === TerrainType.WATER || biome.terrain === TerrainType.OCEAN) ? MovementType.SAIL : MovementType.WALK
        };
    }

    static getRegionName(q: number, r: number): string {
        const prefixes = ["Gilded", "Crimson", "Shattered", "Verdan", "Silent", "Iron", "Forgotten", "Clouded", "Burning", "Ancient"];
        const suffixes = ["Reach", "Barony", "Wilds", "March", "Valley", "Coast", "Plateau", "Delta", "Peaks", "Plains"];
        const n1 = noise2D(q * 0.005, r * 0.005);
        const n2 = noise2D(q * 0.005 + 500, r * 0.005 + 500);
        return `${prefixes[Math.floor(Math.abs(n1 * prefixes.length)) % prefixes.length]} ${suffixes[Math.floor(Math.abs(n2 * suffixes.length)) % suffixes.length]}`;
    }

    static generateDungeon(numStages: number): HexCell[] {
        const cells: HexCell[] = [];
        for (let i = 0; i <= numStages; i++) {
            cells.push({ q: 0, r: i, terrain: TerrainType.DUNGEON_FLOOR, weather: WeatherType.NONE, isExplored: true, isVisible: true, poiType: i === 0 ? 'EXIT' : 'RAID_ENCOUNTER', encounterId: i === 0 ? undefined : String(i - 1), regionName: "The Ancient Depths" });
        }
        return cells;
    }
}
