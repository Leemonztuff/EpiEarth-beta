// @ts-nocheck
import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { WorldGenerator } from '../services/WorldGenerator';
import { Dimension, WeatherType, GameState } from '../types';

const HEX_SIZE = 32;
const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;
const HORIZ_DIST = HEX_SIZE * 1.5;
const VERT_DIST = HEX_HEIGHT;

function hexToPixel(q, r) {
    return { x: q * HORIZ_DIST, y: (r + q / 2) * VERT_DIST };
}

function pixelToHex(x, y) {
    const q = (2 / 3 * x) / HEX_SIZE;
    const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_SIZE;
    return axialRound(q, r);
}

function axialRound(q, r) {
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(-q - r);
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - (-q - r));
    if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
    else if (rDiff > sDiff) rr = -rq - rs;
    return { q: rq, r: rr };
}

const TERRAIN_COLORS = {
    GRASS: '#3d6b3d',
    FOREST: '#2d5a27',
    WATER: '#1e3a5f',
    MOUNTAIN: '#5a5a5a',
    DESERT: '#8b7355',
    SNOW: '#d0e0e8',
    SWAMP: '#2a3a2a',
    LAVA: '#4a1a1a',
    ROAD: '#6b5a4b'
};

const SimpleHexTile = ({ x, y, terrain, isVisible, isPlayer }) => {
    const color = TERRAIN_COLORS[terrain] || '#444';
    
    return (
        <div
            className="absolute transition-all duration-200"
            style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${HEX_SIZE * 1.8}px`,
                height: `${HEX_SIZE * 2}px`,
                backgroundColor: isVisible ? color : '#0a0a0a',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                opacity: isVisible ? 1 : 0.3,
                border: isPlayer ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isPlayer ? '0 0 20px #fbbf24' : 'none'
            }}
        />
    );
};

export const SimpleOverworldMap = () => {
    const containerRef = useRef(null);
    const playerPos = useGameStore(s => s.playerPos);
    const party = useGameStore(s => s.party);
    const dimension = useGameStore(s => s.dimension) || 'NORMAL';
    const gameState = useGameStore(s => s.gameState);
    const exploredTiles = useGameStore(s => s.exploredTiles);
    const worldTime = useGameStore(s => s.worldTime) || 480;
    const movePlayerOverworld = useGameStore(s => s.movePlayerOverworld);
    
    const canvasRef = useRef(null);
    const [viewOffset, setViewOffset] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
    
    const tiles = useMemo(() => {
        const result = [];
        const centerQ = playerPos?.x || 0;
        const centerR = playerPos?.y || 0;
        const dimKey = dimension === 'UPSIDE_DOWN' ? 'UPSIDE_DOWN' : 'NORMAL';
        const explored = exploredTiles?.[dimKey] || new Set();
        
        for (let dq = -10; dq <= 10; dq++) {
            for (let dr = -10; dr <= 10; dr++) {
                const q = centerQ + dq;
                const r = centerR + dr;
                const key = `${q},${r}`;
                const isExplored = explored.has(key);
                
                if (isExplored) {
                    const tile = WorldGenerator.getTile(q, r, dimension);
                    result.push({
                        q, r,
                        terrain: tile?.terrain || 'GRASS',
                        isExplored: true,
                        isPlayer: q === centerQ && r === centerR
                    });
                }
            }
        }
        
        return result;
    }, [playerPos, dimension, exploredTiles]);

    useEffect(() => {
        if (!playerPos) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const scale = 1.5;
        
        tiles.forEach(tile => {
            const { x, y } = hexToPixel(tile.q - (playerPos.x || 0), tile.r - (playerPos.y || 0));
            const screenX = centerX + x * scale;
            const screenY = centerY + y * scale;
            
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = 2 * Math.PI / 6 * i - Math.PI / 2;
                const px = screenX + HEX_SIZE * scale * 0.9 * Math.cos(angle);
                const py = screenY + HEX_SIZE * scale * 0.9 * Math.sin(angle);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            
            ctx.fillStyle = TERRAIN_COLORS[tile.terrain] || '#444';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            if (tile.isPlayer) {
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        
    }, [tiles, playerPos]);

    const handleClick = useCallback((e) => {
        if (!playerPos || !movePlayerOverworld) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const mapX = (clickX - centerX) / 1.5 + playerPos.x;
        const mapY = (clickY - centerY) / 1.7 + playerPos.y;
        
        const { q, r } = pixelToHex(mapX, mapY);
        
        const dx = Math.abs(q - playerPos.x);
        const dy = Math.abs(r - playerPos.y);
        
        if (dx + dy <= 3) {
            movePlayerOverworld(q, r);
        }
    }, [playerPos, movePlayerOverworld]);

    if (gameState !== 'OVERWORLD' && gameState !== 'TOWN_EXPLORATION' && gameState !== 'DUNGEON') {
        return null;
    }

    return (
        <div ref={containerRef} className="fixed inset-0 bg-black overflow-hidden">
            <canvas
                ref={canvasRef}
                className="w-full h-full cursor-pointer"
                onClick={handleClick}
            />
            
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur p-3 rounded-lg border border-white/10">
                <div className="text-amber-400 font-mono text-sm">
                    {playerPos?.x || 0}, {playerPos?.y || 0}
                </div>
                <div className="text-white/50 text-xs">
                    {dimension === 'UPSIDE_DOWN' ? '🏛️ Void Realm' : '🌍 Mortal Realm'}
                </div>
            </div>
            
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur p-2 rounded-lg border border-white/10">
                <div className="text-white/60 text-xs">
                    Click to move (range: 3)
                </div>
            </div>
            
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur p-2 rounded-lg border border-white/10">
                <div className="text-white/60 text-xs">
                    ⏰ {Math.floor(worldTime / 60)}:{(worldTime % 60).toString().padStart(2, '0')}
                </div>
            </div>
        </div>
    );
};
