
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameState, ItemRarity } from '../types';
import { CLASS_CONFIG, RACE_ICONS, RARITY_COLORS, getSprite } from '../constants';
import { sfx } from '../services/SoundSystem';
import { SummoningService, SummonResult, SummonInfluence } from '../services/SummoningService';

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
    const [colorInfluence, setColorInfluence] = useState<SummonInfluence>({ r: 0, g: 0, b: 0 });
    const [capturedSeed, setCapturedSeed] = useState('');
    const [summonResult, setSummonResult] = useState<SummonResult | null>(null);

    const STABILIZE_COST = 100;

    const initializeCamera = async () => {
        setPermissionDenied(false);
        try {
            sfx.playUiClick();
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Camera API not supported");
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: "environment",
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });
            streamRef.current = stream;
            setCameraActive(true);
        } catch (err) {
            setPermissionDenied(true);
            sfx.playUiHover();
        }
    };

    useEffect(() => {
        if (cameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [cameraActive]);

    useEffect(() => {
        if (phase === 'SCAN') {
            const interval = window.setInterval(() => {
                if (cameraActive && videoRef.current && canvasRef.current) {
                    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
                    if (ctx && videoRef.current.readyState === 4) {
                        ctx.drawImage(videoRef.current, 0, 0, 320, 240);
                        const frame = ctx.getImageData(110, 70, 100, 100);
                        let r = 0, g = 0, b = 0;
                        for(let i=0; i<frame.data.length; i+=4) {
                            r += frame.data[i];
                            g += frame.data[i+1];
                            b += frame.data[i+2];
                        }
                        const count = frame.data.length / 4;
                        const avgR = r/count; const avgG = g/count; const avgB = b/count;
                        setColorInfluence({ r: avgR, g: avgG, b: avgB });
                        
                        const brightness = (avgR + avgG + avgB) / 3;
                        setEntropyLevel(Math.min(100, Math.floor(Math.abs(brightness - 127) / 127 * 100) + 10));
                    }
                } else if (!cameraActive) {
                    setEntropyLevel(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.4) * 5)));
                }
                if (Math.random() > 0.8) {
                    setScanLines(prev => [`> SPECTRAL: ${Math.random().toString(16).slice(2,8).toUpperCase()}`, ...prev.slice(0, 3)]);
                }
            }, 100);
            return () => window.clearInterval(interval);
        }
    }, [phase, cameraActive]);

    const handleCapture = () => {
        setCapturedSeed(Date.now().toString() + Math.random().toString());
        setSummonResult(SummoningService.generateFromSeed(capturedSeed, hasHighPotentialSummon, colorInfluence));
        sfx.playMagic();
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        setCameraActive(false);
        setPhase('DECODING');
    };

    const handleSummonAction = (method: 'FORCE' | 'STABILIZE') => {
        if (method === 'STABILIZE' && !spendGold(STABILIZE_COST)) { sfx.playUiHover(); return; }
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
                <button onClick={() => setGameState(GameState.TEMPLE_HUB)} className="text-slate-500 hover:text-white border border-slate-700 px-3 py-1 rounded uppercase text-[10px] font-bold">Abort</button>
            </div>

            {phase === 'SCAN' && (
                <div className="flex-1 flex flex-col items-center justify-center relative p-4">
                    <div className={`relative w-full max-w-sm aspect-square bg-black border-2 rounded-lg overflow-hidden shadow-2xl ${hasHighPotentialSummon ? 'border-amber-600 shadow-amber-900/20' : 'border-slate-800 shadow-purple-900/20'}`}>
                        {cameraActive ? (
                            <video ref={videoRef} className="w-full h-full object-cover opacity-80" autoPlay playsInline muted />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/50">
                                <div className="text-5xl mb-4 opacity-20">📷</div>
                                <button onClick={initializeCamera} className="px-6 py-2 border border-purple-500 text-purple-400 rounded text-xs font-bold tracking-widest">INITIALIZE OPTICS</button>
                            </div>
                        )}
                        {/* Overlay FX */}
                        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    {scanLines.map((line, i) => <div key={i} className="text-[8px] text-green-500 opacity-60">{line}</div>)}
                                </div>
                                <div className="text-[10px] text-purple-400 font-bold bg-black/40 px-2 py-1 rounded border border-purple-500/20">ENTROPY: {entropyLevel}%</div>
                            </div>
                            <div className="flex justify-center mb-10">
                                <div className="w-48 h-48 border-2 border-white/10 rounded-full flex items-center justify-center">
                                    <div className="w-32 h-32 border border-white/20 rounded-full animate-ping" />
                                </div>
                            </div>
                            {/* Color Bars Influence UI */}
                            <div className="flex gap-2 h-1 bg-white/5 rounded overflow-hidden">
                                <div className="bg-red-500 transition-all duration-300" style={{ width: `${(colorInfluence.r / 255) * 100}%` }} />
                                <div className="bg-green-500 transition-all duration-300" style={{ width: `${(colorInfluence.g / 255) * 100}%` }} />
                                <div className="bg-blue-500 transition-all duration-300" style={{ width: `${(colorInfluence.b / 255) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 flex flex-col items-center gap-6 w-full max-w-sm">
                        <div className="flex w-full gap-4 text-center">
                            <div className="flex-1"><div className="text-[8px] text-slate-500 uppercase">Red/Strength</div><div className="font-mono text-xs text-red-500">{(colorInfluence.r/2.55).toFixed(0)}%</div></div>
                            <div className="flex-1 border-x border-white/5"><div className="text-[8px] text-slate-500 uppercase">Green/Nature</div><div className="font-mono text-xs text-green-500">{(colorInfluence.g/2.55).toFixed(0)}%</div></div>
                            <div className="flex-1"><div className="text-[8px] text-slate-500 uppercase">Blue/Magic</div><div className="font-mono text-xs text-blue-500">{(colorInfluence.b/2.55).toFixed(0)}%</div></div>
                        </div>
                        <button onClick={handleCapture} className={`font-bold text-base px-12 py-4 rounded-full shadow-2xl transition-all transform active:scale-95 flex items-center gap-3 w-full justify-center ${hasHighPotentialSummon ? 'bg-amber-600 text-white' : 'bg-purple-600 text-white'}`}>
                            <span>MANIFEST SOUL</span>
                        </button>
                    </div>
                </div>
            )}

            {phase === 'DECODING' && summonResult && (
                <div className="flex-1 w-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500 p-6 overflow-y-auto">
                    <h2 className="text-2xl font-serif text-white mb-6">Spectral Resonance</h2>
                    <div className={`relative bg-slate-900 border-2 rounded-xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center gap-4`} style={{ borderColor: RARITY_COLORS[summonResult.rarity] }}>
                        <div className="absolute inset-0 blur-2xl opacity-10 z-0" style={{ backgroundColor: RARITY_COLORS[summonResult.rarity] }} />
                        <div className="relative z-10 w-24 h-24 bg-black rounded-full border-2 border-slate-700 overflow-hidden flex items-center justify-center">
                            <img src={getSprite(summonResult.race, summonResult.class)} className="w-16 h-16 pixelated" />
                        </div>
                        <div className="z-10 text-center">
                            <div className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-black/40 border inline-block" style={{ color: RARITY_COLORS[summonResult.rarity], borderColor: RARITY_COLORS[summonResult.rarity] }}>{summonResult.rarity}</div>
                            <h3 className="text-xl font-bold text-white mt-2">{summonResult.name}</h3>
                            <p className="text-slate-400 text-xs">{summonResult.race} {summonResult.class}</p>
                        </div>
                        <div className="z-10 grid grid-cols-2 gap-2 w-full bg-black/20 p-3 rounded-lg border border-white/5">
                             <div className="text-center"><div className="text-[8px] text-slate-500 uppercase">Affinity</div><div className="text-sm text-amber-300 font-bold">{summonResult.affinity}</div></div>
                             <div className="text-center"><div className="text-[8px] text-slate-500 uppercase">Potential</div><div className="text-sm text-purple-300 font-bold">{summonResult.potential}%</div></div>
                        </div>
                        <div className="z-10 w-full">
                            <div className="text-[8px] text-slate-500 uppercase mb-1">Innate Traits</div>
                            <div className="flex flex-wrap gap-1">
                                {summonResult.traits.map(t => <span key={t} className="text-[8px] bg-slate-800 px-2 py-0.5 rounded border border-white/5 text-slate-300">{t}</span>)}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-8 w-full max-w-sm shrink-0 mb-4">
                        <button onClick={() => handleSummonAction('FORCE')} className="flex-1 bg-slate-900 border border-slate-800 text-slate-500 py-4 rounded-lg font-bold uppercase text-xs">Force Bond</button>
                        <button onClick={() => handleSummonAction('STABILIZE')} disabled={gold < STABILIZE_COST} className={`flex-1 border py-4 rounded-lg font-bold uppercase text-xs transition-all ${gold >= STABILIZE_COST ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-700'}`}>Stabilize ({STABILIZE_COST}G)</button>
                    </div>
                </div>
            )}

            {phase === 'RESULT' && (
                <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-150 duration-700 bg-white/5 p-4 text-center">
                    <div className="text-5xl mb-6">✨</div>
                    <h2 className="text-3xl font-black text-white tracking-widest uppercase">Bond Sealed</h2>
                    <p className="mt-4 text-slate-400 text-sm max-w-xs">The soul has been anchored to your party reserve. Manage your team in the sanctuary.</p>
                    <button onClick={() => setGameState(GameState.TEMPLE_HUB)} className="mt-12 px-8 py-3 bg-white text-black font-black uppercase text-xs rounded-full">Continue</button>
                </div>
            )}
            {/* Hidden canvas for sampling */}
            <canvas ref={canvasRef} width="320" height="240" className="hidden" />
        </div>
    );
};
