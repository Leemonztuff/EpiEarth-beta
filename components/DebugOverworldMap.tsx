// @ts-nocheck
import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { WorldGenerator } from '../services/WorldGenerator';

const HEX_SIZE = 30;

export const DebugOverworldMap = () => {
    const [debug, setDebug] = useState('Initializing...');
    
    const playerPos = useGameStore(s => s.playerPos);
    const party = useGameStore(s => s.party);
    const dimension = useGameStore(s => s.dimension);
    const gameState = useGameStore(s => s.gameState);
    const exploredTiles = useGameStore(s => s.exploredTiles);
    const worldTime = useGameStore(s => s.worldTime);
    const movePlayerOverworld = useGameStore(s => s.movePlayerOverworld);
    
    const canvasRef = useRef(null);
    
    useEffect(() => {
        let msg = `gameState: ${gameState}, playerPos: ${JSON.stringify(playerPos)}, dimension: ${dimension}, party: ${party?.length}, explored: ${exploredTiles ? Object.keys(exploredTiles).length : 0}`;
        setDebug(msg);
    }, [gameState, playerPos, dimension, party, exploredTiles]);
    
    useEffect(() => {
        if (!canvasRef.current) return;
        if (!playerPos) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / dpr / 2;
        const centerY = canvas.height / dpr / 2;
        
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`@ (${playerPos.x}, ${playerPos.y})`, centerX, centerY - 20);
        
        const dimKey = dimension === 'UPSIDE_DOWN' ? 'UPSIDE_DOWN' : 'NORMAL';
        const explored = exploredTiles?.[dimKey];
        
        if (explored && explored.size > 0) {
            ctx.fillStyle = '#4a7a4a';
            explored.forEach(key => {
                const [q, r] = key.split(',').map(Number);
                const dx = (q - playerPos.x) * HEX_SIZE * 1.5;
                const dy = (r - playerPos.y) * HEX_SIZE * 1.7;
                const px = centerX + dx;
                const py = centerY + dy;
                
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = 2 * Math.PI / 6 * i - Math.PI / 2;
                    const hx = px + HEX_SIZE * 0.9 * Math.cos(angle);
                    const hy = py + HEX_SIZE * 0.9 * Math.sin(angle);
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.fill();
            });
        }
        
    }, [playerPos, dimension, exploredTiles]);
    
    const handleClick = useCallback((e) => {
        if (!playerPos || !movePlayerOverworld) return;
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const mapX = (clickX - centerX) / (HEX_SIZE * 1.5) + playerPos.x;
        const mapY = (clickY - centerY) / (HEX_SIZE * 1.7) + playerPos.y;
        
        const q = Math.round(mapX);
        const r = Math.round(mapY);
        
        const dist = Math.max(Math.abs(q - playerPos.x), Math.abs(r - playerPos.y));
        
        if (dist <= 3) {
            movePlayerOverworld(q, r);
        }
    }, [playerPos, movePlayerOverworld]);
    
    if (gameState !== 'OVERWORLD' && gameState !== 'TOWN_EXPLORATION' && gameState !== 'DUNGEON') {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center">
                <div className="text-white">Game State: {gameState}</div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black overflow-hidden">
            <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair"
                onClick={handleClick}
            />
            
            <div className="absolute top-4 left-4 bg-black/80 p-4 rounded-lg border border-white/20 max-w-md">
                <div className="text-white font-mono text-sm">
                    <div className="text-amber-400 font-bold mb-2">DEBUG INFO</div>
                    <div>{debug}</div>
                </div>
            </div>
            
            <div className="absolute top-4 right-4 bg-black/80 p-3 rounded-lg border border-white/20">
                <div className="text-white font-mono text-sm">
                    <div className="text-amber-400">🗺️ EpiEarth</div>
                    <div className="text-white/60">{dimension === 'UPSIDE_DOWN' ? 'Void Realm' : 'Mortal Realm'}</div>
                </div>
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded-full border border-white/20">
                <div className="text-white/60 text-sm">Click to move (range: 3)</div>
            </div>
        </div>
    );
};
