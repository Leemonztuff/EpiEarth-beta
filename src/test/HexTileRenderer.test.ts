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
        hexTileRenderer.clear();
    });

    it('returns a valid base sprite for each terrain type', () => {
        const terrains = Object.values(TerrainType).filter(v => typeof v === 'string') as string[];
        terrains.forEach(t => {
            // @ts-ignore
            hexTileRenderer.setTerrain(0, 0, t);
            const sprites = hexTileRenderer.getTileSprites(0, 0);
            expect(sprites.length).toBeGreaterThan(0);

            const baseSprite = sprites.find(s => s.layer === 0);
            expect(baseSprite).toBeTruthy();
            expect(wesnothAtlas.hasSprite(baseSprite.spriteName)).toBe(true);
        });
    });

    it('resolves known feature overlays to atlas sprites', () => {
        hexTileRenderer.setTerrain(0, 0, TerrainType.GRASS);

        const treeSprites = hexTileRenderer.getTileSprites(0, 0, 'tree');
        const treeOverlay = treeSprites.find(s => s.layer === 10);
        expect(treeOverlay).toBeTruthy();
        expect(wesnothAtlas.hasSprite(treeOverlay.spriteName)).toBe(true);

        const ruinSprites = hexTileRenderer.getTileSprites(0, 0, 'ruins');
        const ruinOverlay = ruinSprites.find(s => s.layer === 10);
        expect(ruinOverlay).toBeTruthy();
        expect(wesnothAtlas.hasSprite(ruinOverlay.spriteName)).toBe(true);
    });

    it('falls back to a base terrain sprite when a transition sprite is unavailable', () => {
        hexTileRenderer.setTerrain(0, 0, TerrainType.GRASS);
        hexTileRenderer.setTerrain(1, 0, TerrainType.WATER);

        const sprites = hexTileRenderer.getTileSprites(0, 0);
        const baseSprite = sprites.find(s => s.layer === 0);

        expect(baseSprite).toBeTruthy();
        expect(wesnothAtlas.hasSprite(baseSprite.spriteName)).toBe(true);
    });
});
