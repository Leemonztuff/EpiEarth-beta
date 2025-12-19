
import { TerrainType, Entity, Dimension } from '../types';
import { WESNOTH_BASE_URL, ASSETS } from '../constants';

/**
 * ASSET MANAGER: Gestor inteligente de rutas de CDN para texturas y sprites.
 */
export const AssetManager = {
    getSafeSprite: (url: string | undefined, type: string = 'ENEMY'): string => {
        if (!url) {
            return `${WESNOTH_BASE_URL}/units/human-loyalists/lieutenant.png`;
        }
        if (url.startsWith('http')) return url;
        
        // Si es una ruta relativa de Wesnoth, la normalizamos
        let path = url;
        if (path.startsWith('/')) path = path.substring(1);
        return `${WESNOTH_BASE_URL}/${path}`;
    },

    getBiomeBlockTextures: (terrain: TerrainType): string[] => {
        const primary = ASSETS.TERRAIN[terrain];
        return primary ? [primary] : [];
    },

    getEntitySprites: (entities: Entity[]): string[] => {
        return entities.map(e => AssetManager.getSafeSprite(e.visual.spriteUrl, e.type));
    },

    getAllBattleAssets: (terrain: TerrainType, entities: Entity[]): string[] => {
        const terrainAssets = AssetManager.getBiomeBlockTextures(terrain);
        const entityAssets = AssetManager.getEntitySprites(entities);
        return Array.from(new Set([...terrainAssets, ...entityAssets]));
    }
};
