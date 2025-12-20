
// @ts-nocheck
import { HexCell, TerrainType, WeatherType, Dimension, MovementType, NPCEntity } from '../types';
import { useContentStore } from '../store/contentStore';

interface Cube { q: number; r: number; s: number; }
function axialToCube(q: number, r: number): Cube { return { q, r, s: -q - r }; }
function fnv1a(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) { hash ^= str.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
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

export class WorldGenerator {
    private static isInitialized = false;
    private static seed = 12345;
    private static chunkCache = new Map<string, Record<string, HexCell>>();
    
    // REDUCIDO: Ciudades cada 8 tiles para que el jugador las encuentre rápido.
    private static HUB_SPACING = 8; 

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
        const isHub = (q % this.HUB_SPACING === 0 && r % this.HUB_SPACING === 0);
        if (isHub) {
            const typeRoll = rng.next();
            if (typeRoll > 0.8) return 'CITY';
            if (typeRoll > 0.5) return 'TOWN';
            return 'VILLAGE';
        }
        const scale = 0.08;
        const elevation = noise2D(q * scale, r * scale);
        const chance = rng.next();
        
        // AUMENTADO: Probabilidad de Mazmorras y Templos
        if (elevation > 0.25 && chance > 0.94) return 'DUNGEON';
        if (elevation < -0.1 && chance > 0.95) return 'RUINS';
        if (chance > 0.98) return 'TEMPLE';
        return undefined;
    }

    private static generateSingleTile(q: number, r: number, dimension: Dimension): HexCell {
        const scale = 0.08;
        const elevation = noise2D(q * scale, r * scale);
        const moisture = noise2D(q * scale + 200, r * scale + 200);
        let terrain = TerrainType.GRASS;
        let weather = WeatherType.NONE;
        if (elevation < -0.4) terrain = TerrainType.WATER;
        else if (elevation > 0.5) terrain = TerrainType.MOUNTAIN;
        else if (moisture > 0.3) terrain = TerrainType.FOREST;
        if (dimension === Dimension.UPSIDE_DOWN) {
            if (terrain === TerrainType.GRASS) terrain = TerrainType.WASTELAND;
            if (terrain === TerrainType.FOREST) terrain = TerrainType.FUNGUS;
            if (terrain === TerrainType.WATER) terrain = TerrainType.CHASM;
        }
        const poiType = this.getPOITypeAt(q, r, dimension);
        const rng = new Mulberry32(fnv1a(`${q},${r},${dimension}`));
        
        // AUMENTADO: 10% de probabilidad de Portales
        const hasPortal = rng.next() > 0.90; 

        return {
            q, r, terrain, weather, isExplored: false, isVisible: false, hasPortal,
            hasEncounter: !poiType && rng.next() > 0.92,
            regionName: this.getRegionName(q, r, poiType),
            poiType
        };
    }

    static getRegionName(q: number, r: number, poi?: string): string {
        const prefixes = ["Gilded", "Crimson", "Shattered", "Verdan", "Silent", "Iron", "Forgotten", "Clouded", "Burning", "Ancient"];
        const cityNames = ["Aethelgard", "Oakhaven", "Stonehall", "Emberfall", "Cloudspire", "Ironforge", "Ravenport", "Lumina"];
        const idx = Math.abs(fnv1a(`${q},${r}`)) % prefixes.length;
        if (poi === 'CITY') return cityNames[idx % cityNames.length];
        return `${prefixes[idx]} ${poi || 'Wilds'}`;
    }

    static generateSettlementMap(parentQ: number, parentR: number, type: string): HexCell[] {
        const size = type === 'CITY' ? 6 : 3;
        const cells: HexCell[] = [];
        const rng = new Mulberry32(fnv1a(`town_${parentQ}_${parentR}`));
        const regionName = this.getRegionName(parentQ, parentR, type);

        for (let q = -size; q <= size; q++) {
            for (let r = -size; r <= size; r++) {
                if (Math.abs(q) + Math.abs(r) + Math.abs(-q - r) <= size * 2) {
                    const dist = (Math.abs(q) + Math.abs(r) + Math.abs(-q-r)) / 2;
                    let terrain = TerrainType.COBBLESTONE;
                    let poiType: any = undefined;
                    let npcs: NPCEntity[] | undefined = undefined;
                    
                    if (dist > size - 0.5) { terrain = TerrainType.GRASS; poiType = 'EXIT'; }
                    else if (dist < 1) {
                         poiType = 'PLAZA';
                         npcs = [{
                             id: `elder_${parentQ}_${parentR}`,
                             name: "High Elder", role: "Guardian", sprite: "units/human-magi/white-mage.png", dialogue: [], startNodeId: 'start',
                             dialogueNodes: { 'start': { id: 'start', text: "Aethelgard remembers its heroes. How can I serve?", options: [{ label: "Tell me of the Shards.", nextNodeId: 'shards' }, { label: "Farewell.", action: 'CLOSE' }] }, 'shards': { id: 'shards', text: "The shards are the bones of reality. Without them, the Vacío will swallow us all.", options: [{ label: "I understand.", nextNodeId: 'start' }] } }
                         }];
                    } else if (rng.next() > 0.7) {
                        const roll = rng.next();
                        if (roll > 0.6) { poiType = 'SHOP'; terrain = TerrainType.DIRT_ROAD; }
                        else if (roll > 0.2) { poiType = 'INN'; terrain = TerrainType.DIRT_ROAD; }
                        else { poiType = 'TEMPLE'; terrain = TerrainType.COBBLESTONE; }
                    }
                    cells.push({ q, r, terrain, weather: WeatherType.NONE, isExplored: true, isVisible: true, poiType, npcs, regionName });
                }
            }
        }
        return cells;
    }

    static generateDungeon(numStages: number): HexCell[] {
        const cells: HexCell[] = [];
        const rng = new Mulberry32(Date.now());
        
        cells.push({ q: 0, r: 0, terrain: TerrainType.DUNGEON_FLOOR, weather: WeatherType.NONE, isExplored: true, isVisible: true, poiType: 'EXIT', regionName: "Dark Vault" });

        let currentQ = 0;
        let currentR = 0;

        for (let i = 1; i <= numStages; i++) {
            const dir = Math.floor(rng.next() * 3);
            if (dir === 0) currentQ++; else if (dir === 1) currentR++; else { currentQ++; currentR--; }
            
            cells.push({ 
                q: currentQ, r: currentR, terrain: TerrainType.DUNGEON_FLOOR, weather: WeatherType.NONE, isExplored: true, isVisible: true, 
                poiType: i === numStages ? 'MONUMENT' : (rng.next() > 0.4 ? 'RAID_ENCOUNTER' : undefined),
                regionName: "Dark Vault"
            });

            if (rng.next() > 0.5) {
                cells.push({ q: currentQ, r: currentR + 1, terrain: TerrainType.DUNGEON_FLOOR, weather: WeatherType.NONE, isExplored: true, isVisible: true, poiType: rng.next() > 0.6 ? 'SHOP' : 'RAID_ENCOUNTER' });
            }
        }
        return cells;
    }

    static generateBattleArena(biome: TerrainType, isVoid: boolean): any[] {
        const cells = [];
        const rng = new Mulberry32(Date.now());
        const size = 16;

        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                const elevation = noise2D(x * 0.2, z * 0.2);
                let height = 1 + Math.max(0, elevation * 4);
                let terrain = biome;
                
                let isObstacle = false;
                if (rng.next() > 0.90) {
                    height += 2;
                    isObstacle = true;
                }

                if (isVoid && rng.next() > 0.85) {
                    height = 0.2;
                    terrain = TerrainType.CHASM;
                    isObstacle = true;
                }

                cells.push({
                    x, z, height, offsetY: 0,
                    terrain,
                    color: isVoid ? '#2d1b4e' : undefined,
                    isObstacle, blocksSight: isObstacle,
                    movementCost: height > 2 ? 2 : 1,
                    textureUrl: ASSETS.TERRAIN[terrain]
                });
            }
        }
        return cells;
    }
}
