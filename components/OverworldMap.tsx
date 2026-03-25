import React, { useRef, useEffect, useCallback, useState } from 'react';
import { WeatherType, Dimension, GameState } from '../types';
import { HEX_SIZE, ASSETS } from '../constants';
import { useGameStore } from '../store/gameStore';
import { WorldGenerator } from '../services/WorldGenerator';
import { calculateVisionRange } from '../services/dndRules';
import { AssetManager } from '../services/AssetManager';
import { wesnothAtlas } from '../services/WesnothAtlas';
import { hexTileRenderer } from '../services/HexTileRenderer';
import { overworldChunkRenderer } from '../services/OverworldChunkRenderer';
import { buildCameraState, buildTerrainTiles, hexToPixel, screenPointToHex } from '../services/overworldMapModel';

import { inputManager, InputType } from '../services/input/InputManager';

interface OverworldMapProps {
    playerPos: { x: number; y: number };
    onMove: (q: number, r: number) => void;
    dimension?: Dimension;
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

const OverworldMap = ({ playerPos, onMove, dimension = Dimension.NORMAL }: OverworldMapProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAtlasReady, setIsAtlasReady] = useState(wesnothAtlas.isReady());
    
    const exploredTiles = useGameStore(s => s.exploredTiles);
    const party = useGameStore(s => s.party);
    const worldTime = useGameStore(s => s.worldTime);
    const gameState = useGameStore(s => s.gameState);
    const townMapData = useGameStore(s => s.townMapData);
    const isAssetsLoaded = useGameStore(s => s.isAssetsLoaded);
    const overworldEnemies = useGameStore(s => s.enemies);

    const clearedEncounters = useGameStore(s => s.clearedEncounters);
    const safeDimension = dimension || Dimension.NORMAL;
    const isLocal = (gameState || '') === GameState.TOWN_EXPLORATION || (gameState || '') === GameState.DUNGEON;
    const hours = Math.floor((worldTime || 480) / 60);
    const isNight = hours < 6 || hours >= 22;

    useEffect(() => {
        wesnothAtlas.load().catch(err => {
            console.error('[OverworldMap] Failed to load Wesnoth Atlas:', err);
        }).finally(() => {
            setIsAtlasReady(wesnothAtlas.isReady());
        });
    }, []);

    useEffect(() => {
        if (!isAssetsLoaded) return;
        
        hexTileRenderer.clear();
        overworldChunkRenderer.clear();

        const currentExplored = exploredTiles?.[safeDimension] || new Set();
        const tiles = buildTerrainTiles({
            isLocal,
            townMapData,
            exploredKeys: currentExplored,
            dimension: safeDimension,
            clearedEncounters,
            playerPos,
            renderRadius: isLocal ? 0 : 9,
        });

        if (tiles.length === 0) return;

        tiles.forEach(tile => {
            hexTileRenderer.setTerrain(tile.q, tile.r, tile.terrain, tile.baseTerrain, tile.overlayTerrain);
        });

        const tileLookup = new Map(tiles.map(tile => [`${tile.q},${tile.r}`, tile] as const));
        hexTileRenderer.preloadTilesForViewport(
            playerPos.x,
            playerPos.y,
            1600,
            1200,
            HEX_SIZE,
            (q, r) => {
                const tile = tileLookup.get(`${q},${r}`);
                if (!tile) return null;
                return { terrain: tile.terrain, feature: tile.feature };
            }
        );

        overworldChunkRenderer.rebuild(tiles, isLocal);
    }, [isLocal, townMapData, exploredTiles, safeDimension, isAssetsLoaded, clearedEncounters, playerPos, isAtlasReady]);

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

        const camera = buildCameraState(playerPos, canvas.width, canvas.height, dpr, isLocal);
        const { zoom, playerPixelX: px, playerPixelY: py, offsetX, offsetY } = camera;

        // Fondo oscuro total
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.translate(offsetX, offsetY);

        overworldChunkRenderer.drawVisibleChunks(ctx, {
            minX: -offsetX - HEX_SIZE * 4,
            minY: -offsetY - HEX_SIZE * 4,
            maxX: -offsetX + canvas.width / zoom + HEX_SIZE * 4,
            maxY: -offsetY + canvas.height / zoom + HEX_SIZE * 4,
        });

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
        if (!isLocal && overworldEnemies && overworldEnemies.length > 0) {
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

    }, [playerPos, party, safeDimension, worldTime, isLocal, isAssetsLoaded, overworldEnemies]);

    useEffect(() => {
        let frameId: number;
        let lastTime = 0;
        const FRAME_INTERVAL = 1000 / 30;

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
                    const { q, r } = screenPointToHex(
                        e.clientX - rect.left,
                        e.clientY - rect.top,
                        canvas.width,
                        canvas.height,
                        dpr,
                        playerPos,
                        isLocal
                    );

                    inputManager.emit({
                        type: InputType.MOVE_TO,
                        q, r,
                        originalEvent: e
                    });

                    onMove(q, r);
                }}
            />
        </div>
    );
};

export default OverworldMap;
