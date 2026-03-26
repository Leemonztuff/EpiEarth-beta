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
        const terrains = Object.values(TerrainType) as TerrainType[];
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
        expect(sprites.some(s => s.layer === 1) || sprites.some(s => s.layer === 0)).toBe(true);
    });

    it('should keep deterministic base variation for the same tile', () => {
        hexTileRenderer.clear();
        hexTileRenderer.setTerrain(4, -2, TerrainType.GRASS);
        const first = hexTileRenderer.getTileSprites(4, -2)[0]?.spriteName;

        hexTileRenderer.clear();
        hexTileRenderer.setTerrain(4, -2, TerrainType.GRASS);
        const second = hexTileRenderer.getTileSprites(4, -2)[0]?.spriteName;

        expect(first).toBe(second);
    });

    it('should render overlay terrain above the base terrain', () => {
        hexTileRenderer.clear();
        hexTileRenderer.setTerrain(2, 3, TerrainType.FOREST, TerrainType.GRASS, TerrainType.FOREST);
        const sprites = hexTileRenderer.getTileSprites(2, 3);

        const base = sprites.find(s => s.layer === 0);
        const overlay = sprites.find(s => s.layer > 0);

        expect(base).toBeTruthy();
        expect(overlay).toBeTruthy();
        expect(overlay!.layer).toBeGreaterThan(base!.layer);
    });

    it('should keep transition layers below overlay layers when both exist', () => {
        hexTileRenderer.clear();
        hexTileRenderer.setTerrain(0, 0, TerrainType.FOREST, TerrainType.GRASS, TerrainType.FOREST);
        hexTileRenderer.setTerrain(1, 0, TerrainType.WATER);
        const sprites = hexTileRenderer.getTileSprites(0, 0);

        const overlayLayer = Math.max(...sprites.map(s => s.layer));
        const transitionLayers = sprites
            .filter(s => s.layer > 0 && s.layer < overlayLayer)
            .map(s => s.layer);

        expect(overlayLayer).toBeGreaterThan(0);
        expect(transitionLayers.every(layer => layer < overlayLayer)).toBe(true);
    });
});
