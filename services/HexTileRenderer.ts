
import { TerrainType } from '../types';
import { TERRAIN_CATEGORIES, TerrainCategory, HEX_DIRECTIONS, TERRAIN_COLORS } from '../constants';
import { wesnothAtlas } from './WesnothAtlas';
import { TerrainResourceManager, terrainResourceManager } from './TerrainResourceManager';

interface TerrainTransition {
    spriteName: string;
    layer: number;
}

const TERRAIN_TO_WESNOTH: Record<TerrainType, string> = {
    [TerrainType.GRASS]: 'grass/green',
    [TerrainType.PLAINS]: 'grass/semi-dry',
    [TerrainType.FOREST]: 'forest/deciduous-summer',
    [TerrainType.JUNGLE]: 'forest/tropical/jungle',
    [TerrainType.MOUNTAIN]: 'mountain/regular',
    [TerrainType.WATER]: 'water/coast-tropical',
    [TerrainType.OCEAN]: 'water/ocean',
    [TerrainType.CASTLE]: 'castle/castle-tile',
    [TerrainType.VILLAGE]: 'village/human-cottage',
    [TerrainType.DESERT]: 'desert/desert',
    [TerrainType.SWAMP]: 'swamp/water',
    [TerrainType.ANCIENT_MONUMENT]: 'mountain/regular',
    [TerrainType.TUNDRA]: 'frozen/snow',
    [TerrainType.TAIGA]: 'forest/pine',
    [TerrainType.COBBLESTONE]: 'flat/stone',
    [TerrainType.DIRT_ROAD]: 'flat/dirt',
    [TerrainType.STONE_FLOOR]: 'flat/stone',
    [TerrainType.CAVE_FLOOR]: 'chasm/regular',
    [TerrainType.DUNGEON_FLOOR]: 'chasm/regular',
    [TerrainType.FUNGUS]: 'forest/mushrooms',
    [TerrainType.LAVA]: 'chasm/lava',
    [TerrainType.CHASM]: 'chasm/regular',
    [TerrainType.VOID]: 'chasm/abyss',
    [TerrainType.SAVANNAH]: 'grass/dry',
    [TerrainType.WASTELAND]: 'grass/dry',
    [TerrainType.BADLANDS]: 'desert/desert',
    [TerrainType.RUINS]: 'castle/ruin'
};

const DIRECTION_NAMES = ['ne', 'se', 's', 'sw', 'nw', 'n'];

function getDirectionName(index: number): string {
    return DIRECTION_NAMES[index];
}

export class HexTileRenderer {
    private terrainCache: Map<string, TerrainType> = new Map();
    private spriteCache: Map<string, TerrainTransition[]> = new Map();
    private resourceManager: TerrainResourceManager;

    constructor(resourceManager?: TerrainResourceManager) {
        this.resourceManager = resourceManager || terrainResourceManager;
    }

    setTerrain(q: number, r: number, terrain: TerrainType): void {
        this.terrainCache.set(`${q},${r}`, terrain);
    }

    getTerrain(q: number, r: number): TerrainType | undefined {
        return this.terrainCache.get(`${q},${r}`);
    }

    clear(): void {
        this.terrainCache.clear();
        this.spriteCache.clear();
    }

    getResourceManager(): TerrainResourceManager {
        return this.resourceManager;
    }

    getLoadingProgress(): { isLoading: boolean; progress: number; errors: number } {
        const state = this.resourceManager.getLoadingState();
        return {
            isLoading: state.isLoading,
            progress: state.totalCount > 0 ? state.loadedCount / state.totalCount : 0,
            errors: state.errors.size
        };
    }

    preloadTilesForViewport(
        centerQ: number, centerR: number,
        viewportWidth: number, viewportHeight: number,
        hexSize: number,
        terrainProvider: (q: number, r: number) => { terrain: TerrainType, feature?: string } | null
    ): void {
        this.resourceManager.preloadViewport(
            centerQ, centerR, viewportWidth, viewportHeight, hexSize, terrainProvider
        );
    }

    getTileSprites(q: number, r: number, feature?: string): TerrainTransition[] {
        const cacheKey = `${q},${r}-${feature || ''}`;
        if (this.spriteCache.has(cacheKey)) {
            return this.spriteCache.get(cacheKey)!;
        }

        const currentTerrain = this.getTerrain(q, r);
        if (!currentTerrain) return [];

        const transitions: TerrainTransition[] = [];
        const currentCategory: TerrainCategory = TERRAIN_CATEGORIES[currentTerrain] || 'grass';
        const currentWesnoth = TERRAIN_TO_WESNOTH[currentTerrain] || String(currentTerrain).toLowerCase();

        // 1. Add base terrain sprite with robust fallbacks
        let baseSpriteName = currentWesnoth;
        if (!wesnothAtlas.hasSprite(baseSpriteName)) {
            baseSpriteName = currentCategory;
            if (!wesnothAtlas.hasSprite(baseSpriteName)) {
                baseSpriteName = 'grass/green'; // Default fallback
            }
        }
        transitions.push({ spriteName: baseSpriteName, layer: 0 });

        // 2. Add transition sprites
        for (let i = 0; i < 6; i++) {
            const dir = HEX_DIRECTIONS[i];
            const nq = q + dir.q;
            const nr = r + dir.r;
            const neighborTerrain = this.getTerrain(nq, nr);
            if (!neighborTerrain) continue;

            const neighborCategory: TerrainCategory = TERRAIN_CATEGORIES[neighborTerrain] || 'grass';
            if (neighborCategory === currentCategory) continue;

            const dirName = getDirectionName(i);

            const baseTag = `${currentCategory}-to-${neighborCategory}`;
            const concaveName = `flat/${baseTag}-concave-${dirName}`;
            const convexName = `flat/${baseTag}-convex-${dirName}`;

            if (wesnothAtlas.hasSprite(concaveName)) {
                transitions.push({ spriteName: concaveName, layer: 1 });
            }
            if (wesnothAtlas.hasSprite(convexName)) {
                transitions.push({ spriteName: convexName, layer: 1 });
            }

            const simpleTransition = `flat/${currentCategory}-${neighborCategory}-${dirName}`;
            if (wesnothAtlas.hasSprite(simpleTransition)) {
                transitions.push({ spriteName: simpleTransition, layer: 1 });
            }
        }

        // 3. Add features (trees, villages)
        if (feature) {
            const featureMap: Record<string, string> = {
                'tree': 'scenery/tree-varied',
                'forest': 'terrain/forest/deciduous-summer-tile',
                'village': 'terrain/village/human-cottage',
                'city': 'terrain/village/human-city-tile',
                'ruins': 'terrain/castle/ruin-tile'
            };
            const mappedFeature = featureMap[feature] || feature;
            if (wesnothAtlas.hasSprite(mappedFeature)) {
                transitions.push({ spriteName: mappedFeature, layer: 10 });
            }
        }

        this.spriteCache.set(cacheKey, transitions);
        return transitions;
    }

    private lastWarningTime: number = 0;
    private readonly WARN_INTERVAL_MS = 5000;

    drawTile(ctx: CanvasRenderingContext2D, q: number, r: number, cx: number, cy: number, hexSize: number, feature?: string): void {
        const sprites = this.getTileSprites(q, r, feature);
        
        if (sprites.length === 0) {
            this.drawFallbackHex(ctx, cx, cy, hexSize, this.getTerrain(q, r));
            return;
        }

        if (!wesnothAtlas.isReady()) {
            this.drawFallbackHex(ctx, cx, cy, hexSize, this.getTerrain(q, r));
            return;
        }
        
        sprites.sort((a, b) => a.layer - b.layer);

        for (const sprite of sprites) {
            const loaded = wesnothAtlas.getSprite(sprite.spriteName);
            if (loaded) {
                const scale = hexSize / 36;
                wesnothAtlas.drawSprite(ctx, sprite.spriteName, cx, cy, scale);
            } else {
                const now = Date.now();
                if (now - this.lastWarningTime > this.WARN_INTERVAL_MS) {
                    this.lastWarningTime = now;
                }
                this.drawFallbackHex(ctx, cx, cy, hexSize, this.getTerrain(q, r));
            }
        }
    }

    private drawFallbackHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, hexSize: number, terrain?: TerrainType): void {
        const color = terrain ? TERRAIN_COLORS[terrain] || '#888' : '#888';
        
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = cx + hexSize * Math.cos(angle);
            const y = cy + hexSize * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

export const hexTileRenderer = new HexTileRenderer();
