// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import { hexTileRenderer } from '../../services/HexTileRenderer';
import { wesnothAtlas } from '../../services/WesnothAtlas';
import { TerrainType } from '../../types';

beforeAll(async () => {
    await wesnothAtlas.load();
});

describe('HexTileRenderer', () => {
    beforeEach(() => {
        // silence warnings during tests except when explicitly checking
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'debug').mockImplementation(() => {});
    });

    it('should return at least one sprite for each terrain type', () => {
        const terrains = Object.values(TerrainType).filter(v => typeof v === 'string') as string[];
        terrains.forEach(t => {
            hexTileRenderer.clear();
            // @ts-ignore
            hexTileRenderer.setTerrain(0, 0, t);
            const sprites = hexTileRenderer.getTileSprites(0, 0);
            expect(sprites.length).toBeGreaterThan(0);
            sprites.forEach(s => {
                expect(wesnothAtlas.hasSprite(s.spriteName)).toBe(true);
            });
        });
    });

    it('should include transition sprites when neighbors differ', () => {
        hexTileRenderer.clear();
        hexTileRenderer.setTerrain(0, 0, TerrainType.GRASS);
        hexTileRenderer.setTerrain(1, 0, TerrainType.WATER);
        const sprites = hexTileRenderer.getTileSprites(0, 0);
        expect(sprites.some(s => s.layer === 1)).toBe(true);
        // ensure transition names contain expected keywords
        const tnames = sprites.map(s => s.spriteName);
        expect(tnames.some(n => /concave|convex/.test(n))).toBe(true);
    });
});
