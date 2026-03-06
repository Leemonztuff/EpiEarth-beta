// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import { hexTileRenderer } from './HexTileRenderer';
import { wesnothAtlas } from './WesnothAtlas';
import { TerrainType } from '../types';

beforeAll(async () => {
    await wesnothAtlas.load();
});

describe('HexTileRenderer', () => {
    it('should return at least one sprite for each terrain type', () => {
        const terrains = Object.values(TerrainType).filter(v => typeof v === 'number') as number[];
        terrains.forEach(t => {
            hexTileRenderer.clear();
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
    });
});
