import { TerrainType } from '../types';
import { HEX_DIRECTIONS, TerrainCategory } from '../constants';
import { wesnothAtlas } from './WesnothAtlas';
import { getTerrainVisualDefinition, getTerrainVisualSelection } from './TerrainRegistry';

export interface ResolvedTerrainSprite {
    spriteName: string;
    layer: number;
}

const DIRECTION_NAMES = ['ne', 'se', 's', 'sw', 'nw', 'n'];

function getDirectionName(index: number): string {
    return DIRECTION_NAMES[index];
}

function getFirstAvailableSprite(candidates: string[]): string | null {
    for (const candidate of candidates) {
        if (wesnothAtlas.hasSprite(candidate)) {
            return candidate;
        }
    }
    return null;
}

function hashCoords(q: number, r: number, salt: number = 0): number {
    let h = (q * 374761393) ^ (r * 668265263) ^ salt;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
}

function pickDeterministicSprite(candidates: string[], q: number, r: number, salt: number = 0): string | null {
    const available = candidates.filter(candidate => wesnothAtlas.hasSprite(candidate));
    if (available.length === 0) {
        return null;
    }

    return available[hashCoords(q, r, salt) % available.length];
}

function getTransitionCandidates(
    currentTerrain: TerrainType,
    currentCategory: TerrainCategory,
    neighborTerrain: TerrainType,
    neighborCategory: TerrainCategory,
    dirName: string
): string[] {
    if (currentCategory === 'water' && neighborCategory !== 'water') {
        return [
            `water/coast-tropical-A01-${dirName}`,
            `water/coast-tropical-A02-${dirName}`,
            `water/coast-tropical-A03-${dirName}`,
            `water/coast-tropical-A04-${dirName}`,
        ];
    }

    const dryTerrains = new Set<TerrainType>([
        TerrainType.DESERT,
        TerrainType.SAVANNAH,
        TerrainType.WASTELAND,
        TerrainType.BADLANDS,
    ]);

    if (currentTerrain === TerrainType.GRASS && (neighborTerrain === TerrainType.PLAINS || dryTerrains.has(neighborTerrain))) {
        return [
            `grass/green-medium-${dirName}`,
            `grass/green-long-${dirName}`,
            `grass/green-abrupt-${dirName}`,
        ];
    }

    if (currentTerrain === TerrainType.PLAINS && (neighborTerrain === TerrainType.GRASS || dryTerrains.has(neighborTerrain))) {
        return [
            `grass/semi-dry-medium-${dirName}`,
            `grass/semi-dry-long-${dirName}`,
            `grass/semi-dry-abrupt-${dirName}`,
        ];
    }

    if (dryTerrains.has(currentTerrain) && (neighborTerrain === TerrainType.GRASS || neighborTerrain === TerrainType.PLAINS)) {
        return [
            `grass/dry-medium-${dirName}`,
            `grass/dry-long-${dirName}`,
            `grass/dry-abrupt-${dirName}`,
        ];
    }

    const baseTag = `${currentCategory}-to-${neighborCategory}`;
    return [
        `flat/${baseTag}-concave-${dirName}`,
        `flat/${baseTag}-convex-${dirName}`,
        `flat/${currentCategory}-${neighborCategory}-${dirName}`,
    ];
}

function isFeatureCoveredByOverlay(feature: string | undefined, overlayTerrain?: TerrainType | null): boolean {
    if (!feature || !overlayTerrain) {
        return false;
    }

    if (overlayTerrain === TerrainType.FOREST && feature === 'forest') {
        return true;
    }

    if (overlayTerrain === TerrainType.VILLAGE && (feature === 'city' || feature === 'village')) {
        return true;
    }

    if (overlayTerrain === TerrainType.RUINS && feature === 'ruins') {
        return true;
    }

    return false;
}

export function resolveTerrainSprites(params: {
    q: number;
    r: number;
    terrain: TerrainType;
    baseTerrain?: TerrainType;
    overlayTerrain?: TerrainType | null;
    feature?: string;
    getTerrain: (q: number, r: number) => { terrain: TerrainType; baseTerrain?: TerrainType; overlayTerrain?: TerrainType | null } | undefined;
}): ResolvedTerrainSprite[] {
    const { q, r, terrain, baseTerrain, overlayTerrain, feature, getTerrain } = params;
    const effectiveBaseTerrain = baseTerrain ?? terrain;
    const resolvedFeature = isFeatureCoveredByOverlay(feature, overlayTerrain) ? undefined : feature;
    const { category, baseCandidates, featureCandidates } = getTerrainVisualSelection(effectiveBaseTerrain, resolvedFeature);
    const sprites: ResolvedTerrainSprite[] = [];

    const baseSpriteName =
        pickDeterministicSprite(baseCandidates, q, r) ||
        getFirstAvailableSprite([category, 'grass/green']) ||
        'grass/green';
    sprites.push({ spriteName: baseSpriteName, layer: 0 });

    for (let i = 0; i < 6; i++) {
        const dir = HEX_DIRECTIONS[i];
        const neighborState = getTerrain(q + dir.q, r + dir.r);
        if (!neighborState) continue;

        const currentDef = getTerrainVisualDefinition(effectiveBaseTerrain);
        const neighborTerrain = neighborState.baseTerrain ?? neighborState.terrain;
        const neighborDef = getTerrainVisualDefinition(neighborTerrain);
        const neighborCategory: TerrainCategory = getTerrainVisualSelection(neighborTerrain).category;
        if (!currentDef || !neighborDef || neighborCategory === category) continue;

        const shouldDrawTransition =
            neighborDef.zIndex > currentDef.zIndex ||
            (neighborDef.zIndex === currentDef.zIndex && neighborTerrain > effectiveBaseTerrain);
        if (!shouldDrawTransition) continue;

        const dirName = getDirectionName(i);
        const candidates = getTransitionCandidates(
            effectiveBaseTerrain,
            category,
            neighborTerrain,
            neighborCategory,
            dirName
        );

        candidates.forEach(candidate => {
            if (wesnothAtlas.hasSprite(candidate)) {
                sprites.push({ spriteName: candidate, layer: 1 });
            }
        });
    }

    if (overlayTerrain) {
        const { baseCandidates: overlayCandidates } = getTerrainVisualSelection(overlayTerrain);
        const overlaySpriteName = pickDeterministicSprite(overlayCandidates, q, r, 41);
        if (overlaySpriteName) {
            const overlayDef = getTerrainVisualDefinition(overlayTerrain);
            sprites.push({ spriteName: overlaySpriteName, layer: overlayDef?.zIndex ?? 5 });
        }
    }

    if (featureCandidates.length > 0) {
        const featureSpriteName = pickDeterministicSprite(featureCandidates, q, r, 97);
        if (featureSpriteName) {
            sprites.push({ spriteName: featureSpriteName, layer: 10 });
        }
    }

    return sprites;
}
