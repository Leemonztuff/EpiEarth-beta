// @ts-nocheck

import { TerrainType } from '../types';
import { TERRAIN_CATEGORIES, TerrainCategory, HEX_DIRECTIONS } from '../constants';
import { wesnothAtlas, LoadedSprite } from './WesnothAtlas';

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

    setTerrain(q: number, r: number, terrain: TerrainType): void {
        this.terrainCache.set(`${q},${r}`, terrain);
    }

    getTerrain(q: number, r: number): TerrainType | undefined {
        return this.terrainCache.get(`${q},${r}`);
    }

    clear(): void {
        this.terrainCache.clear();
    }

    getTileSprites(q: number, r: number): TerrainTransition[] {
        const currentTerrain = this.getTerrain(q, r);
        if (!currentTerrain) return [];

        const transitions: TerrainTransition[] = [];

        const currentCategory = TERRAIN_CATEGORIES[currentTerrain] || 'grass';
        const currentWesnoth = TERRAIN_TO_WESNOTH[currentTerrain] || 'grass';

        const baseSprite = `flat/${currentWesnoth}`;
        if (wesnothAtlas.hasSprite(baseSprite)) {
            transitions.push({ spriteName: baseSprite, layer: 0 });
        } else {
            transitions.push({ spriteName: currentWesnoth, layer: 0 });
        }

        for (let i = 0; i < 6; i++) {
            const dir = HEX_DIRECTIONS[i];
            const nq = q + dir.q;
            const nr = r + dir.r;
            const neighborTerrain = this.getTerrain(nq, nr);
            
            if (!neighborTerrain) continue;

            const neighborCategory = TERRAIN_CATEGORIES[neighborTerrain] || 'grass';
            
            if (neighborCategory !== currentCategory) {
                const neighborWesnoth = TERRAIN_TO_WESNOTH[neighborTerrain] || 'grass';
                const dirName = getDirectionName(i);
                
                const concaveName = `flat/${currentWesnoth}-to-${neighborWesnoth}-concave-${dirName}`;
                const convexName = `flat/${currentWesnoth}-to-${neighborWesnoth}-convex-${dirName}`;
                
                if (wesnothAtlas.hasSprite(concaveName)) {
                    transitions.push({ spriteName: concaveName, layer: 1 });
                } else if (wesnothAtlas.hasSprite(convexName)) {
                    transitions.push({ spriteName: convexName, layer: 1 });
                }
            }
        }

        return transitions;
    }

    drawTile(ctx: CanvasRenderingContext2D, q: number, r: number, cx: number, cy: number, hexSize: number): void {
        const sprites = this.getTileSprites(q, r);
        
        if (sprites.length === 0) {
            return;
        }
        
        for (const sprite of sprites) {
            const loaded = wesnothAtlas.getSprite(sprite.spriteName);
            if (loaded) {
                const scale = hexSize / 72 * 2;
                wesnothAtlas.drawSprite(ctx, sprite.spriteName, cx, cy, scale);
            }
        }
    }
}

export const hexTileRenderer = new HexTileRenderer();
