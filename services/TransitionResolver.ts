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
    const { category, baseCandidates, featureCandidates } = getTerrainVisualSelection(effectiveBaseTerrain, feature);
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
        const baseTag = `${category}-to-${neighborCategory}`;
        const candidates = [
            `flat/${baseTag}-concave-${dirName}`,
            `flat/${baseTag}-convex-${dirName}`,
            `flat/${category}-${neighborCategory}-${dirName}`,
        ];

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
