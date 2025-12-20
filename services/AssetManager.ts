
// @ts-nocheck
import { Item, EnemyDefinition, NPCEntity } from '../types';
import { WESNOTH_BASE_URL, WESNOTH_CDN_URL, ASSETS, CLASS_CONFIG, RACE_ICONS, DAMAGE_ICONS, ITEMS } from '../constants';
import { useContentStore } from '../store/contentStore';

/**
 * ASSET MANAGER V2.5: Dual-source path resolution.
 * Automatically routes 'units/' folder requests to Wesnoth CDN via jsDelivr.
 * Routes everything else to Supabase Storage.
 */
export const AssetManager = {
    private_cache: new Map<string, HTMLImageElement>(),
    failed_urls: new Set<string>(),
    
    // 1x1 transparent PNG fallback
    EMPTY_PIXEL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",

    /**
     * Creates a fallback data URL for units when the actual sprite is missing.
     */
    generatePlaceholder(label: string = "??"): string {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (!ctx) return this.EMPTY_PIXEL;

        const gradient = ctx.createRadialGradient(32, 32, 5, 32, 32, 30);
        gradient.addColorStop(0, '#4f46e5');
        gradient.addColorStop(1, '#1e1b4b');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(32, 32, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label.substring(0, 2).toUpperCase(), 32, 32);

        return canvas.toDataURL();
    },

    /**
     * Resolves path based on folder prefix. 
     * Folders starting with 'units/' go to the official Wesnoth CDN.
     */
    getSafeSprite(path: string | undefined): string {
        if (!path) return this.generatePlaceholder("NA");
        
        // Return if already a data URL or absolute
        if (path.startsWith('data:') || path.startsWith('http')) return path;

        // Clean path of leading slashes
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        
        let fullUrl: string;
        
        // --- ROUTING LOGIC ---
        if (cleanPath.startsWith('units/')) {
            // Direct link to jsDelivr Wesnoth assets
            fullUrl = `${WESNOTH_CDN_URL}/${cleanPath}`;
        } else {
            // Standard Supabase path
            fullUrl = `${WESNOTH_BASE_URL}/${cleanPath}`;
        }

        if (this.failed_urls.has(fullUrl)) {
            if (path.includes('units/')) {
                const parts = path.split('/');
                return this.generatePlaceholder(parts[parts.length - 1]);
            }
            return this.generatePlaceholder();
        }

        return fullUrl;
    },

    getAsset(path: string): HTMLImageElement | undefined {
        const resolvedUrl = this.getSafeSprite(path);
        return this.private_cache.get(resolvedUrl);
    },

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
                console.warn(`[AssetManager] Load error: ${url}. Marking as failed.`);
                this.failed_urls.add(url);
                
                const placeholder = new Image();
                placeholder.src = this.generatePlaceholder();
                placeholder.onload = () => {
                    this.private_cache.set(url, placeholder);
                    resolve(placeholder);
                };
            };
        });
    },

    async prefetch(urls: string[], onProgress?: (progress: number) => void): Promise<void> {
        let loaded = 0;
        const total = urls.length;
        if (total === 0) { onProgress?.(100); return; }

        const tasks = urls.map(async (url) => {
            await this.loadAsset(url);
            loaded++;
            onProgress?.(Math.floor((loaded / total) * 100));
        });

        await Promise.all(tasks);
    },

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
