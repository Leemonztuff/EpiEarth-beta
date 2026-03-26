import { describe, expect, it } from 'vitest';
import { TerrainType } from '../../types';
import { compareTerrainPriority } from '../../services/TerrainRegistry';

describe('TerrainRegistry priority', () => {
    it('prioritizes higher z-index terrain on transitions', () => {
        const result = compareTerrainPriority(TerrainType.GRASS, TerrainType.FOREST);
        expect(result).toBeGreaterThan(0);
    });

    it('keeps deterministic ordering for equal z-index terrains', () => {
        const first = compareTerrainPriority(TerrainType.GRASS, TerrainType.PLAINS);
        const second = compareTerrainPriority(TerrainType.GRASS, TerrainType.PLAINS);
        expect(first).toBe(second);
    });
});
