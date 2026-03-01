
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
import { BattleActionBar } from './battle/BattleActionBar';
import { LightingSystem, CelestialBody, ActionLight } from './battle/LightingSystem';

const TurnAnnouncement = () => {
    const text = useGameStore(s => s.turnAnnouncement);
    const battleEntities = useGameStore(s => s.battleEntities);
    const turnOrder = useGameStore(s => s.turnOrder);
    const currentTurnIndex = useGameStore(s => s.currentTurnIndex);
    
    if (!text) return null;
    const isPlayer = text.includes("TU");
    
    const currentEntityId = turnOrder?.[currentTurnIndex];
    const currentEntity = battleEntities?.find(e => e.id === currentEntityId);
    const entityName = currentEntity?.name || '';

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none overflow-hidden">
            <div className={`absolute inset-0 ${isPlayer ? 'bg-blue-900/20' : 'bg-red-900/20'} animate-fade-in`} />
            <div className={`absolute inset-0 border-4 ${isPlayer ? 'border-blue-400/30' : 'border-red-500/30'} animate-turn-flash`} />
            <div className={`w-full py-8 md:py-12 ${isPlayer ? 'bg-blue-600/40 border-blue-400' : 'bg-red-900/40 border-red-500'} border-y-2 backdrop-blur-md flex flex-col items-center justify-center animate-slide-up`}>
                <h2 className={`text-4xl md:text-8xl font-serif font-black tracking-[0.2em] italic ${isPlayer ? 'text-blue-100' : 'text-red-100'} drop-shadow-2xl animate-pulse`}>
                    {text}
                </h2>
                {entityName && (
                    <div className={`mt-2 text-lg md:text-2xl font-bold uppercase tracking-widest ${isPlayer ? 'text-blue-200' : 'text-red-200'}`}>
                        {entityName}
                    </div>
                )}
            </div>
        </div>
    );
};

const TurnTimeline = () => {
    const { turnOrder, currentTurnIndex, battleEntities } = useGameStore();
    if (!turnOrder || !battleEntities) return null;
    
    return (
        <div className="absolute top-2 md:top-4 left-0 right-0 flex justify-center items-center gap-0.5 z-[110] pointer-events-none px-2 md:px-4">
            <div className="bg-black/70 backdrop-blur-xl border border-white/10 p-2 rounded-full flex items-center gap-2 shadow-2xl animate-scale-in">
                {turnOrder.map((id, i) => {
                    const ent = battleEntities.find(e => e.id === id);
                    if (!ent || ent.stats.hp <= 0) return null;
                    const isCurrent = i === currentTurnIndex;
                    const isEnemy = ent.type === 'ENEMY';
                    const isPast = i < currentTurnIndex;
                    const isLowHp = ent.stats.hp < ent.stats.maxHp * 0.3;

                    return (
                        <div 
                            key={id} 
                            className={`transition-all duration-300 flex flex-col items-center relative ${isCurrent ? 'w-14 md:w-12 mx-1' : 'w-10 md:w-8'} ${isPast ? 'opacity-20 grayscale' : ''}`}
                        >
                            <div className={`aspect-square w-full rounded-full border-2 overflow-hidden shadow-xl transition-all ${isCurrent ? 'border-amber-400 scale-110 ring-2 ring-amber-500/50 animate-pulse' : isEnemy ? 'border-red-600/50' : 'border-blue-500/50'} ${isCurrent ? 'bg-amber-900/30' : 'bg-slate-900'}`}>
                                <img 
                                    src={AssetManager.getSafeSprite(ent.visual.spriteUrl)} 
                                    className="w-full h-full object-contain scale-[2.5] translate-y-3 pixelated" 
                                />
                            </div>
                            {isCurrent && (
                                <div className="absolute -bottom--4 bg-amber-500 text-black text-[7px] md:text5 md:-bottom-[6px] font-black px-2 md:px-1.5 py-1 md:py-0.5 rounded shadow-lg whitespace-nowrap animate-bounce">
                                    ACTUANDO
                                </div>
                            )}
                            {isLowHp && !isCurrent && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
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

const TurnTransitionEffect = () => {
    const turnAnnouncement = useGameStore(s => s.turnAnnouncement);
    const battleEntities = useGameStore(s => s.battleEntities);
    const turnOrder = useGameStore(s => s.turnOrder);
    const currentTurnIndex = useGameStore(s => s.currentTurnIndex);
    const isActionAnimating = useGameStore(s => s.isActionAnimating);
    
    const currentEntityId = turnOrder?.[currentTurnIndex];
    const currentEntity = battleEntities?.find(e => e.id === currentEntityId);
    
    const isPlayerTurn = currentEntity?.type === 'PLAYER';
    const showEffect = turnAnnouncement && !isActionAnimating;
    
    if (!showEffect || !currentEntity?.position) return null;
    
    return (
        <group>
            <pointLight
                position={[currentEntity.position.x, 3, currentEntity.position.y]}
                color={isPlayerTurn ? '#3b82f6' : '#ef4444'}
                intensity={3}
                distance={10}
                decay={2}
            />
            <mesh position={[currentEntity.position.x, 0.05, currentEntity.position.y]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.8, 1.5, 32]} />
                <meshBasicMaterial 
                    color={isPlayerTurn ? '#3b82f6' : '#ef4444'} 
                    transparent 
                    opacity={0.4}
                />
            </mesh>
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
                <color attach="background" args={[isShadowRealm ? "#1a1525" : "#1a2530"]} />
                <Suspense fallback={null}>
                    <FogController isShadowRealm={isShadowRealm} terrain={terrainType} />
                    <CinematicCamera />
                    
                    <OrbitControls 
                        enablePan={false}
                        minPolarAngle={Math.PI / 5} 
                        maxPolarAngle={Math.PI / 2.2}
                        target={[8, 0, 8]}
                        enableDamping={true}
                        dampingFactor={0.08}
                        rotateSpeed={0.5}
                        zoomSpeed={0.8}
                        panSpeed={0}
                        minZoom={40}
                        maxZoom={100}
                        makeDefault
                        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
                    />
                    
                    {/* Sistema de Iluminación Profesional */}
                    <LightingSystem 
                        terrain={terrainType} 
                        weather={weather} 
                        dimension={dimension} 
                    />
                    <CelestialBody dimension={dimension} />
                    <ActionLight />
                    
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
                    <TurnTransitionEffect />
                    <DamagePopupManager />
                    <Preload all />
                </Suspense>
            </Canvas>

            {/* Status Report Compacto */}
            <div className="absolute bottom-6 left-6 z-[110] bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 pointer-events-none">
                <div className="flex items-center gap-3 px-2">
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]" /> <span className="text-xs font-black text-white/80">{aliveEntities.filter(e=>e.type==='PLAYER').length}</span></div>
                    <div className="w-px h-3 bg-white/10" />
                    <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_#ef4444]" /> <span className="text-xs font-black text-white/80">{aliveEntities.filter(e=>e.type==='ENEMY').length}</span></div>
                </div>
            </div>

            <BattleActionBar />
        </div>
    );
};
