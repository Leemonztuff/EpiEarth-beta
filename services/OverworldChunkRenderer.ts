import { HEX_SIZE } from '../constants';
import { hexTileRenderer } from './HexTileRenderer';
import { hexToPixel, TerrainRenderCell } from './overworldMapModel';

interface ChunkBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

interface RenderChunk {
    key: string;
    tiles: TerrainRenderCell[];
    bounds: ChunkBounds;
    canvas: HTMLCanvasElement;
}

const CHUNK_RADIUS = 6;
const HEX_PADDING = HEX_SIZE * 2;

function drawFoggedHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, hexSize: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 6, 10, 0.72)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
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
    ctx.stroke();
    ctx.restore();
}

export class OverworldChunkRenderer {
    private chunks = new Map<string, RenderChunk>();

    clear(): void {
        this.chunks.clear();
    }

    rebuild(tiles: TerrainRenderCell[], isLocal: boolean): void {
        this.chunks.clear();

        const grouped = new Map<string, TerrainRenderCell[]>();
        for (const tile of tiles) {
            const chunkQ = Math.floor(tile.q / CHUNK_RADIUS);
            const chunkR = Math.floor(tile.r / CHUNK_RADIUS);
            const key = `${chunkQ},${chunkR}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key)!.push(tile);
        }

        grouped.forEach((chunkTiles, key) => {
            const bounds = this.computeBounds(chunkTiles);
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX));
            canvas.height = Math.max(1, Math.ceil(bounds.maxY - bounds.minY));

            const ctx = canvas.getContext('2d', { alpha: true });
            if (!ctx) {
                return;
            }

            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const tile of chunkTiles) {
                const { x, y } = hexToPixel(tile.q, tile.r);
                const localX = x - bounds.minX;
                const localY = y - bounds.minY;
                hexTileRenderer.drawTile(ctx, tile.q, tile.r, localX, localY, HEX_SIZE, tile.feature);

                if (!isLocal && !tile.isDiscovered) {
                    drawFoggedHex(ctx, localX, localY, HEX_SIZE * 0.98);
                }
            }

            this.chunks.set(key, {
                key,
                tiles: chunkTiles,
                bounds,
                canvas,
            });
        });
    }

    drawVisibleChunks(ctx: CanvasRenderingContext2D, view: { minX: number; minY: number; maxX: number; maxY: number }): void {
        this.chunks.forEach(chunk => {
            if (
                chunk.bounds.maxX < view.minX ||
                chunk.bounds.minX > view.maxX ||
                chunk.bounds.maxY < view.minY ||
                chunk.bounds.minY > view.maxY
            ) {
                return;
            }

            ctx.drawImage(chunk.canvas, chunk.bounds.minX, chunk.bounds.minY);
        });
    }

    private computeBounds(tiles: TerrainRenderCell[]): ChunkBounds {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const tile of tiles) {
            const { x, y } = hexToPixel(tile.q, tile.r);
            minX = Math.min(minX, x - HEX_PADDING);
            minY = Math.min(minY, y - HEX_PADDING);
            maxX = Math.max(maxX, x + HEX_PADDING);
            maxY = Math.max(maxY, y + HEX_PADDING);
        }

        return { minX, minY, maxX, maxY };
    }
}

export const overworldChunkRenderer = new OverworldChunkRenderer();
