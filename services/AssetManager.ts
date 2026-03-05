
// @ts-nocheck
import * as THREE from 'three';
import { Item, EnemyDefinition, NPCEntity, TerrainType } from '../types';
import { WESNOTH_BASE_URL, WESNOTH_CDN_URL, ASSETS, CLASS_CONFIG, RACE_ICONS, DAMAGE_ICONS, ITEMS, BATTLE_TEXTURES } from '../constants';
import { useContentStore } from '../store/contentStore';

export const AssetManager = {
    private_cache: new Map<string, HTMLImageElement>(),
    texture_cache: new Map<string, THREE.Texture>(),
    failed_urls: new Set<string>(),
    
    // Pixels de seguridad para evitar crashes de GPU
    EMPTY_PIXEL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    // Sprite de emergencia garantizado (Lieutenant de Wesnoth)
    FALLBACK_SPRITE: "units/human-loyalists/lieutenant.png",
    FALLBACK_URL: `${WESNOTH_CDN_URL}/units/human-loyalists/lieutenant.png`,

    getSafeSprite(path: string | undefined): string {
        if (!path || typeof path !== 'string' || path === 'undefined') {
            return `${WESNOTH_CDN_URL}/${this.FALLBACK_SPRITE}`;
        }
        
        if (path.startsWith('data:') || path.startsWith('http')) return path;

        let cleanPath = path;
        while (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.substring(1);
        }
        
        // Handle local sprites in public/ folder
        if (cleanPath.startsWith('sprites/')) {
            return `/${cleanPath}`;
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

        // Si no está en caché y falló a cargar, usar un color sólido pero intenta colores variados
        // para que no todo sea gris
        const colorMap: Record<string, [number, number, number]> = {
            'grass': [100, 180, 100],
            'water': [50, 120, 200],
            'sand': [200, 180, 100],
            'stone': [150, 150, 150],
            'lava': [255, 100, 0],
            'snow': [255, 255, 255]
        };

        let color = [100, 100, 100]; // Default gray
        for (const [key, val] of Object.entries(colorMap)) {
            if (url.includes(key)) {
                color = val;
                break;
            }
        }

        const fallback = new THREE.DataTexture(new Uint8Array([...color, 255]), 1, 1);
        fallback.needsUpdate = true;
        return fallback;
    },

    async loadAsset(path: string): Promise<HTMLImageElement> {
        const url = this.getSafeSprite(path);
        if (this.private_cache.has(url)) return this.private_cache.get(url)!;

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous"; 
            
            const timer = setTimeout(() => {
                console.warn(`Asset timeout (5s): ${url}`);
                this.failed_urls.add(url);
                resolve(null as any);
            }, 5000);

            img.src = url;
            img.onload = () => {
                clearTimeout(timer);
                this.private_cache.set(url, img);
                resolve(img);
            };
            img.onerror = () => {
                clearTimeout(timer);
                console.warn(`Asset load failed: ${url}`);
                this.failed_urls.add(url);
                // Don't try to load fallback here, just resolve null
                resolve(null as any);
            };
        });
    },

    async prefetch(urls: string[], onProgress?: (progress: number) => void): Promise<void> {
        // Asegurar que el fallback siempre esté precargado
        const allUrls = Array.from(new Set([...urls, this.FALLBACK_SPRITE]));
        
        let loaded = 0;
        const total = allUrls.length;
        if (total === 0) { onProgress?.(100); return; }

        // Load fallback first to ensure we have something
        await this.loadAsset(this.FALLBACK_SPRITE);

        for (let i = 0; i < allUrls.length; i += 5) {
            const batch = allUrls.slice(i, i + 5);
            // Continue even if some fail
            await Promise.allSettled(batch.map(url => this.loadAsset(url)));
            loaded += batch.length;
            onProgress?.(Math.min(100, Math.floor((loaded / total) * 100)));
        }
    },

    getRequiredAssets(): string[] {
        try {
            const content = useContentStore.getState();
            const core = [
                ...Object.values(ASSETS.TERRAIN || {}),
                ...Object.values(ASSETS.STRUCTURES || {}),
                ...Object.values(ASSETS.UI || {}),
                ...Object.values(RACE_ICONS || {}),
                ...Object.values(CLASS_CONFIG || {}).map((c: any) => c?.icon).filter(Boolean),
                ...Object.values(BATTLE_TEXTURES || {}),
                this.FALLBACK_SPRITE
            ];
            
            // Safe access to content properties
            const items = (content && typeof content === 'object' && content.items) ? content.items : {};
            const enemies = (content && typeof content === 'object' && content.enemies) ? content.enemies : {};
            
            const dynamicItems = Array.isArray(items) ? [] : Object.values(items || {}).map((i: any) => i?.icon).filter(Boolean);
            const dynamicEnemies = Array.isArray(enemies) ? [] : Object.values(enemies || {}).map((e: any) => e?.sprite).filter(Boolean);
            
            return Array.from(new Set([...core, ...dynamicItems, ...dynamicEnemies])).filter(Boolean) as string[];
        } catch (error) {
            console.warn('AssetManager.getRequiredAssets() error:', error);
            // Return fallback set of core assets
            return [
                ...Object.values(ASSETS.TERRAIN || {}),
                ...Object.values(ASSETS.STRUCTURES || {}),
                ...Object.values(ASSETS.UI || {}),
                this.FALLBACK_SPRITE
            ].filter(Boolean) as string[];
        }
    }
};
