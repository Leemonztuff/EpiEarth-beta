// @ts-nocheck

import { TerrainType } from '../types';
import { TERRAIN_CATEGORIES, TerrainCategory, HEX_DIRECTIONS } from '../constants';
import { wesnothAtlas, LoadedSprite } from './WesnothAtlas';

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
    [TerrainType.BADLANDS]: 'desert/desert'
};

const DIRECTION_NAMES = ['ne', 'se', 's', 'sw', 'nw', 'n'];

function getDirectionName(index: number): string {
    return DIRECTION_NAMES[index];
}

export class HexTileRenderer {
    private terrainCache: Map<string, TerrainType> = new Map();
    private spriteCache: Map<string, TerrainTransition[]> = new Map();

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

    getTileSprites(q: number, r: number, feature?: string): TerrainTransition[] {
        const cacheKey = `${q},${r}-${feature || ''}`;
        
        // Return cached sprites if available
        if (this.spriteCache.has(cacheKey)) {
            return this.spriteCache.get(cacheKey)!;
        }

        const currentTerrain = this.getTerrain(q, r);
        if (!currentTerrain) return [];

        const transitions: TerrainTransition[] = [];

        const currentCategory: TerrainCategory = TERRAIN_CATEGORIES[currentTerrain] || 'grass';
        const currentWesnoth = TERRAIN_TO_WESNOTH[currentTerrain] || String(currentTerrain).toLowerCase();

        // helper resolves a sprite name or logs a warning and optionally
        // searches by category/fallbackBase substring
        const resolveSprite = (name: string, fallbackBase?: string): string | null => {
            if (wesnothAtlas.hasSprite(name)) return name;
            const withoutFlat = name.replace(/^flat\//, '');
            if (wesnothAtlas.hasSprite(withoutFlat)) return withoutFlat;
            if (fallbackBase) {
                const candidates = wesnothAtlas.getSpritesByCategory(currentCategory);
                const found = candidates.find(s => s.includes(fallbackBase));
                if (found) return found;
                
                // second level fallback: just use the category base flat
                if (wesnothAtlas.hasSprite(`flat/${currentCategory}`)) return `flat/${currentCategory}`;
                if (wesnothAtlas.hasSprite(currentCategory)) return currentCategory;
            }
            // final fallback: basic grass
            return 'grass/green';
        };

        // base layer
        const baseName = `flat/${currentWesnoth}`;
        const resolvedBase = resolveSprite(baseName, currentWesnoth) || currentWesnoth;
        transitions.push({ spriteName: resolvedBase, layer: 0 });

        // transitions for differing neighbor categories
        for (let i = 0; i < 6; i++) {
            const dir = HEX_DIRECTIONS[i];
            const nq = q + dir.q;
            const nr = r + dir.r;
            const neighborTerrain = this.getTerrain(nq, nr);
            if (!neighborTerrain) continue;

            const neighborCategory: TerrainCategory = TERRAIN_CATEGORIES[neighborTerrain] || 'grass';
            if (neighborCategory === currentCategory) continue;

            const neighborWesnoth = TERRAIN_TO_WESNOTH[neighborTerrain] || String(neighborTerrain).toLowerCase();
            const dirName = getDirectionName(i);
            const baseTag = `${currentWesnoth}-to-${neighborWesnoth}`;

            const concaveName = `flat/${baseTag}-concave-${dirName}`;
            const convexName = `flat/${baseTag}-convex-${dirName}`;
            const sprite = resolveSprite(concaveName, baseTag) || resolveSprite(convexName, baseTag);
            if (sprite) {
                transitions.push({ spriteName: sprite, layer: 1 });
            }
        }

        // Feature layer (Overlays)
        if (feature) {
            // map features to wesnoth scenery or internal names
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

        // Cache the computed transitions
        this.spriteCache.set(cacheKey, transitions);
        return transitions;
    }

    drawTile(ctx: CanvasRenderingContext2D, q: number, r: number, cx: number, cy: number, hexSize: number, feature?: string): void {
        const sprites = this.getTileSprites(q, r, feature);
        
        if (sprites.length === 0) {
            return;
        }
        
        for (const sprite of sprites) {
            const loaded = wesnothAtlas.getSprite(sprite.spriteName);
            if (loaded) {
                const scale = hexSize / 72 * 2;
                wesnothAtlas.drawSprite(ctx, sprite.spriteName, cx, cy, scale);
            } else {
                console.warn(`[HexTileRenderer] drawTile unable to load sprite ${sprite.spriteName}`);
            }
        }
    }
}

export const hexTileRenderer = new HexTileRenderer();
