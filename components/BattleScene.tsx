
// @ts-nocheck
import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Preload, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Entity, Dimension, BattleAction, GameState } from '../types';
import { useGameStore } from '../store/gameStore';
import { WeatherOverlay } from './OverworldMap';
import { DAMAGE_ICONS } from '../constants';

import { FogController } from './battle/FogController';
import { CinematicCamera } from './battle/CinematicCamera';
import { TerrainLayer } from './battle/TerrainLayer';
import { InteractionLayer } from './battle/InteractionLayer';
import { EntityRenderer } from './battle/EntityRenderer';
import { SpellEffectsRenderer } from './battle/SpellEffectsRenderer';
import { LootDropVisual } from './battle/LootDropVisual';

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
                        {popup.damageType && DAMAGE_ICONS[popup.damageType] && (
                            <img 
                                src={DAMAGE_ICONS[popup.damageType]} 
                                className="w-4 h-4 object-contain invert brightness-200" 
                                alt=""
                            />
                        )}
                        <span className={`font-black text-2xl drop-shadow-md ${popup.color === '#22c55e' ? 'text-green-400' : 'text-white'}`}>
                            {popup.amount}
                        </span>
                    </div>
                </Html>
            ))}
        </group>
    );
};

export const BattleScene = ({ entities, weather, terrainType, currentTurnEntityId, onTileClick, validMoves, validTargets }: any) => {
    const battleMap = useGameStore(s => s.battleMap);
    const handleTileHover = useGameStore(s => s.handleTileHover);
    const dimension = useGameStore(s => s.dimension);
    const isActionAnimating = useGameStore(s => s.isActionAnimating);
    const selectedAction = useGameStore(s => s.selectedAction);
    const activeSpellEffect = useGameStore(s => s.activeSpellEffect);
    const lootDrops = useGameStore(s => s.lootDrops);
    const inspectUnit = useGameStore(s => s.inspectUnit);
    const gameState = useGameStore(s => s.gameState);
    
    const aliveEntities = useMemo(() => entities?.filter(e => e.stats.hp > 0) || [], [entities]);
    const isShadowRealm = dimension === Dimension.UPSIDE_DOWN;

    const isVisible = (gameState === GameState.BATTLE_TACTICAL || gameState === GameState.BATTLE_INIT) && battleMap;

    return (
        <div className="w-full h-full relative bg-slate-950">
            {isVisible && (
                <>
                    <WeatherOverlay type={weather} dimension={dimension} />
                    <Canvas shadows gl={{ antialias: false, toneMapping: THREE.NoToneMapping }} camera={{ position: [15, 15, 15], zoom: 40 }}>
                        <color attach="background" args={[isShadowRealm ? "#020510" : "#0f172a"]} />
                        <FogController isShadowRealm={isShadowRealm} terrain={terrainType} />
                        <OrthographicCamera makeDefault position={[15, 15, 15]} zoom={40} />
                        <OrbitControls enablePan={false} minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.5} target={[8, 0, 8]} />
                        <CinematicCamera />
                        <ambientLight intensity={1.8} />
                        <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow />
                        
                        <Suspense fallback={null}>
                            <TerrainLayer mapData={battleMap} isShadowRealm={isShadowRealm} onTileClick={onTileClick} onTileHover={(x, z) => handleTileHover(x, z)} />
                            <InteractionLayer mapData={battleMap} validMoves={validMoves} validTargets={validTargets} />
                            
                            {aliveEntities.map((ent: Entity) => (
                                <EntityRenderer 
                                    key={ent.id} 
                                    entity={ent} 
                                    mapData={battleMap}
                                    isCurrentTurn={ent.id === currentTurnEntityId} 
                                    onTileClick={onTileClick} 
                                    onInspect={inspectUnit} 
                                    isActing={isActionAnimating && ent.id === currentTurnEntityId} 
                                    actionType={selectedAction === BattleAction.ATTACK ? 'ATTACK' : 'IDLE'} 
                                />
                            ))}

                            {lootDrops.map((drop) => (
                                <LootDropVisual key={drop.id} drop={drop} />
                            ))}
                            
                            <SpellEffectsRenderer activeSpellEffect={activeSpellEffect} />
                            <DamagePopupManager />
                        </Suspense>
                        <Preload all />
                    </Canvas>
                </>
            )}
        </div>
    );
};
