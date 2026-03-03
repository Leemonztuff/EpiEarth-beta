// @ts-nocheck

import { TerrainType } from '../types';
import { TERRAIN_CATEGORIES, TerrainCategory, HEX_DIRECTIONS } from '../constants';
import { wesnothAtlas, LoadedSprite } from './WesnothAtlas';

export interface HexTile {
    q: number;
    r: number;
    terrain: TerrainType;
    overlay?: string;
    hasPortal?: boolean;
    hasEncounter?: boolean;
}

export interface TerrainTransition {
    spriteName: string;
    layer: number;
}

const TERRAIN_TO_WESNOTH: Record<TerrainType, string> = {
    [TerrainType.GRASS]: 'grass',
    [TerrainType.PLAINS]: 'grass',
    [TerrainType.FOREST]: 'forest',
    [TerrainType.JUNGLE]: 'forest_tropical',
    [TerrainType.MOUNTAIN]: 'mountain',
    [TerrainType.WATER]: 'water',
    [TerrainType.OCEAN]: 'water',
    [TerrainType.CASTLE]: 'castle',
    [TerrainType.VILLAGE]: 'village',
    [TerrainType.DESERT]: 'desert',
    [TerrainType.SWAMP]: 'swamp',
    [TerrainType.ANCIENT_MONUMENT]: 'mountain',
    [TerrainType.TUNDRA]: 'frozen',
    [TerrainType.TAIGA]: 'forest',
    [TerrainType.COBBLESTONE]: 'flat',
    [TerrainType.DIRT_ROAD]: 'flat',
    [TerrainType.STONE_FLOOR]: 'flat',
    [TerrainType.CAVE_FLOOR]: 'chasm',
    [TerrainType.DUNGEON_FLOOR]: 'chasm',
    [TerrainType.FUNGUS]: 'cave',
    [TerrainType.LAVA]: 'chasm',
    [TerrainType.CHASM]: 'chasm',
    [TerrainType.VOID]: 'chasm',
    [TerrainType.SAVANNAH]: 'grass',
    [TerrainType.WASTELAND]: 'grass',
    [TerrainType.BADLANDS]: 'desert'
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
