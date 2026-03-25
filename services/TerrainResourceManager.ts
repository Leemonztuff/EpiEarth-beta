import { TerrainType } from '../types';
import { wesnothAtlas } from './WesnothAtlas';
import { getTerrainVisualSelection } from './TerrainRegistry';

export interface TerrainResourceManagerConfig {
    maxCacheSize?: number;
    preloadRadius?: number;
    defaultTileSize?: number;
}

export interface TileResource {
    terrain: TerrainType;
    baseTerrain?: TerrainType;
    overlayTerrain?: TerrainType | null;
    sprites: string[];
    isLoaded: boolean;
    lastAccessed: number;
}

export interface LoadingState {
    isLoading: boolean;
    loadedCount: number;
    totalCount: number;
    errors: Set<string>;
}

export class LRUCache<K, V> {
    private cache: Map<K, V> = new Map();
    private maxSize: number;

    constructor(maxSize: number = 500) {
        this.maxSize = maxSize;
    }

    get(key: K): V | undefined {
        if (!this.cache.has(key)) return undefined;
        this.cache.delete(key);
        this.cache.set(key, this.cache.get(key)!);
        return this.cache.get(key);
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }

    keys(): K[] {
        return Array.from(this.cache.keys());
    }
}

export class TerrainResourceManager {
    private static instance: TerrainResourceManager | null = null;
    private spriteCache: LRUCache<string, HTMLCanvasElement>;
    private tileDataCache: LRUCache<string, TileResource>;
    private loadingState: LoadingState;
    private config: Required<TerrainResourceManagerConfig>;
    private pendingLoads: Map<string, Promise<void>> = new Map();

    private constructor(config: TerrainResourceManagerConfig = {}) {
        this.config = {
            maxCacheSize: config.maxCacheSize ?? 500,
            preloadRadius: config.preloadRadius ?? 3,
            defaultTileSize: config.defaultTileSize ?? 72
        };
        this.spriteCache = new LRUCache(this.config.maxCacheSize);
        this.tileDataCache = new LRUCache(this.config.maxCacheSize);
        this.loadingState = {
            isLoading: false,
            loadedCount: 0,
            totalCount: 0,
            errors: new Set()
        };
    }

    static getInstance(config?: TerrainResourceManagerConfig): TerrainResourceManager {
        if (!TerrainResourceManager.instance) {
            TerrainResourceManager.instance = new TerrainResourceManager(config);
        }
        return TerrainResourceManager.instance;
    }

    static resetInstance(): void {
        TerrainResourceManager.instance = null;
    }

    getLoadingState(): LoadingState {
        return { ...this.loadingState };
    }

    private getTileKey(q: number, r: number, feature?: string, baseTerrain?: TerrainType, overlayTerrain?: TerrainType | null): string {
        return `${q},${r}:${baseTerrain || 'none'}:${overlayTerrain || 'none'}${feature ? `-${feature}` : ''}`;
    }

    private getSpriteKey(spriteName: string, scale: number): string {
        return `${spriteName}@${scale}`;
    }

    async preloadTiles(tiles: Array<{q: number, r: number, terrain: TerrainType, baseTerrain?: TerrainType, overlayTerrain?: TerrainType | null, feature?: string}>): Promise<void> {
        if (tiles.length === 0) return;

        this.loadingState.isLoading = true;
        this.loadingState.totalCount = tiles.length;
        this.loadingState.loadedCount = 0;
        this.loadingState.errors.clear();

        const chunks: typeof tiles[] = [];
        for (let i = 0; i < tiles.length; i += 10) {
            chunks.push(tiles.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            await Promise.all(chunk.map(tile => this.loadTileResources(tile.q, tile.r, tile.terrain, tile.baseTerrain, tile.overlayTerrain, tile.feature)));
            this.loadingState.loadedCount += chunk.length;
        }

        this.loadingState.isLoading = false;
    }

    async loadTileResources(q: number, r: number, terrain: TerrainType, baseTerrain?: TerrainType, overlayTerrain?: TerrainType | null, feature?: string): Promise<TileResource | null> {
        const key = this.getTileKey(q, r, feature, baseTerrain, overlayTerrain);

        const cached = this.tileDataCache.get(key);
        if (cached) return cached;

        const sprites = this.getTerrainSprites(terrain, q, r, baseTerrain, overlayTerrain, feature);
        const pendingSpriteKeys: string[] = [];
        const loadPromises: Promise<void>[] = [];

        for (const spriteName of sprites) {
            const spriteKey = this.getSpriteKey(spriteName, 1);
            if (!this.spriteCache.has(spriteKey) && !this.pendingLoads.has(spriteKey)) {
                const loadPromise = this.preloadSprite(spriteName).catch(err => {
                    this.loadingState.errors.add(spriteName);
                });
                this.pendingLoads.set(spriteKey, loadPromise);
                pendingSpriteKeys.push(spriteKey);
                loadPromises.push(loadPromise);
            }
        }

        if (loadPromises.length > 0) {
            await Promise.all(loadPromises);
            pendingSpriteKeys.forEach(spriteKey => {
                this.pendingLoads.delete(spriteKey);
            });
        }

        const resource: TileResource = {
            terrain,
            baseTerrain,
            overlayTerrain,
            sprites,
            isLoaded: true,
            lastAccessed: Date.now()
        };

        this.tileDataCache.set(key, resource);
        return resource;
    }

    private getTerrainSprites(terrain: TerrainType, _q: number, _r: number, baseTerrain?: TerrainType, overlayTerrain?: TerrainType | null, feature?: string): string[] {
        const sprites: string[] = [];

        const effectiveBaseTerrain = baseTerrain ?? terrain;
        const baseSelection = getTerrainVisualSelection(effectiveBaseTerrain);
        sprites.push(...baseSelection.baseCandidates.slice(0, 2));

        if (overlayTerrain) {
            const overlaySelection = getTerrainVisualSelection(overlayTerrain);
            sprites.push(...overlaySelection.baseCandidates.slice(0, 2));
        }

        if (feature) {
            const featureSelection = getTerrainVisualSelection(effectiveBaseTerrain, feature);
            sprites.push(...featureSelection.featureCandidates.slice(0, 2));
        }

        return Array.from(new Set(sprites));
    }

    private async preloadSprite(spriteName: string): Promise<void> {
        const spriteKey = this.getSpriteKey(spriteName, 1);
        
        if (this.spriteCache.has(spriteKey)) return;

        const loaded = wesnothAtlas.getSprite(spriteName);
        if (!loaded) {
            this.loadingState.errors.add(spriteName);
            return;
        }

        const canvas = document.createElement('canvas');
        const scale = this.config.defaultTileSize / 36;
        canvas.width = loaded.frame.frame.w * scale;
        canvas.height = loaded.frame.frame.h * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = false;
        const { image, frame } = loaded;
        const { frame: f, spriteSourceSize } = frame;

        const drawW = f.w * scale;
        const drawH = f.h * scale;
        const centerX = -drawW / 2;
        const centerY = -drawH / 2;
        const offsetX = spriteSourceSize.x * scale;
        const offsetY = spriteSourceSize.y * scale;

        ctx.drawImage(
            image,
            f.x, f.y, f.w, f.h,
            centerX + offsetX,
            centerY + offsetY,
            drawW,
            drawH
        );

        this.spriteCache.set(spriteKey, canvas);
    }

    getCachedTile(q: number, r: number, feature?: string): TileResource | undefined {
        const keyPrefix = `${q},${r}:`;
        const featureSuffix = feature ? `-${feature}` : '';
        for (const key of this.tileDataCache.keys()) {
            if (!String(key).startsWith(keyPrefix)) continue;
            if (featureSuffix && !String(key).endsWith(featureSuffix)) continue;
            return this.tileDataCache.get(key);
        }
        return undefined;
    }

    getCachedSprite(spriteName: string): HTMLCanvasElement | undefined {
        return this.spriteCache.get(this.getSpriteKey(spriteName, 1));
    }

    drawTile(
        ctx: CanvasRenderingContext2D,
        q: number, r: number,
        cx: number, cy: number,
        hexSize: number,
        feature?: string
    ): void {
        const tileData = this.getCachedTile(q, r, feature);
        if (!tileData) return;

        for (const spriteName of tileData.sprites) {
            const canvas = this.spriteCache.get(this.getSpriteKey(spriteName, 1));
            if (!canvas) continue;

            const scale = hexSize / this.config.defaultTileSize;
            const drawW = canvas.width * scale;
            const drawH = canvas.height * scale;

            ctx.drawImage(canvas, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
        }

        tileData.lastAccessed = Date.now();
    }

    getVisibleTiles(
        centerQ: number, centerR: number,
        viewportWidth: number, viewportHeight: number,
        hexSize: number
    ): Array<{q: number, r: number}> {
        const tiles: Array<{q: number, r: number}> = [];
        const hexWidth = hexSize * 1.5;
        const hexHeight = hexSize * Math.sqrt(3);

        const cols = Math.ceil(viewportWidth / hexWidth) + 2;
        const rows = Math.ceil(viewportHeight / hexHeight) + 2;

        const startQ = centerQ - Math.ceil(cols / 2);
        const endQ = centerQ + Math.ceil(cols / 2);
        const startR = centerR - Math.ceil(rows / 2);
        const endR = centerR + Math.ceil(rows / 2);

        for (let q = startQ; q <= endQ; q++) {
            for (let r = startR; r <= endR; r++) {
                if (this.isInViewport(q, r, centerQ, centerR, viewportWidth, viewportHeight, hexSize)) {
                    tiles.push({ q, r });
                }
            }
        }

        return tiles;
    }

    private isInViewport(
        q: number, r: number,
        centerQ: number, centerR: number,
        viewportW: number, viewportH: number,
        hexSize: number
    ): boolean {
        const hexWidth = hexSize * 1.5;
        const hexHeight = hexSize * Math.sqrt(3);
        
        const dx = (q - centerQ) * hexWidth;
        const dy = (r - centerQ / 2 - centerR / 2) * hexHeight;
        
        return Math.abs(dx) < viewportW && Math.abs(dy) < viewportH;
    }

    preloadViewport(
        centerQ: number, centerR: number,
        viewportW: number, viewportH: number,
        hexSize: number,
        terrainProvider: (q: number, r: number) => { terrain: TerrainType, baseTerrain?: TerrainType, overlayTerrain?: TerrainType | null, feature?: string } | null
    ): void {
        const visibleTiles = this.getVisibleTiles(centerQ, centerR, viewportW, viewportH, hexSize);
        
        const tilesToLoad = visibleTiles
            .map(({q, r}) => {
                const data = terrainProvider(q, r);
                return data ? { q, r, ...data } : null;
            })
            .filter((t): t is {q: number, r: number, terrain: TerrainType, baseTerrain?: TerrainType, overlayTerrain?: TerrainType | null, feature?: string} => t !== null);

        this.preloadTiles(tilesToLoad).catch(err => {
            console.error('[TerrainResourceManager] Failed to preload viewport:', err);
        });
    }

    clearCache(): void {
        this.spriteCache.clear();
        this.tileDataCache.clear();
        this.loadingState.errors.clear();
    }

    getCacheStats(): { spriteCacheSize: number, tileCacheSize: number, errorCount: number } {
        return {
            spriteCacheSize: this.spriteCache.size,
            tileCacheSize: this.tileDataCache.size,
            errorCount: this.loadingState.errors.size
        };
    }

    getMemoryUsage(): number {
        let bytes = 0;
        for (const canvas of this.spriteCache.keys()) {
            const c = this.spriteCache.get(canvas);
            if (c) bytes += c.width * c.height * 4;
        }
        return bytes;
    }
}

export const terrainResourceManager = TerrainResourceManager.getInstance();
