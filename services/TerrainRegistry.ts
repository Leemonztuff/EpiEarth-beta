import { TerrainType } from '../types';
import { TERRAIN_CATEGORIES, TerrainCategory } from '../constants';

export interface TerrainVisualDefinition {
    category: TerrainCategory;
    baseSprites: string[];
    zIndex: number;
    isOverlay?: boolean;
    featureSprites?: Record<string, string[]>;
}

export interface TerrainVisualSelection {
    baseCandidates: string[];
    featureCandidates: string[];
    category: TerrainCategory;
}

const DEFAULT_FEATURE_SPRITES: Record<string, string[]> = {
    tree: ['forest/deciduous-summer-small', 'forest/pine-small', 'forest/pine-small2', 'forest/deciduous-summer'],
    forest: ['forest/deciduous-summer', 'forest/pine'],
    village: ['village/human-city', 'village/human-city2'],
    city: ['village/human-city', 'village/human-city3'],
    ruins: ['village/human-city-ruin', 'village/human-cottage-ruin'],
};

export const TERRAIN_VISUAL_REGISTRY: Record<TerrainType, TerrainVisualDefinition> = {
    [TerrainType.GRASS]: { category: TERRAIN_CATEGORIES[TerrainType.GRASS], baseSprites: ['grass/green', 'grass/green2', 'grass/green3', 'grass/green4'], zIndex: 1 },
    [TerrainType.PLAINS]: { category: TERRAIN_CATEGORIES[TerrainType.PLAINS], baseSprites: ['grass/semi-dry', 'grass/semi-dry2', 'grass/semi-dry3', 'grass/semi-dry4'], zIndex: 1 },
    [TerrainType.FOREST]: { category: TERRAIN_CATEGORIES[TerrainType.FOREST], baseSprites: ['forest/deciduous-summer'], zIndex: 3, isOverlay: true },
    [TerrainType.JUNGLE]: { category: TERRAIN_CATEGORIES[TerrainType.JUNGLE], baseSprites: ['forest/deciduous-summer', 'grass/green'], zIndex: 3, isOverlay: true },
    [TerrainType.MOUNTAIN]: { category: TERRAIN_CATEGORIES[TerrainType.MOUNTAIN], baseSprites: ['mountains/basic', 'mountains/basic2', 'mountains/basic3'], zIndex: 4 },
    [TerrainType.WATER]: { category: TERRAIN_CATEGORIES[TerrainType.WATER], baseSprites: ['water/coast-tropical-A01', 'water/coast-tropical'], zIndex: 0 },
    [TerrainType.OCEAN]: { category: TERRAIN_CATEGORIES[TerrainType.OCEAN], baseSprites: ['water/ocean-A01', 'water/ocean-A02', 'water/ocean-A03', 'water/ocean-A04'], zIndex: 0 },
    [TerrainType.CASTLE]: { category: TERRAIN_CATEGORIES[TerrainType.CASTLE], baseSprites: ['mountains/basic-castle-n', 'mountains/basic'], zIndex: 5, isOverlay: true },
    [TerrainType.VILLAGE]: { category: TERRAIN_CATEGORIES[TerrainType.VILLAGE], baseSprites: ['village/human-city', 'village/human-city2', 'grass/green'], zIndex: 4, isOverlay: true },
    [TerrainType.DESERT]: { category: TERRAIN_CATEGORIES[TerrainType.DESERT], baseSprites: ['desert/desert', 'grass/dry', 'grass/dry2', 'grass/dry3'], zIndex: 1 },
    [TerrainType.SWAMP]: { category: TERRAIN_CATEGORIES[TerrainType.SWAMP], baseSprites: ['swamp/water'], zIndex: 1 },
    [TerrainType.ANCIENT_MONUMENT]: { category: TERRAIN_CATEGORIES[TerrainType.ANCIENT_MONUMENT], baseSprites: ['mountains/basic'], zIndex: 5, isOverlay: true },
    [TerrainType.TUNDRA]: { category: TERRAIN_CATEGORIES[TerrainType.TUNDRA], baseSprites: ['frozen/snow'], zIndex: 1 },
    [TerrainType.TAIGA]: { category: TERRAIN_CATEGORIES[TerrainType.TAIGA], baseSprites: ['forest/pine'], zIndex: 3, isOverlay: true },
    [TerrainType.COBBLESTONE]: { category: TERRAIN_CATEGORIES[TerrainType.COBBLESTONE], baseSprites: ['flat/stone', 'grass/semi-dry'], zIndex: 2 },
    [TerrainType.DIRT_ROAD]: { category: TERRAIN_CATEGORIES[TerrainType.DIRT_ROAD], baseSprites: ['flat/dirt'], zIndex: 2 },
    [TerrainType.STONE_FLOOR]: { category: TERRAIN_CATEGORIES[TerrainType.STONE_FLOOR], baseSprites: ['flat/stone', 'grass/semi-dry'], zIndex: 2 },
    [TerrainType.CAVE_FLOOR]: { category: TERRAIN_CATEGORIES[TerrainType.CAVE_FLOOR], baseSprites: ['chasm/regular'], zIndex: 1 },
    [TerrainType.DUNGEON_FLOOR]: { category: TERRAIN_CATEGORIES[TerrainType.DUNGEON_FLOOR], baseSprites: ['chasm/regular'], zIndex: 1 },
    [TerrainType.FUNGUS]: { category: TERRAIN_CATEGORIES[TerrainType.FUNGUS], baseSprites: ['forest/mushrooms'], zIndex: 3, isOverlay: true },
    [TerrainType.LAVA]: { category: TERRAIN_CATEGORIES[TerrainType.LAVA], baseSprites: ['chasm/lava', 'chasm/abyss'], zIndex: 1 },
    [TerrainType.CHASM]: { category: TERRAIN_CATEGORIES[TerrainType.CHASM], baseSprites: ['chasm/regular'], zIndex: 0 },
    [TerrainType.VOID]: { category: TERRAIN_CATEGORIES[TerrainType.VOID], baseSprites: ['chasm/abyss'], zIndex: 0 },
    [TerrainType.SAVANNAH]: { category: TERRAIN_CATEGORIES[TerrainType.SAVANNAH], baseSprites: ['grass/dry'], zIndex: 1 },
    [TerrainType.WASTELAND]: { category: TERRAIN_CATEGORIES[TerrainType.WASTELAND], baseSprites: ['grass/dry'], zIndex: 1 },
    [TerrainType.BADLANDS]: { category: TERRAIN_CATEGORIES[TerrainType.BADLANDS], baseSprites: ['grass/dry', 'desert/desert'], zIndex: 1 },
    [TerrainType.RUINS]: { category: TERRAIN_CATEGORIES[TerrainType.RUINS], baseSprites: ['village/human-city-ruin', 'village/human-cottage-ruin', 'mountains/basic'], zIndex: 4, isOverlay: true },
};

export function getTerrainVisualSelection(terrain: TerrainType, feature?: string): TerrainVisualSelection {
    const definition = TERRAIN_VISUAL_REGISTRY[terrain];
    if (!definition) {
        return {
            category: 'grass',
            baseCandidates: ['grass/green'],
            featureCandidates: feature ? [feature] : [],
        };
    }

    const featureCandidates = feature
        ? definition.featureSprites?.[feature] || DEFAULT_FEATURE_SPRITES[feature] || [feature]
        : [];

    return {
        category: definition.category,
        baseCandidates: definition.baseSprites,
        featureCandidates,
    };
}

export function getTerrainVisualDefinition(terrain: TerrainType): TerrainVisualDefinition | null {
    return TERRAIN_VISUAL_REGISTRY[terrain] || null;
}
