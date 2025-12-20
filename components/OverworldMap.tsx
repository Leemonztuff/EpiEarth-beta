
// @ts-nocheck
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { HexCell, TerrainType, WeatherType, Dimension, GameState, MovementType } from '../types';
import { HEX_SIZE, TERRAIN_COLORS, ASSETS, TERRAIN_MOVEMENT_COST } from '../constants';
import { useGameStore } from '../store/gameStore';
import { WorldGenerator } from '../services/WorldGenerator';
import { calculateVisionRange } from '../services/dndRules';
import { AssetManager } from '../services/AssetManager';

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

export const OverworldMap = ({ playerPos, onMove, dimension }: any) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const terrainCacheRef = useRef<HTMLCanvasElement>(null);
    
    const exploredTiles = useGameStore(s => s.exploredTiles);
    const party = useGameStore(s => s.party);
    const worldTime = useGameStore(s => s.worldTime);
    const gameState = useGameStore(s => s.gameState);
    const townMapData = useGameStore(s => s.townMapData);
    const isAssetsLoaded = useGameStore(s => s.isAssetsLoaded);

    const isLocal = gameState === GameState.TOWN_EXPLORATION || gameState === GameState.DUNGEON;
    const hours = Math.floor(worldTime / 60);
    const isNight = hours < 6 || hours >= 22;

    useEffect(() => {
        if (!isAssetsLoaded) return;
        
        if (!terrainCacheRef.current) {
            terrainCacheRef.current = document.createElement('canvas');
            terrainCacheRef.current.width = 8000; 
            terrainCacheRef.current.height = 8000;
        }

        const canvas = terrainCacheRef.current;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        ctx.clearRect(0,0,8000,8000);

        const drawLoop = (tiles) => {
            tiles.forEach(tile => {
                const { x, y } = hexToPixel(tile.q, tile.r);
                drawWesnothHex(ctx, x + 4000, y + 4000, tile);
            });
        };

        if (isLocal && townMapData) {
            drawLoop(townMapData);
        } else {
            const currentExplored = exploredTiles[dimension] || new Set();
            const tilesToDraw = Array.from(currentExplored).map(key => {
                const [q, r] = key.split(',').map(Number);
                return WorldGenerator.getTile(q, r, dimension);
            });
            drawLoop(tilesToDraw);
        }
    }, [isLocal, townMapData, exploredTiles, dimension, isAssetsLoaded]);

    const drawWesnothHex = (ctx, cx, cy, tile) => {
        const s = HEX_SIZE;
        const terrainPath = ASSETS.TERRAIN[tile.terrain];
        const img = AssetManager.getAsset(terrainPath);

        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = 2 * Math.PI / 6 * i;
            ctx.lineTo(cx + s * 1.05 * Math.cos(angle), cy + s * 1.05 * Math.sin(angle));
        }
        ctx.closePath();
        ctx.clip();

        if (img) {
            const imgSize = s * 2.3; 
            ctx.drawImage(img, cx - imgSize/2, cy - imgSize/2, imgSize, imgSize);
        } else {
            ctx.fillStyle = TERRAIN_COLORS[tile.terrain] || '#444';
            ctx.fill();
        }
        ctx.restore();

        // Profundidad
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

        // Estructuras y Portales
        const poiType = tile.poiType || (tile.hasPortal ? 'PORTAL' : null);
        if (poiType && ASSETS.STRUCTURES[poiType]) {
            const structImg = AssetManager.getAsset(ASSETS.STRUCTURES[poiType]);
            if (structImg) {
                const ss = s * 1.8;
                if (tile.hasPortal) {
                     ctx.shadowBlur = 15;
                     ctx.shadowColor = '#a855f7';
                }
                ctx.drawImage(structImg, cx - ss/2, cy - ss/1.2, ss, ss);
                ctx.shadowBlur = 0;
            }
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
    };

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !playerPos || !party?.[0]) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

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
        const visionRange = calculateVisionRange(leader.stats.attributes.WIS, leader.stats.corruption || 0, worldTime, dimension);
        const visionPx = visionRange * HEX_SIZE * 1.5;

        // MÁSCARA DE OSCURIDAD (Noche o Vacío)
        const needsDarkness = isNight || dimension === Dimension.UPSIDE_DOWN;
        if (needsDarkness) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(-offsetX, -offsetY, canvas.width / zoom, canvas.height / zoom);
            ctx.arc(px, py, visionPx, 0, Math.PI * 2, true);
            ctx.clip();
            ctx.fillStyle = dimension === Dimension.UPSIDE_DOWN ? 'rgba(10, 5, 25, 0.92)' : 'rgba(0, 5, 15, 0.85)';
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
            const s = HEX_SIZE * 1.5;
            const bounce = Math.sin(Date.now() / 250) * 3;
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.drawImage(playerImg, px - s/2, py - s + 5 + bounce, s, s);
            ctx.restore();
        }

        ctx.restore();

    }, [playerPos, party, exploredTiles, dimension, worldTime, isLocal, townMapData, isAssetsLoaded]);

    useEffect(() => {
        let frameId = requestAnimationFrame(function loop() {
            render();
            frameId = requestAnimationFrame(loop);
        });
        return () => cancelAnimationFrame(frameId);
    }, [render]);

    return (
        <div ref={containerRef} className="fixed inset-0 w-full h-full bg-[#0a0d14] overflow-hidden">
            {!isLocal && <WeatherOverlay type={WorldGenerator.getTile(playerPos.x, playerPos.y, dimension).weather} dimension={dimension} />}
            <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]" />
            <canvas 
                ref={canvasRef} 
                className="w-full h-full cursor-crosshair touch-none" 
                onClick={(e) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    const zoom = isLocal ? 2.5 : 1.8;
                    const { x: px, y: py } = hexToPixel(playerPos.x, playerPos.y);
                    const mx = (e.clientX - rect.left) / zoom - ((canvas.width / (2 * dpr * zoom)) - px);
                    const my = (e.clientY - rect.top) / zoom - ((canvas.height / (2 * dpr * zoom)) - py);
                    const { q, r } = pixelToAxial(mx, my);
                    onMove(q, r);
                }}
            />
        </div>
    );
};
