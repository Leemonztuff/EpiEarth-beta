// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { WorldGenerator } from '../../services/WorldGenerator';
import { TerrainType, Dimension } from '../../types';

beforeAll(() => {
    WorldGenerator.init(12345);
});

describe('WorldGenerator', () => {
    it('returns consistent terrain for same coordinates', () => {
        const t1 = WorldGenerator.getTile(5, -3, Dimension.NORMAL);
        const t2 = WorldGenerator.getTile(5, -3, Dimension.NORMAL);
        expect(t1.terrain).toBe(t2.terrain);
        expect(t1.hasEncounter).toBe(t2.hasEncounter);
    });

    it('may produce a feature sprite for grass tiles', () => {
        // run a few random coords until we hit one with feature
        let found = false;
        for (let q = 0; q < 10 && !found; q++) {
            for (let r = 0; r < 10 && !found; r++) {
                const tile = WorldGenerator.getTile(q, r, Dimension.NORMAL);
                if (tile.feature && tile.featureSprite) {
                    expect(typeof tile.featureSprite).toBe('string');
                    found = true;
                }
            }
        }
        expect(found).toBe(true);
    });

    it('returns hasEncounter boolean which is deterministic', () => {
        const coords = [[0,0],[3,4],[10,-2],[7,7]];
        coords.forEach(([q,r]) => {
            const t = WorldGenerator.getTile(q, r, Dimension.NORMAL);
            const t2 = WorldGenerator.getTile(q, r, Dimension.NORMAL);
            expect(t.hasEncounter).toBe(t2.hasEncounter);
        });
    });
});