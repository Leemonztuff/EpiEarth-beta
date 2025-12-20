
// @ts-nocheck
import * as THREE from 'three';
import { Item, EnemyDefinition, NPCEntity, TerrainType } from '../types';
import { WESNOTH_BASE_URL, WESNOTH_CDN_URL, ASSETS, CLASS_CONFIG, RACE_ICONS, DAMAGE_ICONS, ITEMS } from '../constants';
import { useContentStore } from '../store/contentStore';

export const AssetManager = {
    private_cache: new Map<string, HTMLImageElement>(),
    texture_cache: new Map<string, THREE.Texture>(),
    failed_urls: new Set<string>(),
    
    EMPTY_PIXEL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",

    getSafeSprite(path: string | undefined): string {
        if (!path) return this.EMPTY_PIXEL;
        if (path.startsWith('data:') || path.startsWith('http')) return path;

        let cleanPath = path;
        while (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.substring(1);
        }
        
        const wesnothDirs = [
            'units/', 'terrain/', 'scenery/', 'attacks/', 
            'projectiles/', 'items/', 'halo/', 'weather/'
        ];

        const isWesnothCore = wesnothDirs.some(dir => cleanPath.startsWith(dir));

        if (isWesnothCore) {
            return `${WESNOTH_CDN_URL}/${cleanPath}`;
        }
        
        const baseUrl = WESNOTH_BASE_URL.endsWith('/') ? WESNOTH_BASE_URL.slice(0, -1) : WESNOTH_BASE_URL;
        return `${baseUrl}/${cleanPath}`;
    },

    getAsset(path: string | undefined): HTMLImageElement | undefined {
        if (!path) return undefined;
        const resolvedUrl = this.getSafeSprite(path);
        return this.private_cache.get(resolvedUrl);
    },

    getTexture(path: string | undefined): THREE.Texture {
        const url = this.getSafeSprite(path);
        if (this.texture_cache.has(url)) return this.texture_cache.get(url)!;

        const img = this.private_cache.get(url);
        if (img) {
            const tex = new THREE.Texture(img);
            tex.needsUpdate = true;
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = false; 
            this.texture_cache.set(url, tex);
            return tex;
        }

        const fallback = new THREE.DataTexture(new Uint8Array([100, 100, 100, 255]), 1, 1);
        fallback.needsUpdate = true;
        return fallback;
    },

    async loadAsset(path: string): Promise<HTMLImageElement> {
        const url = this.getSafeSprite(path);
        if (this.private_cache.has(url)) return this.private_cache.get(url)!;

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous"; 
            
            // TIMEOUT DE SEGURIDAD: 2 segundos por asset
            const timer = setTimeout(() => {
                console.warn(`[AssetManager] Timeout loading: ${url}`);
                resolve(null as any);
            }, 2000);

            img.src = url;
            img.onload = () => {
                clearTimeout(timer);
                this.private_cache.set(url, img);
                resolve(img);
            };
            img.onerror = (err) => {
                clearTimeout(timer);
                console.warn(`[AssetManager] Load Error: ${url}`);
                this.failed_urls.add(url);
                resolve(null as any);
            };
        });
    },

    async prefetch(urls: string[], onProgress?: (progress: number) => void): Promise<void> {
        let loaded = 0;
        const total = urls.length;
        if (total === 0) { onProgress?.(100); return; }

        const batchSize = 15;
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            await Promise.all(batch.map(async (url) => {
                await this.loadAsset(url);
                loaded++;
                onProgress?.(Math.floor((loaded / total) * 100));
            }));
        }
    },

    getRequiredAssets(): string[] {
        const content = useContentStore.getState();
        const core = [
            ...Object.values(ASSETS.TERRAIN),
            ...Object.values(ASSETS.STRUCTURES),
            ...Object.values(ASSETS.VFX),
            ...Object.values(ASSETS.UI),
            ...Object.values(RACE_ICONS),
            ...Object.values(CLASS_CONFIG).map((c: any) => c.icon),
            ...Object.values(DAMAGE_ICONS)
        ];
        const dynamicItems = Object.values(content.items || {}).map(i => i.icon);
        const dynamicEnemies = Object.values(content.enemies || {}).map(e => e.sprite);
        return Array.from(new Set([...core, ...dynamicItems, ...dynamicEnemies])).filter(Boolean) as string[];
    }
};
