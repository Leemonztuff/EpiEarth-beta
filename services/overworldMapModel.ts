import { HEX_SIZE } from '../constants';
import { Dimension, HexCell } from '../types';
import { WorldGenerator } from './WorldGenerator';

const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;
const HORIZONTAL_DISTANCE = HEX_SIZE * 1.5;
const VERTICAL_DISTANCE = HEX_HEIGHT;

export interface OverworldCameraState {
    zoom: number;
    playerPixelX: number;
    playerPixelY: number;
    offsetX: number;
    offsetY: number;
}

export interface TerrainRenderCell extends HexCell {
    isDiscovered: boolean;
}

export function hexToPixel(q: number, r: number) {
    return { x: q * HORIZONTAL_DISTANCE, y: (r + q / 2) * VERTICAL_DISTANCE };
}

function axialRound(q: number, r: number) {
    let roundedQ = Math.round(q);
    let roundedR = Math.round(r);
    const roundedS = Math.round(-q - r);

    const qDiff = Math.abs(roundedQ - q);
    const rDiff = Math.abs(roundedR - r);
    const sDiff = Math.abs(roundedS - (-q - r));

    if (qDiff > rDiff && qDiff > sDiff) {
        roundedQ = -roundedR - roundedS;
    } else if (rDiff > sDiff) {
        roundedR = -roundedQ - roundedS;
    }

    return { q: roundedQ, r: roundedR };
}

export function pixelToAxial(x: number, y: number) {
    const q = (2 / 3 * x) / HEX_SIZE;
    const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_SIZE;
    return axialRound(q, r);
}

export function getMapZoom(isLocal: boolean) {
    return isLocal ? 2.5 : 1.8;
}

export function buildCameraState(
    playerPos: { x: number; y: number },
    canvasWidth: number,
    canvasHeight: number,
    dpr: number,
    isLocal: boolean
): OverworldCameraState {
    const zoom = getMapZoom(isLocal);
    const { x: playerPixelX, y: playerPixelY } = hexToPixel(playerPos.x, playerPos.y);

    return {
        zoom,
        playerPixelX,
        playerPixelY,
        offsetX: (canvasWidth / (2 * dpr * zoom)) - playerPixelX,
        offsetY: (canvasHeight / (2 * dpr * zoom)) - playerPixelY,
    };
}

export function screenPointToHex(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number,
    dpr: number,
    playerPos: { x: number; y: number },
    isLocal: boolean
) {
    const camera = buildCameraState(playerPos, canvasWidth, canvasHeight, dpr, isLocal);
    const mapX = screenX / camera.zoom - camera.offsetX;
    const mapY = screenY / camera.zoom - camera.offsetY;

    return pixelToAxial(mapX, mapY);
}

export function buildTerrainTiles(params: {
    isLocal: boolean;
    townMapData: HexCell[] | null;
    exploredKeys: Set<string>;
    dimension: Dimension;
    clearedEncounters: Set<string>;
    playerPos?: { x: number; y: number };
    renderRadius?: number;
}): TerrainRenderCell[] {
    const {
        isLocal,
        townMapData,
        exploredKeys,
        dimension,
        clearedEncounters,
        playerPos,
        renderRadius = 8,
    } = params;

    if (isLocal) {
        return (townMapData ?? []).map(tile => ({
            ...tile,
            isDiscovered: true,
        }));
    }

    if (!playerPos && exploredKeys.size === 0) {
        return [];
    }

    const tileKeys = new Set<string>(exploredKeys);

    if (playerPos) {
        for (let dq = -renderRadius; dq <= renderRadius; dq++) {
            for (let dr = Math.max(-renderRadius, -dq - renderRadius); dr <= Math.min(renderRadius, -dq + renderRadius); dr++) {
                tileKeys.add(`${playerPos.x + dq},${playerPos.y + dr}`);
            }
        }
    }

    return Array.from(tileKeys)
        .map((key): TerrainRenderCell | null => {
            const [q, r] = key.split(',').map(Number);
            const tile = WorldGenerator.getTile(q, r, dimension);

            if (!tile) {
                return null;
            }

            const isDiscovered = exploredKeys.has(key);

            if (clearedEncounters.has(key)) {
                return {
                    ...tile,
                    hasEncounter: false,
                    enemies: [],
                    isDiscovered,
                };
            }

            return {
                ...tile,
                isDiscovered,
            };
        })
        .filter((tile): tile is TerrainRenderCell => tile !== null);
}
