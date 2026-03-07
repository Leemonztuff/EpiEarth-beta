import React, { useRef, useEffect, useCallback } from 'react';
import { WeatherType, Dimension, GameState } from '../types';
import { HEX_SIZE, TERRAIN_COLORS, ASSETS } from '../constants';
import { useGameStore } from '../store/gameStore';
import { WorldGenerator } from '../services/WorldGenerator';
import { calculateVisionRange } from '../services/dndRules';
import { AssetManager } from '../services/AssetManager';
import { wesnothAtlas } from '../services/WesnothAtlas';
import { hexTileRenderer } from '../services/HexTileRenderer';

import { inputManager, InputType } from '../services/input/InputManager';

const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;
const HORIZ_DIST = HEX_SIZE * 1.5;
const VERT_DIST = HEX_HEIGHT;

function hexToPixel(q: number, r: number) {
    return { x: q * HORIZ_DIST, y: (r + q / 2) * VERT_DIST };
}

function axialRound(q: number, r: number) {
    let rq = Math.round(q); let rr = Math.round(r); let rs = Math.round(-q - r);
    const qDiff = Math.abs(rq - q); const rDiff = Math.abs(rr - r); const sDiff = Math.abs(rs - (-q - r));
    if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs; else if (rDiff > sDiff) rr = -rq - rs;
    return { q: rq, r: rr };
}

function pixelToAxial(x: number, y: number) {
    const q = (2 / 3 * x) / HEX_SIZE;
    const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_SIZE;
    return axialRound(q, r);
}

export const WeatherOverlay = ({ type, dimension }: { type: WeatherType | 'NONE', dimension: Dimension }) => {
    const isShadow = dimension === Dimension.UPSIDE_DOWN;
    return (
        <div className="fixed inset-0 pointer-events-none z-[80] overflow-hidden">
            <div className={`absolute inset-0 transition-colors duration-2000 ${isShadow ? 'bg-indigo-950/40' : 'bg-transparent'}`} />
            {type === WeatherType.RAIN && (
                <div className="absolute inset-0 opacity-40 animate-pulse" style={{ 
                    backgroundImage: `url("${AssetManager.getSafeSprite(ASSETS.VFX.RAIN)}")`,
                    backgroundRepeat: 'repeat',
                }} />
            )}
        </div>
    );
};

const OverworldMap = ({ playerPos, onMove, dimension = 'MORTAL' }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const terrainCacheRef = useRef<HTMLCanvasElement>(null);
    
    const exploredTiles = useGameStore(s => s.exploredTiles);
    const party = useGameStore(s => s.party);
    const worldTime = useGameStore(s => s.worldTime);
    const gameState = useGameStore(s => s.gameState);
    const townMapData = useGameStore(s => s.townMapData);
    const isAssetsLoaded = useGameStore(s => s.isAssetsLoaded);
    const overworldEnemies = useGameStore(s => s.enemies);

    const safeDimension = dimension || 'MORTAL';    
    const isLocal = (gameState || '') === GameState.TOWN_EXPLORATION || (gameState || '') === GameState.DUNGEON;
    const hours = Math.floor((worldTime || 480) / 60);
    const isNight = hours < 6 || hours >= 22;

    useEffect(() => {
        wesnothAtlas.load().catch(err => {
            console.error('[OverworldMap] Failed to load Wesnoth Atlas:', err);
        });
    }, []);

    useEffect(() => {
        if (!isAssetsLoaded) return;
        
        hexTileRenderer.clear();
        
        if (!terrainCacheRef.current) {
            try {
                terrainCacheRef.current = document.createElement('canvas');
                terrainCacheRef.current.width = 8000; 
                terrainCacheRef.current.height = 8000;
            } catch (e) {
                console.warn('Failed to create terrain cache:', e);
                return;
            }
        }

        const canvas = terrainCacheRef.current;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0,0,8000,8000);

        let tilesArray: any[] = [];
        
        const collectTiles = (tiles: any[]) => {
            if (!tiles || !Array.isArray(tiles)) return;
            tiles.forEach(tile => {
                if (!tile) return;
                hexTileRenderer.setTerrain(tile.q, tile.r, tile.terrain);
                tilesArray.push(tile);
            });
        };

        if (isLocal && townMapData && Array.isArray(townMapData)) {
            collectTiles(townMapData);
        } else {
            const currentExplored = exploredTiles?.[safeDimension] || new Set();
            if (!currentExplored || currentExplored.size === 0) return;
            
            const { clearedEncounters, spawnEnemy, enemies } = useGameStore.getState();
            const cleared = clearedEncounters || new Set();
            const existing = enemies || [];

            tilesArray = Array.from(currentExplored).map(key => {
                const [q, r] = (key as string).split(',').map(Number);
                const tile = WorldGenerator.getTile(q, r, safeDimension);
                if (!tile) return null;
                if (cleared.has(key as string)) {
                    tile.hasEncounter = false;
                    tile.enemies = [];
                }
                hexTileRenderer.setTerrain(tile.q, tile.r, tile.terrain);
                return tile;
            }).filter(Boolean);

            tilesArray.forEach(tile => {
                if (!tile) return;
                const { x: tx, y: ty } = hexToPixel(tile.q, tile.r);
                hexTileRenderer.drawTile(ctx, tile.q, tile.r, tx, ty, HEX_SIZE, tile.feature);

                const key = `${tile.q},${tile.r}`;
                if (tile.hasEncounter && !cleared.has(key)) {
                    const found = existing.find(e => `${e.q},${e.r}` === key);
                    if (!found) {
                        spawnEnemy({ id: key, q: tile.q, r: tile.r, spriteUrl: 'units/undead/ghoul.png' });
                    }
                }
            });
        }
    }, [isLocal, townMapData, exploredTiles, safeDimension, isAssetsLoaded]);

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        try {
            if (!canvas || !container || !playerPos || !party?.[0]) return;
        } catch (e) {
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.imageSmoothingEnabled = false;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = container.clientWidth * dpr;
        canvas.height = container.clientHeight * dpr;
        ctx.scale(dpr, dpr);

        const zoom = isLocal ? 2.5 : 1.8;
        const { x: px, y: py } = hexToPixel(playerPos.x, playerPos.y);
        const offsetX = (canvas.width / (2 * dpr * zoom)) - px;
        const offsetY = (canvas.height / (2 * dpr * zoom)) - py;

        // Fondo oscuro total
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.translate(offsetX, offsetY);

        if (terrainCacheRef.current) {
            ctx.drawImage(terrainCacheRef.current, -4000, -4000);
        }

        const leader = party[0];
        const visionRange = calculateVisionRange(leader.stats.attributes.WIS, leader.stats.corruption || 0, worldTime || 480, safeDimension);
        const visionPx = visionRange * HEX_SIZE * 1.5;

        // MÁSCARA DE OSCURIDAD (Noche o Vacío)
        const needsDarkness = isNight || safeDimension === Dimension.UPSIDE_DOWN;
        if (needsDarkness) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(-offsetX, -offsetY, canvas.width / zoom, canvas.height / zoom);
            ctx.arc(px, py, visionPx, 0, Math.PI * 2, true);
            ctx.clip();
            ctx.fillStyle = safeDimension === Dimension.UPSIDE_DOWN ? 'rgba(10, 5, 25, 0.92)' : 'rgba(0, 5, 15, 0.85)';
            ctx.fillRect(-offsetX, -offsetY, canvas.width / zoom, canvas.height / zoom);
            ctx.restore();

            // Resplandor del líder
            const grad = ctx.createRadialGradient(px, py, 0, px, py, visionPx);
            grad.addColorStop(0, 'rgba(255, 200, 100, 0.15)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(px, py, visionPx, 0, Math.PI * 2);
            ctx.fill();
        }

        // PLAYER SPRITE
        const playerImg = AssetManager.getAsset(leader.visual.spriteUrl);
        if (playerImg) {
            ctx.save();
            const aspect = playerImg.width / playerImg.height;
            const h = HEX_SIZE * 1.8;
            const w = h * aspect;
            const bounce = Math.sin(Date.now() / 250) * 3;
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.drawImage(playerImg, px - w/2, py - h + 5 + bounce, w, h);
            ctx.restore();
        }

        // draw overworld enemies
        if (overworldEnemies && overworldEnemies.length > 0) {
            overworldEnemies.forEach(enemy => {
                const { x: ex, y: ey } = hexToPixel(enemy.q, enemy.r);
                const img = AssetManager.getAsset(enemy.spriteUrl);
                if (img) {
                    ctx.save();
                    const aspect = img.width / img.height;
                    const h = HEX_SIZE * 1.8;
                    const w = h * aspect;
                    const bounce2 = Math.sin(Date.now() / 250 + parseInt(enemy.id.replace(/\D/g,'')||'0')) * 3;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(0,0,0,0.6)';
                    ctx.drawImage(img, ex - w/2, ey - h + 5 + bounce2, w, h);
                    ctx.restore();
                }
            });
        }

        ctx.restore();

    }, [playerPos, party, exploredTiles, safeDimension, worldTime, isLocal, townMapData, isAssetsLoaded]);

    useEffect(() => {
        let frameId: number;
        let lastTime = 0;
        const FRAME_INTERVAL = 1000 / 60;

        const loop = (time: number) => {
            if (time - lastTime >= FRAME_INTERVAL) {
                render();
                lastTime = time;
            }
            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [render]);

    return (
        <div ref={containerRef} className="fixed inset-0 w-full h-full bg-[#0a0d14] overflow-hidden">
            {!isLocal && playerPos && <WeatherOverlay type={WorldGenerator.getTile(playerPos.x, playerPos.y, safeDimension)?.weather || 'NONE'} dimension={safeDimension} />}
            <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]" />
            <canvas 
                ref={canvasRef} 
                className="w-full h-full cursor-crosshair touch-none" 
                onClick={(e) => {
                    const canvas = canvasRef.current;
                    if (!canvas || !playerPos) return;
                    const rect = canvas.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    const zoom = isLocal ? 2.5 : 1.8;
                    const { x: px, y: py } = hexToPixel(playerPos.x, playerPos.y);
                    const mx = (e.clientX - rect.left) / zoom - ((canvas.width / (2 * dpr * zoom)) - px);
                    const my = (e.clientY - rect.top) / zoom - ((canvas.height / (2 * dpr * zoom)) - py);
                    const { q, r } = pixelToAxial(mx, my);

                    inputManager.emit({
                        type: InputType.MOVE_TO,
                        q, r,
                        originalEvent: e
                    });

                    const targetTile = WorldGenerator.getTile(q, r, safeDimension);

                    if (targetTile?.hasEncounter && !isLocal) {
                        const initZone = useGameStore.getState().initZone;
                        const setGameState = useGameStore.getState().setGameState;
                        initZone('forest');
                        setGameState(GameState.EXPLORATION_3D);
                    } else {
                        onMove(q, r);
                    }
                }}
            />
        </div>
    );
};

export default OverworldMap;
