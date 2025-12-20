
// @ts-nocheck
import { TerrainType, Item, EnemyDefinition, NPCEntity } from '../types';
import { WESNOTH_BASE_URL, ASSETS, CLASS_CONFIG, RACE_ICONS, DAMAGE_ICONS, ITEMS } from '../constants';
import { useContentStore } from '../store/contentStore';

/**
 * ASSET MANAGER: Centralized hub for image resolution, pre-caching, and retrieval.
 * All logic flows through here to ensure Supabase bucket paths are correctly mapped.
 */
export const AssetManager = {
    private_cache: new Map<string, HTMLImageElement>(),
    
    // 1x1 transparent PNG fallback to prevent broken image UI
    FALLBACK_URL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",

    /**
     * Resolves a path to an absolute Supabase Storage URL.
     * Handles absolute URLs, data URIs, and relative paths within the bucket.
     */
    getSafeSprite(path: string | undefined): string {
        if (!path || path === '' || typeof path !== 'string') {
            // Un sprite por defecto en caso de error
            return `${WESNOTH_BASE_URL}/terrain/grass/green.png`;
        }
        
        // Return immediately if already absolute
        if (path.startsWith('http') || path.startsWith('data:')) return path;
        
        // Normalize path: remove leading slashes
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        
        // Concatenamos directamente con la base del bucket público
        return `${WESNOTH_BASE_URL}/${cleanPath}`;
    },

    /**
     * Retrieves a loaded image from memory. 
     * Components should use this to get HTMLImageElements for Canvas rendering.
     */
    getAsset(path: string): HTMLImageElement | undefined {
        const resolvedUrl = this.getSafeSprite(path);
        return this.private_cache.get(resolvedUrl);
    },

    /**
     * Async loader for a single asset.
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
            img.onerror = () => {
                console.warn(`[AssetManager] Load failure: ${url}. Using fallback.`);
                const fallback = new Image();
                fallback.src = this.FALLBACK_URL;
                this.private_cache.set(url, fallback);
                resolve(fallback);
            };
        });
    },

    /**
     * Batch loader with progress callback.
     */
    async prefetch(urls: string[], onProgress?: (progress: number) => void): Promise<void> {
        let loaded = 0;
        const total = urls.length;
        if (total === 0) {
            if (onProgress) onProgress(100);
            return;
        }

        const tasks = urls.map(async (url) => {
            await this.loadAsset(url);
            loaded++;
            if (onProgress) onProgress(Math.floor((loaded / total) * 100));
        });

        await Promise.all(tasks);
    },

    /**
     * Automatically discovers all critical assets defined in code and DB.
     */
    getRequiredAssets(): string[] {
        const content = useContentStore.getState();
        
        // Static assets from constants
        const core = [
            ...Object.values(ASSETS.TERRAIN),
            ...Object.values(ASSETS.VFX),
            ...Object.values(ASSETS.UI),
            ...Object.values(RACE_ICONS),
            ...Object.values(CLASS_CONFIG).map((c: any) => c.icon),
            ...Object.values(DAMAGE_ICONS),
            ...Object.values(ITEMS).map(i => i.icon)
        ];

        // Dynamic assets from Database
        const dynamicItems = Object.values(content.items).map(i => (i as Item).icon);
        const dynamicEnemies = Object.values(content.enemies).map(e => (e as EnemyDefinition).sprite);
        // Fix: Explicitly cast n to NPCEntity to resolve property 'sprite' access from 'unknown'
        const dynamicNpcs = Object.values(content.npcs).map(n => (n as NPCEntity).sprite);

        // Deduplicate and resolve
        const allUnique = Array.from(new Set([
            ...core, 
            ...dynamicItems, 
            ...dynamicEnemies,
            ...dynamicNpcs
        ]))
        .filter(Boolean)
        .map(p => this.getSafeSprite(p as string));

        return allUnique;
    }
};
