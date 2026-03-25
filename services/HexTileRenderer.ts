
import { TerrainType } from '../types';
import { TERRAIN_COLORS } from '../constants';
import { wesnothAtlas } from './WesnothAtlas';
import { TerrainResourceManager, terrainResourceManager } from './TerrainResourceManager';
import { resolveTerrainSprites } from './TransitionResolver';

interface TerrainTransition {
    spriteName: string;
    layer: number;
}

interface TerrainTileState {
    terrain: TerrainType;
    baseTerrain?: TerrainType;
    overlayTerrain?: TerrainType | null;
}

export class HexTileRenderer {
    private terrainCache: Map<string, TerrainTileState> = new Map();
    private spriteCache: Map<string, TerrainTransition[]> = new Map();
    private resourceManager: TerrainResourceManager;
    private lastWarningTime: number = 0;
    private readonly WARN_INTERVAL_MS = 5000;

    constructor(resourceManager?: TerrainResourceManager) {
        this.resourceManager = resourceManager || terrainResourceManager;
    }

    setTerrain(q: number, r: number, terrain: TerrainType, baseTerrain?: TerrainType, overlayTerrain?: TerrainType | null): void {
        this.terrainCache.set(`${q},${r}`, { terrain, baseTerrain, overlayTerrain });
    }

    getTerrain(q: number, r: number): TerrainType | undefined {
        return this.terrainCache.get(`${q},${r}`)?.terrain;
    }

    getTerrainState(q: number, r: number): TerrainTileState | undefined {
        return this.terrainCache.get(`${q},${r}`);
    }

    clear(): void {
        this.terrainCache.clear();
        this.spriteCache.clear();
    }

    getResourceManager(): TerrainResourceManager {
        return this.resourceManager;
    }

    getLoadingProgress(): { isLoading: boolean; progress: number; errors: number } {
        const state = this.resourceManager.getLoadingState();
        return {
            isLoading: state.isLoading,
            progress: state.totalCount > 0 ? state.loadedCount / state.totalCount : 0,
            errors: state.errors.size
        };
    }

    preloadTilesForViewport(
        centerQ: number, centerR: number,
        viewportWidth: number, viewportHeight: number,
        hexSize: number,
        terrainProvider: (q: number, r: number) => { terrain: TerrainType, feature?: string } | null
    ): void {
        this.resourceManager.preloadViewport(
            centerQ, centerR, viewportWidth, viewportHeight, hexSize, terrainProvider
        );
    }

    getTileSprites(q: number, r: number, feature?: string): TerrainTransition[] {
        const cacheKey = `${q},${r}-${feature || ''}`;
        if (this.spriteCache.has(cacheKey)) {
            return this.spriteCache.get(cacheKey)!;
        }

        const currentTile = this.getTerrainState(q, r);
        if (!currentTile) return [];

        const transitions = resolveTerrainSprites({
            q,
            r,
            terrain: currentTile.terrain,
            baseTerrain: currentTile.baseTerrain,
            overlayTerrain: currentTile.overlayTerrain,
            feature,
            getTerrain: (tileQ, tileR) => this.getTerrainState(tileQ, tileR),
        });

        this.spriteCache.set(cacheKey, transitions);
        return transitions;
    }

    drawTile(ctx: CanvasRenderingContext2D, q: number, r: number, cx: number, cy: number, hexSize: number, feature?: string): void {
        const sprites = this.getTileSprites(q, r, feature);
        
        if (sprites.length === 0) {
            this.drawFallbackHex(ctx, cx, cy, hexSize, this.getTerrain(q, r));
            return;
        }

        if (!wesnothAtlas.isReady()) {
            this.drawFallbackHex(ctx, cx, cy, hexSize, this.getTerrain(q, r));
            return;
        }
        
        sprites.sort((a, b) => a.layer - b.layer);

        for (const sprite of sprites) {
            const loaded = wesnothAtlas.getSprite(sprite.spriteName);
            if (loaded) {
                const scale = hexSize / 36;
                wesnothAtlas.drawSprite(ctx, sprite.spriteName, cx, cy, scale);
            } else {
                this.warnMissingSprite(sprite.spriteName, q, r);
                this.drawFallbackHex(ctx, cx, cy, hexSize, this.getTerrain(q, r));
            }
        }
    }

    private warnMissingSprite(spriteName: string, q: number, r: number): void {
        const now = Date.now();
        if (now - this.lastWarningTime <= this.WARN_INTERVAL_MS) {
            return;
        }

        this.lastWarningTime = now;
        console.warn(`[HexTileRenderer] Missing sprite "${spriteName}" at tile ${q},${r}`);
    }

    private drawFallbackHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, hexSize: number, terrain?: TerrainType): void {
        const color = terrain ? TERRAIN_COLORS[terrain] || '#888' : '#888';
        
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = cx + hexSize * Math.cos(angle);
            const y = cy + hexSize * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

export const hexTileRenderer = new HexTileRenderer();
