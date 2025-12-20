
import { TerrainType, Item, EnemyDefinition } from '../types';
import { WESNOTH_BASE_URL, ASSETS, CLASS_CONFIG, RACE_ICONS, DAMAGE_ICONS } from '../constants';
import { useContentStore } from '../store/contentStore';

/**
 * ASSET MANAGER: Gestor centralizado de assets con precaching y manejo de errores.
 * Todas las imágenes se cargan desde el bucket de Supabase configurado.
 */
export const AssetManager = {
    private_cache: new Map<string, HTMLImageElement>(),
    
    // Imagen 1x1 transparente como fallback definitivo
    FALLBACK_URL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",

    /**
     * Resuelve una URL segura para un sprite, priorizando el bucket de Supabase.
     */
    getSafeSprite(url: string | undefined): string {
        if (!url || url === '') {
            // Fallback a un sprite conocido si no hay nada definido
            return `${WESNOTH_BASE_URL}/units/human-loyalists/lieutenant.png`;
        }
        
        // Si ya es una URL absoluta o data-uri, la respetamos
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        
        // Si es una ruta relativa, asumimos que está dentro de la carpeta 'wesnoth' del bucket
        let path = url;
        if (path.startsWith('/')) path = path.substring(1);
        return `${WESNOTH_BASE_URL}/${path}`;
    },

    /**
     * Retorna una imagen cargada desde la cache si existe.
     */
    getAsset(url: string): HTMLImageElement | undefined {
        return this.private_cache.get(this.getSafeSprite(url));
    },

    /**
     * Carga una sola imagen y la almacena en cache.
     * Implementa fallbacks y logging de advertencias ante errores.
     */
    async loadAsset(url: string): Promise<HTMLImageElement> {
        const safeUrl = this.getSafeSprite(url);
        if (this.private_cache.has(safeUrl)) return this.private_cache.get(safeUrl)!;

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = safeUrl;
            img.onload = () => {
                this.private_cache.set(safeUrl, img);
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`[AssetManager] Fallo al cargar: ${safeUrl}. Usando placeholder.`);
                const fallback = new Image();
                fallback.src = this.FALLBACK_URL;
                this.private_cache.set(safeUrl, fallback);
                resolve(fallback);
            };
        });
    },

    /**
     * Pre-carga una lista de URLs e informa el progreso (0-100).
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
     * Recopila todos los assets "core" (estáticos) y dinámicos (DB) para precarga.
     */
    getRequiredAssets(): string[] {
        const content = useContentStore.getState();
        
        const core = [
            ...Object.values(ASSETS.TERRAIN),
            ...Object.values(ASSETS.VFX),
            ...Object.values(ASSETS.UI),
            ...Object.values(RACE_ICONS),
            ...Object.values(CLASS_CONFIG).map((c: any) => c.icon),
            ...Object.values(DAMAGE_ICONS),
        ];

        const dynamicItems = Object.values(content.items).map(i => (i as Item).icon);
        const dynamicEnemies = Object.values(content.enemies).map(e => (e as EnemyDefinition).sprite);

        // Limpiar duplicados y nulos, y resolver URLs únicas
        const allUnique = Array.from(new Set([...core, ...dynamicItems, ...dynamicEnemies]))
            .filter(Boolean)
            .map(url => this.getSafeSprite(url as string));

        return allUnique;
    }
};
