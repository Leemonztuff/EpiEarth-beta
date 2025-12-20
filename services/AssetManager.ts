
// @ts-nocheck
import { Item, EnemyDefinition, NPCEntity, TerrainType } from '../types';
import { WESNOTH_BASE_URL, WESNOTH_CDN_URL, ASSETS, CLASS_CONFIG, RACE_ICONS, DAMAGE_ICONS, ITEMS } from '../constants';
import { useContentStore } from '../store/contentStore';

/**
 * ASSET MANAGER V2.7: Reliable dual-source path resolution and image caching.
 * Garantiza que las rutas de Supabase se resuelvan sin errores de concatenación.
 */
export const AssetManager = {
    private_cache: new Map<string, HTMLImageElement>(),
    failed_urls: new Set<string>(),
    
    EMPTY_PIXEL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",

    /**
     * Resuelve rutas relativas a URLs completas de Supabase o jsDelivr.
     */
    getSafeSprite(path: string | undefined): string {
        if (!path) return this.EMPTY_PIXEL;
        if (path.startsWith('data:') || path.startsWith('http')) return path;

        // Limpiar path de slashes iniciales
        let cleanPath = path;
        while (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.substring(1);
        }
        
        // Lógica de enrutamiento
        if (cleanPath.startsWith('units/')) {
            return `${WESNOTH_CDN_URL}/${cleanPath}`;
        }
        
        // Resolución Supabase: Asegurar exactamente un slash entre base y path
        const baseUrl = WESNOTH_BASE_URL.endsWith('/') ? WESNOTH_BASE_URL.slice(0, -1) : WESNOTH_BASE_URL;
        return `${baseUrl}/${cleanPath}`;
    },

    /**
     * Recupera un HTMLImageElement de la caché.
     * Útil para renderizado en Canvas 2D.
     */
    getAsset(path: string | undefined): HTMLImageElement | undefined {
        if (!path) return undefined;
        const resolvedUrl = this.getSafeSprite(path);
        return this.private_cache.get(resolvedUrl);
    },

    /**
     * Carga un asset en la caché de forma asíncrona.
     */
    async loadAsset(path: string): Promise<HTMLImageElement> {
        const url = this.getSafeSprite(path);
        if (this.private_cache.has(url)) return this.private_cache.get(url)!;

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => {
                this.private_cache.set(url, img);
                resolve(img);
            };
            img.onerror = (err) => {
                console.warn(`[AssetManager] Error al cargar: ${url}`, err);
                this.failed_urls.add(url);
                // Retornamos null para que el llamador maneje el fallback
                resolve(null as any);
            };
        });
    },

    /**
     * Precarga una lista de assets.
     */
    async prefetch(urls: string[], onProgress?: (progress: number) => void): Promise<void> {
        let loaded = 0;
        const total = urls.length;
        if (total === 0) { onProgress?.(100); return; }

        const batchSize = 10;
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            await Promise.all(batch.map(async (url) => {
                await this.loadAsset(url);
                loaded++;
                onProgress?.(Math.floor((loaded / total) * 100));
            }));
        }
    },

    /**
     * Identifica todos los assets necesarios para el inicio del juego.
     */
    getRequiredAssets(): string[] {
        const content = useContentStore.getState();
        
        const core = [
            ...Object.values(ASSETS.TERRAIN),
            ...Object.values(ASSETS.VFX),
            ...Object.values(ASSETS.UI),
            ...Object.values(RACE_ICONS),
            ...Object.values(CLASS_CONFIG).map((c: any) => c.icon),
            ...Object.values(DAMAGE_ICONS)
        ];

        const dynamicItems = Object.values(content.items).map(i => i.icon);
        const dynamicEnemies = Object.values(content.enemies).map(e => e.sprite);
        const dynamicNpcs = Object.values(content.npcs).map(n => n.sprite);

        return Array.from(new Set([...core, ...dynamicItems, ...dynamicEnemies, ...dynamicNpcs]))
            .filter(Boolean) as string[];
    }
};
