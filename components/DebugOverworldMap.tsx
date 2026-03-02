// @ts-nocheck
import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { WorldGenerator } from '../services/WorldGenerator';
import { GameState, Dimension } from '../types';

const HEX_SIZE = 30;

class ErrorBoundary extends React.Component<{children:React.ReactNode}, {hasError:boolean}> {
    constructor(props: {children:React.ReactNode}) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(e: Error, info: React.ErrorInfo) {
        console.error('[DebugOverworldMap Error]', e, info);
    }
    render() {
        if (this.state.hasError) return <div className="text-red-500 p-8">Error in OverworldMap</div>;
        return this.props.children;
    }
}

export const DebugOverworldMap = () => {
    const [debug, setDebug] = useState('Initializing...');
    const [renderCount, setRenderCount] = useState(0);
    
    const playerPos = useGameStore(s => s.playerPos);
    const party = useGameStore(s => s.party);
    const dimension = useGameStore(s => s.dimension);
    const gameState = useGameStore(s => s.gameState);
    const exploredTiles = useGameStore(s => s.exploredTiles);
    const worldTime = useGameStore(s => s.worldTime);
    const movePlayerOverworld = useGameStore(s => s.movePlayerOverworld);
    
    const canvasRef = useRef(null);
    
    useEffect(() => {
        setRenderCount(c => c + 1);
        console.log('[DebugOverworldMap] Render:', { gameState, playerPos, dimension, partyLength: party?.length });
        let msg = `Render #${renderCount + 1} | gameState: ${gameState} | pos: ${JSON.stringify(playerPos)} | dim: ${dimension} | party: ${party?.length}`;
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
        
        const dimKey = dimension === Dimension.UPSIDE_DOWN ? Dimension.UPSIDE_DOWN : Dimension.NORMAL;
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
    
    useEffect(() => {
        console.log('[DebugOverworldMap] State:', { 
            playerPos, 
            dimension, 
            exploredTiles: exploredTiles ? Object.keys(exploredTiles) : null,
            party: party?.length 
        });
    }, [playerPos, dimension, exploredTiles, party]);
    
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
    
    // DEBUG: Always render for now to test
    // if (gameState !== GameState.OVERWORLD && gameState !== GameState.TOWN_EXPLORATION && gameState !== GameState.DUNGEON) {
    //     return (
    //         <ErrorBoundary>
    //             <div className="fixed inset-0 bg-black flex items-center justify-center">
    //                 <div className="text-white">Game State: {gameState}</div>
    //             </div>
    //         </ErrorBoundary>
    //     );
    // }
    
    return (
        <ErrorBoundary>
            <div style={{ position: 'fixed', inset: 0, backgroundColor: '#1a1a2e', overflow: 'hidden', zIndex: 200 }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#fbbf24', fontSize: 24, fontWeight: 'bold', border: '4px solid #fbbf24', padding: 20 }}>
                    DEBUG OVERWORLD MAP RENDERED
                    <br/>
                    <span style={{fontSize: 14}}>gameState: {gameState}</span>
                </div>
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair"
                    onClick={handleClick}
                />
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
                    <div className="text-white/60">{dimension === Dimension.UPSIDE_DOWN ? 'Void Realm' : 'Mortal Realm'}</div>
                </div>
            </div>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded-full border border-white/20">
                <div className="text-white/60 text-sm">Click to move (range: 3)</div>
            </div>
        </div>
        </ErrorBoundary>
    );
};
