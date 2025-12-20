
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
            <div className={`absolute inset-0 transition-colors duration-1000 ${isShadow ? 'bg-indigo-950/30' : 'bg-transparent'}`} />
            {type === WeatherType.RAIN && (
                <div className="absolute inset-0 opacity-40" style={{ 
                    backgroundImage: `url("${AssetManager.getSafeSprite(ASSETS.VFX.RAIN)}")`,
                    backgroundRepeat: 'repeat',
                    animation: 'fall 0.5s linear infinite'
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
    const incursions = useGameStore(s => s.incursions);
    const gameState = useGameStore(s => s.gameState);
    const townMapData = useGameStore(s => s.townMapData);
    const isAssetsLoaded = useGameStore(s => s.isAssetsLoaded);

    const isTown = gameState === GameState.TOWN_EXPLORATION;

    useEffect(() => {
        if (!isAssetsLoaded) return;
        
        if (!terrainCacheRef.current) {
            terrainCacheRef.current = document.createElement('canvas');
            terrainCacheRef.current.width = 6000; 
            terrainCacheRef.current.height = 6000;
        }

        const canvas = terrainCacheRef.current;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        ctx.clearRect(0,0,6000,6000);

        if (isTown && townMapData) {
            townMapData.forEach(tile => {
                const { x, y } = hexToPixel(tile.q, tile.r);
                drawHex(ctx, x + 3000, y + 3000, tile);
            });
        } else {
            const currentExplored = exploredTiles[dimension] || new Set();
            currentExplored.forEach(key => {
                const [q, r] = key.split(',').map(Number);
                const tile = WorldGenerator.getTile(q, r, dimension);
                const { x, y } = hexToPixel(q, r);
                drawHex(ctx, x + 3000, y + 3000, tile);
            });
        }
    }, [isTown, townMapData, exploredTiles, dimension, isAssetsLoaded]);

    const drawHex = (ctx, cx, cy, tile) => {
        // Dibujar Geometría Hexagonal
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = 2 * Math.PI / 6 * i;
            const hx = cx + HEX_SIZE * Math.cos(angle);
            const hy = cy + HEX_SIZE * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.closePath();

        // 1. Dibujar Terreno Base
        const terrainPath = ASSETS.TERRAIN[tile.terrain];
        const img = AssetManager.getAsset(terrainPath);

        if (img) {
            ctx.save();
            ctx.clip();
            ctx.drawImage(img, cx - HEX_SIZE, cy - HEX_SIZE, HEX_SIZE * 2, HEX_SIZE * 2);
            ctx.restore();
        } else {
            ctx.fillStyle = TERRAIN_COLORS[tile.terrain] || '#444';
            ctx.fill();
        }

        // 2. Dibujar Estructura (POI) si existe
        const poiType = tile.poiType || (tile.hasPortal ? 'PORTAL' : null);
        if (poiType && ASSETS.STRUCTURES[poiType]) {
            const structImg = AssetManager.getAsset(ASSETS.STRUCTURES[poiType]);
            if (structImg) {
                ctx.save();
                const s = HEX_SIZE * 1.4;
                ctx.drawImage(structImg, cx - s/2, cy - s/2, s, s);
                ctx.restore();
            }
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Iconos de interacción en ciudades
        if (isTown && tile.poiType) {
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const icons = { SHOP: '🛒', INN: '🍺', PLAZA: '🏛️', EXIT: '🚪' };
            if (icons[tile.poiType]) {
                ctx.fillStyle = 'white';
                ctx.fillText(icons[tile.poiType], cx, cy + 10);
            }
        }
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

        const zoom = isTown ? 2.0 : 1.4;
        const { x: px, y: py } = hexToPixel(playerPos.x, playerPos.y);
        const offsetX = (canvas.width / (2 * dpr * zoom)) - px;
        const offsetY = (canvas.height / (2 * dpr * zoom)) - py;

        ctx.fillStyle = isTown ? '#1e293b' : '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.translate(offsetX, offsetY);

        if (terrainCacheRef.current) {
            ctx.drawImage(terrainCacheRef.current, -3000, -3000);
        }

        if (!isTown && dimension === Dimension.NORMAL) {
            Object.values(incursions).forEach(inc => {
                const { x, y } = hexToPixel(inc.q, inc.r);
                const pulse = 1 + Math.sin(Date.now() / 300) * 0.2;
                ctx.shadowBlur = 20 * pulse;
                ctx.shadowColor = '#a855f7';
                ctx.fillStyle = 'rgba(168, 85, 247, 0.7)';
                ctx.beginPath();
                ctx.arc(x, y, 12 * pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        }

        const leader = party[0];
        
        if (!isTown) {
            const visionRange = calculateVisionRange(leader.stats.attributes.WIS, leader.stats.corruption || 0);
            const visionPx = visionRange * HEX_SIZE * 1.5;
            ctx.save();
            ctx.beginPath();
            ctx.rect(-offsetX, -offsetY, canvas.width / zoom, canvas.height / zoom);
            ctx.arc(px, py, visionPx, 0, Math.PI * 2, true);
            ctx.clip();
            ctx.fillStyle = 'rgba(0, 0, 15, 0.6)';
            ctx.fillRect(-offsetX, -offsetY, canvas.width / zoom, canvas.height / zoom);
            ctx.restore();
        }

        const playerImg = AssetManager.getAsset(leader.visual.spriteUrl);
        if (playerImg) {
            ctx.save();
            const s = HEX_SIZE * 1.2;
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.drawImage(playerImg, px - s/2, py - s + 5, s, s);
            ctx.restore();
        } else {
            ctx.shadowBlur = 20;
            ctx.shadowColor = leader.visual.color;
            ctx.fillStyle = leader.visual.color;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();

    }, [playerPos, party, worldTime, exploredTiles, dimension, incursions, isTown, townMapData, isAssetsLoaded]);

    useEffect(() => {
        let frameId = requestAnimationFrame(function loop() {
            render();
            frameId = requestAnimationFrame(loop);
        });
        return () => cancelAnimationFrame(frameId);
    }, [render]);

    return (
        <div ref={containerRef} className="fixed inset-0 w-full h-full bg-slate-950 overflow-hidden">
            {!isTown && <WeatherOverlay type={WorldGenerator.getTile(playerPos.x, playerPos.y, dimension).weather} dimension={dimension} />}
            
            <canvas 
                ref={canvasRef} 
                className="w-full h-full cursor-crosshair touch-none" 
                onClick={(e) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    const zoom = isTown ? 2.0 : 1.4;
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
