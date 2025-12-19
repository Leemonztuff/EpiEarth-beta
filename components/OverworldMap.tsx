
// @ts-nocheck
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { HexCell, TerrainType, WeatherType, Dimension, GameState, MovementType } from '../types';
import { HEX_SIZE, TERRAIN_COLORS, ASSETS, TERRAIN_MOVEMENT_COST } from '../constants';
import { useGameStore } from '../store/gameStore';
import { WorldGenerator } from '../services/WorldGenerator';
import { calculateVisionRange } from '../services/dndRules';

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
                    backgroundImage: 'url("https://cdn.jsdelivr.net/gh/wesnoth/wesnoth@master/data/core/images/weather/rain-heavy.png")',
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
    const cachedTilesSet = useRef<Set<string>>(new Set());
    
    const exploredTiles = useGameStore(s => s.exploredTiles);
    const party = useGameStore(s => s.party);
    const worldTime = useGameStore(s => s.worldTime);
    const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
    const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, terrain: string, cost: number } | null>(null);

    // Carga de assets de terreno
    useEffect(() => {
        if (!terrainCacheRef.current) {
            terrainCacheRef.current = document.createElement('canvas');
            terrainCacheRef.current.width = 6000; // Buffer más grande para evitar cortes
            terrainCacheRef.current.height = 6000;
        }
        
        const loaded: Record<string, HTMLImageElement> = {};
        let count = 0;
        const urls = Object.values(ASSETS.TERRAIN).filter(u => u);
        if (urls.length === 0) return;

        urls.forEach(url => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                loaded[url] = img;
                count++;
                if (count === urls.length) setImages({...loaded});
            };
            img.onerror = () => { count++; if (count === urls.length) setImages({...loaded}); };
        });
    }, []);

    // Actualización de cache de terreno (solo cuando se exploran nuevas celdas)
    useEffect(() => {
        const canvas = terrainCacheRef.current;
        if (!canvas || Object.keys(images).length === 0) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const currentExplored = exploredTiles[dimension] || new Set();

        currentExplored.forEach(key => {
            if (!cachedTilesSet.current.has(`${dimension}_${key}`)) {
                const [q, r] = key.split(',').map(Number);
                const tile = WorldGenerator.getTile(q, r, dimension);
                const { x, y } = hexToPixel(q, r);
                const cx = x + 3000; 
                const cy = y + 3000;
                
                // Dibujar Hexágono
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = 2 * Math.PI / 6 * i;
                    const hx = cx + HEX_SIZE * Math.cos(angle);
                    const hy = cy + HEX_SIZE * Math.sin(angle);
                    if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
                }
                ctx.closePath();

                const img = images[ASSETS.TERRAIN[tile.terrain]];
                if (img) {
                    ctx.save();
                    ctx.clip();
                    ctx.drawImage(img, cx - HEX_SIZE, cy - HEX_SIZE, HEX_SIZE * 2, HEX_SIZE * 2);
                    ctx.restore();
                } else {
                    ctx.fillStyle = TERRAIN_COLORS[tile.terrain] || '#444';
                    ctx.fill();
                }

                // Dibujar bordes sutiles (Wesnoth Style)
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.lineWidth = 0.5;
                ctx.stroke();

                // Dibujar POIs
                if (tile.poiType || tile.hasPortal) {
                    ctx.fillStyle = tile.hasPortal ? 'rgba(168, 85, 247, 0.4)' : 'rgba(251, 191, 36, 0.4)';
                    ctx.beginPath();
                    ctx.arc(cx, cy, HEX_SIZE * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                }

                cachedTilesSet.current.add(`${dimension}_${key}`);
            }
        });
    }, [exploredTiles, dimension, images]);

    // Renderizado principal (Loop)
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

        const zoom = 1.4;
        const { x: px, y: py } = hexToPixel(playerPos.x, playerPos.y);
        const offsetX = (canvas.width / (2 * dpr * zoom)) - px;
        const offsetY = (canvas.height / (2 * dpr * zoom)) - py;

        // 1. Limpiar Fondo
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.scale(zoom, zoom);
        ctx.translate(offsetX, offsetY);

        // 2. Dibujar Terreno desde el cache
        ctx.drawImage(terrainCacheRef.current, -3000, -3000);

        // 3. Sistema de Visión Dinámica (Fog of War Real)
        const leader = party[0];
        const visionRange = calculateVisionRange(leader.stats.attributes.WIS, leader.stats.corruption || 0);
        const visionPx = visionRange * HEX_SIZE * 1.5;

        // Oscurecer todo lo que NO está en visión
        ctx.save();
        ctx.beginPath();
        // Rectángulo gigante invertido para la niebla
        ctx.rect(-offsetX, -offsetY, canvas.width / zoom, canvas.height / zoom);
        ctx.arc(px, py, visionPx, 0, Math.PI * 2, true);
        ctx.clip();
        ctx.fillStyle = 'rgba(0, 0, 15, 0.6)';
        ctx.fillRect(-offsetX, -offsetY, canvas.width / zoom, canvas.height / zoom);
        ctx.restore();

        // 4. Dibujar al Jugador (Líder)
        // Sombra / Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = leader.visual.color;
        ctx.fillStyle = leader.visual.color;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Círculo blanco de precisión
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();

        // 5. Ciclo Día/Noche Overlay (Global)
        let timeOverlay = 'rgba(0,0,0,0)';
        if (worldTime < 300 || worldTime > 1300) timeOverlay = 'rgba(10, 10, 30, 0.4)'; // Noche
        else if (worldTime > 1100) timeOverlay = 'rgba(251, 146, 60, 0.15)'; // Atardecer
        
        if (timeOverlay !== 'rgba(0,0,0,0)') {
            ctx.fillStyle = timeOverlay;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // 6. Efecto de Viñeta táctica
        const grad = ctx.createRadialGradient(canvas.width/(2*dpr), canvas.height/(2*dpr), canvas.height/(4*dpr), canvas.width/(2*dpr), canvas.height/(2*dpr), canvas.width/(1.5*dpr));
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

    }, [playerPos, party, worldTime, exploredTiles, dimension]);

    useEffect(() => {
        let frameId = requestAnimationFrame(function loop() {
            render();
            frameId = requestAnimationFrame(loop);
        });
        return () => cancelAnimationFrame(frameId);
    }, [render]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const zoom = 1.4;
        const { x: px, y: py } = hexToPixel(playerPos.x, playerPos.y);
        
        const mx = (e.clientX - rect.left) / zoom - ((canvas.width / (2 * dpr * zoom)) - px);
        const my = (e.clientY - rect.top) / zoom - ((canvas.height / (2 * dpr * zoom)) - py);
        
        const { q, r } = pixelToAxial(mx, my);
        const tile = WorldGenerator.getTile(q, r, dimension);
        const cost = TERRAIN_MOVEMENT_COST[party[0].stats.movementType || MovementType.WALK][tile.terrain] || 1;
        
        setHoverInfo({ x: e.clientX, y: e.clientY, terrain: tile.terrain, cost });
    };

    const currentTile = WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);

    return (
        <div ref={containerRef} className="fixed inset-0 w-full h-full bg-slate-950 overflow-hidden">
            <WeatherOverlay type={currentTile.weather} dimension={dimension} />
            
            <canvas 
                ref={canvasRef} 
                className="w-full h-full cursor-crosshair touch-none" 
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoverInfo(null)}
                onClick={(e) => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    const zoom = 1.4;
                    const { x: px, y: py } = hexToPixel(playerPos.x, playerPos.y);
                    const mx = (e.clientX - rect.left) / zoom - ((canvas.width / (2 * dpr * zoom)) - px);
                    const my = (e.clientY - rect.top) / zoom - ((canvas.height / (2 * dpr * zoom)) - py);
                    const { q, r } = pixelToAxial(mx, my);
                    onMove(q, r);
                }}
            />

            {/* Tooltip táctico mejorado */}
            {hoverInfo && (
                <div 
                    className="fixed pointer-events-none bg-slate-900/95 backdrop-blur-md border border-amber-500/30 p-2.5 rounded-lg shadow-2xl z-[150] flex flex-col gap-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: hoverInfo.x + 20, top: hoverInfo.y - 20 }}
                >
                    <div className="flex items-center justify-between border-b border-white/10 pb-1 mb-1">
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Surveying</span>
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                    <div className="text-[11px] font-black text-white uppercase tracking-tight">{hoverInfo.terrain.replace('_', ' ')}</div>
                    <div className="flex justify-between items-center mt-1 bg-black/40 px-1.5 py-0.5 rounded">
                         <span className="text-[8px] font-bold text-slate-400">MOVE COST</span>
                         <span className={`text-[10px] font-mono font-bold ${hoverInfo.cost >= 3 ? 'text-red-400' : hoverInfo.cost >= 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {hoverInfo.cost >= 99 ? 'IMPASSABLE' : `${hoverInfo.cost} pts`}
                         </span>
                    </div>
                </div>
            )}

            <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-[120]">
                <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-amber-400 shadow-2xl flex items-center gap-2">
                    <span className="animate-pulse">🕒</span>
                    {Math.floor(worldTime / 60).toString().padStart(2, '0')}:{(worldTime % 60).toString().padStart(2, '0')}
                </div>
                <div className="bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[8px] font-black uppercase text-slate-400 border border-white/5 tracking-widest">
                    Dimension: <span className={dimension === Dimension.NORMAL ? 'text-blue-400' : 'text-purple-400'}>{dimension}</span>
                </div>
            </div>
        </div>
    );
};
