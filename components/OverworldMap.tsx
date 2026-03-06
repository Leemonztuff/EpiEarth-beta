
// @ts-nocheck
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { HexCell, TerrainType, WeatherType, Dimension, GameState, MovementType } from '../types';
import { HEX_SIZE, TERRAIN_COLORS, ASSETS, TERRAIN_MOVEMENT_COST, TERRAIN_CATEGORIES, CATEGORY_COLORS, HEX_DIRECTIONS, TerrainCategory } from '../constants';
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

export const WeatherOverlay = ({ type, dimension }: { type: WeatherType, dimension: Dimension }) => {
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

export const OverworldMap = ({ playerPos, onMove, dimension = 'MORTAL' }: any) => {
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
        wesnothAtlas.load().then(() => {
            console.log('[OverworldMap] Wesnoth Atlas loaded, sprites:', wesnothAtlas.getAllSprites().length);
            const grassSprites = wesnothAtlas.getSpritesByCategory('grass');
            console.log('[OverworldMap] Grass sprites:', grassSprites.slice(0, 10));

            // validate terrain mappings
            const missing: string[] = [];
            Object.values(TERRAIN_TO_WESNOTH).forEach(val => {
                const candidates = [`flat/${val}`, val];
                const found = candidates.some(c => wesnothAtlas.hasSprite(c));
                if (!found && !missing.includes(val)) missing.push(val);
            });
            if (missing.length > 0) {
                console.warn('[OverworldMap] missing mapped terrains in atlas:', missing);
            }
        }).catch(err => {
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
            
            const cleared = useGameStore.getState().clearedEncounters || new Set();
            tilesArray = Array.from(currentExplored).map(key => {
                const [q, r] = key.split(',').map(Number);
                const tile = WorldGenerator.getTile(q, r, safeDimension);
                if (!tile) return null;
                // if this tile has been cleared, strip its encounter/enemies
                if (cleared.has(key)) {
                    tile.hasEncounter = false;
                    tile.enemies = [];
                }
                return tile;
            }).filter(Boolean);
            
            tilesArray.forEach(tile => {
                if (!tile) return;
                hexTileRenderer.setTerrain(tile.q, tile.r, tile.terrain);
            });

            const spawnEnemy = useGameStore.getState().spawnEnemy;
            const existing = useGameStore.getState().enemies || [];

            tilesArray.forEach(tile => {
                if (!tile) return;
                const { x: tx, y: ty } = hexToPixel(tile.q, tile.r);
                hexTileRenderer.drawTile(ctx, tile.q, tile.r, tx, ty, HEX_SIZE, tile.feature);

                const key = `${tile.q},${tile.r}`;
                if (tile.hasEncounter && !useGameStore.getState().clearedEncounters.has(key)) {
                    const found = existing.find(e => `${e.q},${e.r}` === key);
                    if (!found) {
                        spawnEnemy({ id: key, q: tile.q, r: tile.r, spriteUrl: AssetManager.FALLBACK_SPRITE });
                    }
                }
            });
        }

        const drawLoop = (tiles: any[]) => {
            if (!tiles || !Array.isArray(tiles)) return;
            tiles.forEach(tile => {
                if (!tile) return;
                try {
                    const { x, y } = hexToPixel(tile.q, tile.r);
                    drawWesnothHex(ctx, x + 4000, y + 4000, tile);
                } catch (e) {
                    // Skip bad tiles
                }
            });
        };

        drawLoop(tilesArray);
    }, [isLocal, townMapData, exploredTiles, safeDimension, isAssetsLoaded]);

    const getNeighborTerrain = useCallback((q: number, r: number, dimension: string) => {
        const key = `${q},${r}`;
        const currentExplored = exploredTiles?.[dimension];
        if (!currentExplored || !currentExplored.has(key)) return null;
        const tile = WorldGenerator.getTile(q, r, dimension);
        return tile?.terrain || null;
    }, [exploredTiles]);

    const drawTransitionEdge = useCallback((ctx: any, cx: number, cy: number, s: number, edgeIndex: number, fromColor: string, toColor: string) => {
        const angle1 = 2 * Math.PI / 6 * edgeIndex;
        const angle2 = 2 * Math.PI / 6 * ((edgeIndex + 1) % 6);
        
        const innerRadius = s * 0.85;
        const outerRadius = s * 1.1;
        
        const x1Inner = cx + innerRadius * Math.cos(angle1);
        const y1Inner = cy + innerRadius * Math.sin(angle1);
        const x2Inner = cx + innerRadius * Math.cos(angle2);
        const y2Inner = cy + innerRadius * Math.sin(angle2);
        
        const x1Outer = cx + outerRadius * Math.cos(angle1);
        const y1Outer = cy + outerRadius * Math.sin(angle1);
        const x2Outer = cx + outerRadius * Math.cos(angle2);
        const y2Outer = cy + outerRadius * Math.sin(angle2);
        
        const grad = ctx.createLinearGradient(x1Inner, y1Inner, x1Outer, y1Outer);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.5, fromColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x1Inner, y1Inner);
        ctx.lineTo(x1Outer, y1Outer);
        ctx.lineTo(x2Outer, y2Outer);
        ctx.lineTo(x2Inner, y2Inner);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.restore();
    }, []);

    const drawWesnothHex = useCallback((ctx: any, cx: number, cy: number, tile: any) => {
        if (!tile || !tile.terrain) return;
        
        try {
            const s = HEX_SIZE;
            
            ctx.save();
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = 2 * Math.PI / 6 * i;
                ctx.lineTo(cx + s * 1.05 * Math.cos(angle), cy + s * 1.05 * Math.sin(angle));
            }
            ctx.closePath();
            ctx.clip();
            
            const scale = s / 36 * 2;
            
            hexTileRenderer.setTerrain(tile.q, tile.r, tile.terrain);
            const sprites = hexTileRenderer.getTileSprites(tile.q, tile.r);
            
            let drewSprite = false;
            if (sprites.length > 0) {
                for (const sprite of sprites) {
                    const success = wesnothAtlas.drawSprite(ctx, sprite.spriteName, cx, cy, scale);
                    if (success) drewSprite = true;
                }
            }
            
            if (!drewSprite) {
                console.warn(`[OverworldMap] no wesnoth sprite for terrain ${tile.terrain}, using fallback`);
                const terrainPath = ASSETS.TERRAIN[tile.terrain];
                const img = AssetManager.getAsset(terrainPath);
                if (img) {
                    const imgSize = s * 2; 
                    ctx.drawImage(img, cx - imgSize/2, cy - imgSize/2, imgSize, imgSize);
                } else {
                    ctx.fillStyle = TERRAIN_COLORS[tile.terrain] || '#444';
                    ctx.fill();
                }
            }
            ctx.restore();

            const grad = ctx.createRadialGradient(cx, cy, s * 0.7, cx, cy, s);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.25)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = 2 * Math.PI / 6 * i;
                ctx.lineTo(cx + s * Math.cos(angle), cy + s * Math.sin(angle));
            }
            ctx.closePath();
            ctx.fill();

            // feature layer: trees, ruins, etc. supplied by world generator
            if (tile.featureSprite) {
                const featImg = AssetManager.getAsset(tile.featureSprite);
                if (featImg) {
                    const fs = s * 1.5;
                    ctx.drawImage(featImg, cx - fs/2, cy - fs/2, fs, fs);
                }
            }

            // draw enemies from store for this coordinate
            if (!isLocal && overworldEnemies && overworldEnemies.length > 0) {
                const coordsKey = `${tile.q},${tile.r}`;
                overworldEnemies.filter(e => `${e.q},${e.r}` === coordsKey).forEach((e, idx) => {
                    const eImg = AssetManager.getAsset(e.spriteUrl);
                    const es = s * 1.6;
                    const bounce = Math.sin(Date.now() / 250 + idx) * 3;
                    if (eImg) {
                        ctx.drawImage(eImg, cx - es/2, cy - es/1.3 + bounce, es, es);
                    } else {
                        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
                        ctx.beginPath();
                        ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.font = '16px serif';
                        ctx.textAlign = 'center';
                        ctx.fillText('💀', cx, cy + 5);
                    }
                });
            }

            const poiType = tile.poiType || (tile.hasPortal ? 'PORTAL' : null);
            if (poiType && ASSETS.STRUCTURES[poiType]) {
                const structImg = AssetManager.getAsset(ASSETS.STRUCTURES[poiType]);
                if (structImg) {
                    const ss = s * 2;
                    if (tile.hasPortal) {
                         ctx.shadowBlur = 15;
                         ctx.shadowColor = '#a855f7';
                    }
                    ctx.drawImage(structImg, cx - ss/2, cy - ss/1.2, ss, ss);
                    ctx.shadowBlur = 0;
                }
            }

            // encounters are rendered via overworldEnemies layer now
            // if (tile.hasEncounter && !isLocal) {
            //     ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
            //     ctx.beginPath();
            //     ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
            //     ctx.fill();
            //     ctx.font = '16px serif';
            //     ctx.textAlign = 'center';
            //     ctx.fillText('💀', cx, cy + 5);
            // }

            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.stroke();
        } catch (e) {}
    }, [isLocal, safeDimension, getNeighborTerrain, drawTransitionEdge, overworldEnemies]);

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
            const s = HEX_SIZE * 2;
            const bounce = Math.sin(Date.now() / 250) * 3;
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.drawImage(playerImg, px - s/2, py - s + 5 + bounce, s, s);
            ctx.restore();
        }

        // draw overworld enemies
        if (overworldEnemies && overworldEnemies.length > 0) {
            overworldEnemies.forEach(enemy => {
                const { x: ex, y: ey } = hexToPixel(enemy.q, enemy.r);
                const img = AssetManager.getAsset(enemy.spriteUrl);
                if (img) {
                    ctx.save();
                    const s2 = HEX_SIZE * 2;
                    const bounce2 = Math.sin(Date.now() / 250 + parseInt(enemy.id.replace(/\D/g,'')||'0')) * 3;
                    ctx.shadowBlur = 8;
                    ctx.shadowColor = 'rgba(0,0,0,0.6)';
                    ctx.drawImage(img, ex - s2/2, ey - s2 + 5 + bounce2, s2, s2);
                    ctx.restore();
                }
            });
        }

        ctx.restore();

    }, [playerPos, party, exploredTiles, safeDimension, worldTime, isLocal, townMapData, isAssetsLoaded]);

    useEffect(() => {
        let frameId = requestAnimationFrame(function loop() {
            render();
            frameId = requestAnimationFrame(loop);
        });
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
