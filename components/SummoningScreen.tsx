
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameState, ItemRarity } from '../types';
import { CLASS_CONFIG, RACE_ICONS, RARITY_COLORS, getSprite } from '../constants';
import { sfx } from '../services/SoundSystem';
import { SummoningService, SummonResult } from '../services/SummoningService';

export const SummoningScreen: React.FC = () => {
    const { setGameState, summonCharacter, spendGold, gold, hasHighPotentialSummon } = useGameStore();
    const [phase, setPhase] = useState<'SCAN' | 'DECODING' | 'RESULT'>('SCAN');
    const [cameraActive, setCameraActive] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    const [scanLines, setScanLines] = useState<string[]>([]);
    const [entropyLevel, setEntropyLevel] = useState(0);
    const [capturedSeed, setCapturedSeed] = useState('');
    const [summonResult, setSummonResult] = useState<SummonResult | null>(null);

    const STABILIZE_COST = 100;

    const initializeCamera = async () => {
        setPermissionDenied(false);
        try {
            sfx.playUiClick();
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Camera API not supported");
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            } catch (err) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
            streamRef.current = stream;
            setCameraActive(true);
        } catch (err) {
            setPermissionDenied(true);
            sfx.playUiHover();
        }
    };

    useEffect(() => {
        if (cameraActive && videoRef.current && streamRef.current) {
            const video = videoRef.current;
            video.srcObject = streamRef.current;
            video.play().catch(e => console.error("Auto-play error", e));
        }
    }, [cameraActive]);

    useEffect(() => {
        return () => { if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); };
    }, []);

    useEffect(() => {
        if (phase === 'SCAN') {
            const interval = window.setInterval(() => {
                if (cameraActive && videoRef.current && canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx && videoRef.current.readyState === 4) {
                        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                        const frame = ctx.getImageData(150, 110, 20, 20);
                        let brightnessSum = 0;
                        for(let i=0; i<frame.data.length; i+=4) brightnessSum += frame.data[i];
                        const avg = brightnessSum / (frame.data.length / 4);
                        const variation = Math.abs(avg - 127); 
                        setEntropyLevel(Math.min(100, Math.floor((variation / 127) * 100) + 20));
                    }
                } else if (!cameraActive) {
                    setEntropyLevel(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.4) * 10)));
                }
                if (Math.random() > 0.7) {
                    const hex = Math.floor(Math.random()*16777215).toString(16).toUpperCase();
                    setScanLines(prev => [`> SIGNAL: ${hex.slice(0,6)}`, ...prev.slice(0, 5)]);
                }
            }, 100);
            return () => window.clearInterval(interval);
        }
    }, [phase, cameraActive]);

    const handleCapture = () => {
        let finalSeed = '';
        if (cameraActive && videoRef.current && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                canvasRef.current.width = 640;
                canvasRef.current.height = 480;
                ctx.drawImage(videoRef.current, 0, 0, 640, 480);
                const data = ctx.getImageData(0,0,640,480).data;
                const samples = [];
                for(let i=0; i<data.length; i+=1000) samples.push(data[i]);
                finalSeed = samples.join('');
            }
        } else {
            finalSeed = Date.now().toString() + Math.random().toString();
        }
        setCapturedSeed(finalSeed);
        setSummonResult(SummoningService.generateFromSeed(finalSeed, hasHighPotentialSummon));
        sfx.playMagic();
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        setCameraActive(false);
        setPhase('DECODING');
    };

    const handleSummonAction = (method: 'FORCE' | 'STABILIZE') => {
        if (method === 'STABILIZE') {
            if (gold < STABILIZE_COST) { sfx.playUiHover(); return; }
            spendGold(STABILIZE_COST);
        }
        summonCharacter(capturedSeed, method);
        setPhase('RESULT');
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col font-mono overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ 
                backgroundImage: `linear-gradient(${hasHighPotentialSummon ? 'rgba(234, 179, 8, 0.2)' : 'rgba(168, 85, 247, 0.2)'} 1px, transparent 1px), linear-gradient(90deg, ${hasHighPotentialSummon ? 'rgba(234, 179, 8, 0.2)' : 'rgba(168, 85, 247, 0.2)'} 1px, transparent 1px)`, 
                backgroundSize: '40px 40px' 
            }} />

            <div className="p-4 md:p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black to-transparent shrink-0">
                <h1 className={`text-xl md:text-2xl font-bold flex items-center gap-3 ${hasHighPotentialSummon ? 'text-amber-400' : 'text-purple-400'}`}>
                    <span className="animate-pulse">{hasHighPotentialSummon ? '🌟' : '👁️'}</span> 
                    {hasHighPotentialSummon ? 'SACRED RITUAL' : 'SOUL RITUAL'}
                </h1>
                {hasHighPotentialSummon && <span className="bg-amber-900/50 text-amber-300 border border-amber-500 px-3 py-1 rounded-full text-[10px] font-bold animate-bounce shadow-[0_0_10px_rgba(245,158,11,0.5)]">DUNGEON REWARD ACTIVE</span>}
                <button onClick={() => setGameState(GameState.TEMPLE_HUB)} className="text-slate-500 hover:text-white border border-slate-700 px-3 py-1 md:px-4 md:py-2 rounded uppercase text-[10px] md:text-xs font-bold hover:bg-slate-900 transition-colors">Abort</button>
            </div>

            {phase === 'SCAN' && (
                <div className="flex-1 flex flex-col items-center justify-center relative p-4">
                    <div className={`relative w-full max-w-md aspect-square bg-black border-2 rounded-lg overflow-hidden shadow-2xl ${hasHighPotentialSummon ? 'border-amber-600 shadow-amber-900/20' : 'border-slate-800 shadow-purple-900/20'}`}>
                        {cameraActive ? (
                            <video ref={videoRef} className={`w-full h-full object-cover opacity-60 filter contrast-125 saturate-0 sepia-[0.5] ${hasHighPotentialSummon ? 'hue-rotate-[20deg]' : 'hue-rotate-[270deg]'}`} autoPlay playsInline muted />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/50">
                                <div className="text-6xl mb-4 opacity-20 animate-pulse">📷</div>
                                {!permissionDenied ? (
                                    <button onClick={initializeCamera} className={`px-6 py-2 border rounded text-xs md:text-sm font-bold tracking-wider relative z-10 ${hasHighPotentialSummon ? 'border-amber-500 text-amber-400' : 'border-purple-500 text-purple-400'}`}>INITIALIZE OPTICS</button>
                                ) : (
                                    <button onClick={handleCapture} className="text-slate-400 text-xs underline">Aether Static Simulation</button>
                                )}
                            </div>
                        )}
                        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                            <div className="flex justify-between">
                                <div className={`w-8 h-8 border-t-2 border-l-2 ${hasHighPotentialSummon ? 'border-amber-500' : 'border-purple-500/50'}`} />
                                <div className={`w-8 h-8 border-t-2 border-r-2 ${hasHighPotentialSummon ? 'border-amber-500' : 'border-purple-500/50'}`} />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className={`w-32 h-32 border rounded-full flex items-center justify-center transition-all duration-300 ${hasHighPotentialSummon ? 'border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)] scale-110' : 'border-purple-500/30'}`} />
                            </div>
                            <div className="flex justify-between">
                                <div className={`w-8 h-8 border-b-2 border-l-2 ${hasHighPotentialSummon ? 'border-amber-500' : 'border-purple-500/50'}`} />
                                <div className={`w-8 h-8 border-b-2 border-r-2 ${hasHighPotentialSummon ? 'border-amber-500' : 'border-purple-500/50'}`} />
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-md">
                        <button onClick={handleCapture} className={`font-bold text-lg px-12 py-4 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3 w-full justify-center disabled:opacity-50 ${hasHighPotentialSummon ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/30' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/30'}`}>
                            <span>{hasHighPotentialSummon ? '🌟' : '🔮'}</span> MANIFEST {hasHighPotentialSummon ? 'SACRED' : 'SOUL'}
                        </button>
                    </div>
                </div>
            )}

            {phase === 'DECODING' && summonResult && (
                <div className="flex-1 w-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 p-6 overflow-y-auto">
                    <h2 className="text-3xl font-serif text-white mb-8 text-center">Fated Hero</h2>
                    <div className={`relative bg-slate-900 border-2 rounded-xl p-8 w-full max-w-md shadow-2xl flex flex-col items-center gap-6`} style={{ borderColor: RARITY_COLORS[summonResult.rarity] }}>
                        <div className="absolute inset-0 blur-xl opacity-20 z-0" style={{ backgroundColor: RARITY_COLORS[summonResult.rarity] }} />
                        <div className="relative z-10 w-32 h-32 bg-black rounded-full border-4 border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                            <img src={CLASS_CONFIG[summonResult.class].icon} className="w-20 h-20 opacity-90" onError={e => { e.currentTarget.src = getSprite(summonResult.race, summonResult.class); }} />
                        </div>
                        <div className="z-10 text-center space-y-2">
                            <div className="px-3 py-1 rounded border bg-black/50 inline-block" style={{ borderColor: RARITY_COLORS[summonResult.rarity], color: RARITY_COLORS[summonResult.rarity] }}>
                                <span className="text-xs font-bold uppercase tracking-widest">{summonResult.rarity}</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white mt-2">{summonResult.name}</h3>
                            <p className="text-slate-400 text-sm">{summonResult.race} {summonResult.class}</p>
                        </div>
                        <div className="z-10 grid grid-cols-2 gap-4 w-full bg-black/40 p-4 rounded-lg">
                            <div className="text-center"><div className="text-[10px] text-slate-500 uppercase font-bold">Affinity</div><div className="text-base text-amber-300 font-bold">{summonResult.affinity}</div></div>
                            <div className="text-center"><div className="text-[10px] text-slate-500 uppercase font-bold">Potential</div><div className="text-base text-purple-300 font-bold">{summonResult.potential}/100</div></div>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-8 w-full max-w-md shrink-0 mb-4">
                        <button onClick={() => handleSummonAction('FORCE')} className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-200 py-4 rounded-lg font-bold uppercase text-xs">Force Bond</button>
                        <button onClick={() => handleSummonAction('STABILIZE')} disabled={gold < STABILIZE_COST} className={`flex-1 border py-4 rounded-lg font-bold uppercase text-xs transition-all ${gold >= STABILIZE_COST ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Stabilize ({STABILIZE_COST}G)</button>
                    </div>
                </div>
            )}

            {phase === 'RESULT' && (
                <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-150 duration-700 bg-white/5 p-4 text-center">
                    <div className="text-6xl mb-6 animate-bounce">✨</div>
                    <h2 className="text-4xl font-black text-white tracking-widest">SUMMON COMPLETE</h2>
                    <p className="mt-4 text-slate-300">The bond is sealed. Manage your party in the Temple Hub.</p>
                    <button onClick={() => setGameState(GameState.TEMPLE_HUB)} className="mt-12 text-slate-400 hover:text-white underline text-base">Return to Sanctuary</button>
                </div>
            )}
        </div>
    );
};
