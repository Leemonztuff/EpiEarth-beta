
// @ts-nocheck
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Preload, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Entity, Dimension, BattleAction, GameState } from '../types';
import { useGameStore } from '../store/gameStore';
import { WeatherOverlay } from './OverworldMap';
import { AssetManager } from '../services/AssetManager';

import { FogController } from './battle/FogController';
import { CinematicCamera } from './battle/CinematicCamera';
import { TerrainLayer } from './battle/TerrainLayer';
import { InteractionLayer } from './battle/InteractionLayer';
import { EntityRenderer } from './battle/EntityRenderer';
import { SpellEffectsRenderer } from './battle/SpellEffectsRenderer';

const TurnAnnouncement = () => {
    const text = useGameStore(s => s.turnAnnouncement);
    if (!text) return null;
    const isPlayer = text.includes("TU");

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none overflow-hidden">
            <div className={`w-full py-12 ${isPlayer ? 'bg-blue-600/30 border-blue-400' : 'bg-red-900/30 border-red-500'} border-y-2 backdrop-blur-md flex items-center justify-center animate-in slide-in-from-left duration-500`}>
                <h2 className={`text-5xl md:text-8xl font-serif font-black tracking-[0.2em] italic ${isPlayer ? 'text-blue-100' : 'text-red-100'} drop-shadow-2xl animate-pulse`}>
                    {text}
                </h2>
            </div>
        </div>
    );
};

const TurnTimeline = () => {
    const { turnOrder, currentTurnIndex, battleEntities } = useGameStore();
    if (!turnOrder || !battleEntities) return null;
    
    return (
        <div className="absolute top-4 left-0 right-0 flex justify-center items-center gap-0.5 z-[110] pointer-events-none px-4">
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-full flex items-center gap-1 shadow-2xl">
                {turnOrder.map((id, i) => {
                    const ent = battleEntities.find(e => e.id === id);
                    if (!ent || ent.stats.hp <= 0) return null;
                    const isCurrent = i === currentTurnIndex;
                    const isEnemy = ent.type === 'ENEMY';

                    return (
                        <div 
                            key={id} 
                            className={`transition-all duration-500 flex flex-col items-center relative ${isCurrent ? 'w-12 mx-1' : 'w-8 opacity-40 grayscale'}`}
                        >
                            <div className={`aspect-square w-full rounded-full border-2 overflow-hidden shadow-xl transition-transform ${isCurrent ? 'border-amber-400 scale-110 ring-2 ring-amber-500/30' : isEnemy ? 'border-red-600/50' : 'border-blue-500/50'} bg-slate-900`}>
                                <img 
                                    src={AssetManager.getSafeSprite(ent.visual.spriteUrl)} 
                                    className="w-full h-full object-contain scale-[2.5] translate-y-3 pixelated" 
                                />
                            </div>
                            {isCurrent && (
                                <div className="absolute -bottom-4 bg-amber-500 text-black text-[6px] font-black px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap animate-bounce">
                                    ACTUANDO
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DamagePopupManager = () => {
    const { damagePopups, removeDamagePopup } = useGameStore();
    useFrame(() => {
        const now = Date.now();
        damagePopups.forEach(p => { if (now - p.timestamp > 1000) removeDamagePopup(p.id); });
    });
    return (
        <group>
            {damagePopups.map((popup) => (
                <Html key={popup.id} position={[popup.position[0], 2.5, popup.position[2]]} center style={{ pointerEvents: 'none' }}>
                    <div className="flex items-center gap-1 animate-[float-damage_1s_ease-out_forwards]">
                        <span className={`font-black text-2xl drop-shadow-md ${popup.isCrit ? 'text-amber-400 scale-125' : 'text-white'}`}>
                            {popup.amount}
                        </span>
                    </div>
                </Html>
            ))}
        </group>
    );
};

export const BattleScene = ({ entities, weather, terrainType, currentTurnEntityId, onTileClick }: any) => {
    const battleMap = useGameStore(s => s.battleMap);
    const validMoves = useGameStore(s => s.validMoves);
    const validTargets = useGameStore(s => s.validTargets);
    const handleTileHover = useGameStore(s => s.handleTileHover);
    const dimension = useGameStore(s => s.dimension);
    const isActionAnimating = useGameStore(s => s.isActionAnimating);
    const selectedAction = useGameStore(s => s.selectedAction);
    const activeSpellEffect = useGameStore(s => s.activeSpellEffect);
    
    const aliveEntities = useMemo(() => entities?.filter(e => e.stats.hp > 0) || [], [entities]);
    const isShadowRealm = dimension === Dimension.UPSIDE_DOWN;

    if (!battleMap || battleMap.length === 0) return null;

    return (
        <div className="w-full h-full relative bg-slate-950 overflow-hidden">
            <WeatherOverlay type={weather} dimension={dimension} />
            <TurnTimeline />
            <TurnAnnouncement />
            
            <Canvas 
                shadows 
                gl={{ antialias: false, logarithmicDepthBuffer: true, powerPreference: 'high-performance' }} 
                orthographic
                camera={{ position: [50, 50, 50], zoom: 65, near: -200, far: 2000 }}
            >
                <color attach="background" args={[isShadowRealm ? "#020510" : "#0f172a"]} />
                <Suspense fallback={null}>
                    <FogController isShadowRealm={isShadowRealm} terrain={terrainType} />
                    <CinematicCamera />
                    
                    <OrbitControls 
                        enablePan={false} 
                        minPolarAngle={Math.PI / 6} 
                        maxPolarAngle={Math.PI / 2.5} 
                        target={[8, 0, 8]} 
                        enableDamping={true}
                        dampingFactor={0.06}
                        rotateSpeed={0.4}
                        makeDefault
                    />
                    
                    <ambientLight intensity={1.5} />
                    <hemisphereLight intensity={0.8} />
                    <directionalLight position={[15, 30, 5]} intensity={2.5} castShadow shadow-mapSize={[1024, 1024]} />
                    
                    <TerrainLayer mapData={battleMap} onTileClick={onTileClick} onTileHover={(x, z) => handleTileHover(x, z)} />
                    <InteractionLayer mapData={battleMap} validMoves={validMoves} validTargets={validTargets} />
                    
                    {aliveEntities.map((ent: Entity) => (
                        <EntityRenderer 
                            key={ent.id} 
                            entity={ent} 
                            mapData={battleMap}
                            isCurrentTurn={ent.id === currentTurnEntityId} 
                            onTileClick={onTileClick} 
                            isActing={isActionAnimating && ent.id === currentTurnEntityId} 
                            actionType={selectedAction === BattleAction.ATTACK ? 'ATTACK' : 'IDLE'} 
                        />
                    ))}
                    
                    <SpellEffectsRenderer activeSpellEffect={activeSpellEffect} />
                    <DamagePopupManager />
                    <Preload all />
                </Suspense>
            </Canvas>

            {/* Status Report Compacto */}
            <div className="absolute bottom-6 left-6 z-[110] bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 pointer-events-none">
                <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]" /> <span className="text-[9px] font-black text-white/80">{aliveEntities.filter(e=>e.type==='PLAYER').length}</span></div>
                    <div className="w-px h-3 bg-white/10" />
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]" /> <span className="text-[9px] font-black text-white/80">{aliveEntities.filter(e=>e.type==='ENEMY').length}</span></div>
                </div>
            </div>
        </div>
    );
};
