import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { GameState, TrapType } from '../types';
import { TrapMarker } from './TrapMarker';
import { Exploration3DMinimap } from './Exploration3DMinimap';
import { AssetManager } from '../services/AssetManager';
import { TACTICAL_MAP_SIZE } from '../services/trapHuntMap';
import { TRAP_DATA } from '../data/trapsData';

const TILE_SIZE = 1;
type LoadedTextureMap = Record<string, THREE.Texture>;

function getWorldPosition(x: number, z: number): [number, number, number] {
    return [x - TACTICAL_MAP_SIZE / 2, 0, z - TACTICAL_MAP_SIZE / 2];
}

function getWorldPositionFromPos(pos: { x: number; z: number }): [number, number, number] {
    return getWorldPosition(pos.x, pos.z);
}

const TILE_TEXTURE_URLS = {
    FLOOR: '/assets/minecraft/grass_block_top.png',
    WALL: '/assets/minecraft/cobblestone.png',
    BRUSH: '/assets/minecraft/grass_block_top.png',
    STONE: '/assets/minecraft/mossy_cobblestone.png',
    WATER: '/assets/minecraft/blue_concrete.png',
};

const TrapPlacementHighlight: React.FC<{ position: [number, number, number]; active: boolean }> = ({ position, active }) => {
    if (!active) return null;
    return (
        <mesh position={[position[0], 0.03, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.48, 24]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} />
        </mesh>
    );
};

const TrapAimGhost: React.FC<{ position: [number, number, number] | null }> = ({ position }) => {
    if (!position) return null;
    return (
        <mesh position={[position[0], 0.07, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.26, 18]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.85} />
        </mesh>
    );
};

const SpriteBillboard: React.FC<{
    position: [number, number, number];
    spriteUrl?: string;
    scale?: [number, number, number];
}> = ({ position, spriteUrl, scale = [1.4, 1.8, 1] }) => {
    const safeUrl = AssetManager.getSafeSprite(spriteUrl || AssetManager.FALLBACK_SPRITE);
    const texture = useLoader(THREE.TextureLoader, safeUrl);
    const spriteRef = React.useRef<THREE.Sprite>(null!);
    const target = useMemo(() => new THREE.Vector3(position[0], position[1] + 0.9, position[2]), [position]);

    useMemo(() => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
    }, [texture]);

    useFrame(() => {
        if (!spriteRef.current) return;
        spriteRef.current.position.lerp(target, 0.24);
    });

    return (
        <sprite ref={spriteRef} position={[position[0], position[1] + 0.9, position[2]]} scale={scale}>
            <spriteMaterial map={texture} transparent alphaTest={0.2} />
        </sprite>
    );
};

const ThirdPersonCameraRig: React.FC<{
    playerPos: { x: number; z: number };
    cameraMode: 'OVER_SHOULDER' | 'TACTICAL_ZOOM' | 'CINEMATIC';
    movementIntent: { x: number; z: number } | null;
    tacticalPaused: boolean;
}> = ({ playerPos, cameraMode, movementIntent, tacticalPaused }) => {
    const { camera } = useThree();
    const lookTarget = useMemo(() => new THREE.Vector3(), []);
    const camTarget = useMemo(() => new THREE.Vector3(), []);
    const heading = useRef(new THREE.Vector2(0, 1));

    useFrame(() => {
        const [wx, _, wz] = getWorldPosition(playerPos.x, playerPos.z);
        if (movementIntent && (movementIntent.x !== 0 || movementIntent.z !== 0)) {
            heading.current.set(movementIntent.x, movementIntent.z).normalize();
        }

        if (cameraMode === 'TACTICAL_ZOOM' || tacticalPaused) {
            lookTarget.set(wx, 0.6, wz);
            camTarget.set(wx, 12, wz + 0.2);
        } else if (cameraMode === 'CINEMATIC') {
            lookTarget.set(wx, 0.9, wz);
            camTarget.set(wx + 4, 8, wz + 7);
        } else {
            lookTarget.set(wx, 1.0, wz);
            camTarget.set(
                wx - heading.current.x * 2.4,
                2.35,
                wz - heading.current.y * 2.4
            );
        }

        camera.position.lerp(camTarget, tacticalPaused ? 0.18 : 0.14);
        camera.lookAt(lookTarget);
    });

    return null;
};

const TacticalBoard: React.FC<{
    map: any[][];
    playerPos: { x: number; z: number };
    playerRenderPos: { x: number; z: number };
    enemies: any[];
    traps: any[];
    highlightedTiles: { x: number; z: number }[];
    trapAimTarget: { x: number; z: number } | null;
    selectedTrapRange: number | null;
    tacticalOverlay: boolean;
    onTilePress: (x: number, z: number) => void;
    playerSpriteUrl?: string;
}> = ({ map, playerPos, playerRenderPos, enemies, traps, highlightedTiles, trapAimTarget, selectedTrapRange, tacticalOverlay, onTilePress, playerSpriteUrl }) => {
    const textureEntries = useLoader(THREE.TextureLoader, Object.values(TILE_TEXTURE_URLS));
    const textures = useMemo<LoadedTextureMap>(() => {
        const next: LoadedTextureMap = {};
        Object.keys(TILE_TEXTURE_URLS).forEach((key, index) => {
            const texture = textureEntries[index];
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            next[key] = texture;
        });
        return next;
    }, [textureEntries]);
    const highlightSet = useMemo(() => new Set(highlightedTiles.map(tile => `${tile.x},${tile.z}`)), [highlightedTiles]);

    return (
        <group>
            {map.map((column, x) =>
                column.map(cell => {
                    const pos = getWorldPosition(x, cell.z);
                    const texture = textures[cell.type] || textures.FLOOR;
                    const isHighlight = highlightSet.has(`${x},${cell.z}`);

                    if (cell.type === 'WALL' || cell.type === 'STONE') {
                        return (
                            <group key={`cell-${x}-${cell.z}`}>
                                <mesh position={[pos[0], cell.height / 2, pos[2]]} onClick={() => onTilePress(x, cell.z)} onPointerDown={() => onTilePress(x, cell.z)} castShadow receiveShadow>
                                    <boxGeometry args={[TILE_SIZE, Math.max(0.8, cell.height), TILE_SIZE]} />
                                    <meshStandardMaterial map={texture} />
                                </mesh>
                                <TrapPlacementHighlight position={pos} active={isHighlight} />
                            </group>
                        );
                    }

                    return (
                        <group key={`cell-${x}-${cell.z}`}>
                            <mesh position={[pos[0], cell.height / 2 - 0.05, pos[2]]} onClick={() => onTilePress(x, cell.z)} onPointerDown={() => onTilePress(x, cell.z)} receiveShadow>
                                <boxGeometry args={[TILE_SIZE, 0.12, TILE_SIZE]} />
                                <meshStandardMaterial map={texture} />
                            </mesh>
                            {cell.type === 'BRUSH' && (
                                <mesh position={[pos[0], 0.3, pos[2]]}>
                                    <planeGeometry args={[0.7, 0.7]} />
                                    <meshStandardMaterial map={textures.BRUSH} transparent alphaTest={0.05} side={THREE.DoubleSide} />
                                </mesh>
                            )}
                            {cell.type === 'WATER' && (
                                <mesh position={[pos[0], -0.04, pos[2]]}>
                                    <planeGeometry args={[0.95, 0.95]} />
                                    <meshStandardMaterial color="#38bdf8" transparent opacity={0.7} />
                                </mesh>
                            )}
                            <TrapPlacementHighlight position={pos} active={isHighlight} />
                            {tacticalOverlay && (
                                <mesh position={[pos[0], 0.01, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                                    <ringGeometry args={[0.42, 0.46, 6]} />
                                    <meshBasicMaterial color="#cbd5e1" transparent opacity={0.25} />
                                </mesh>
                            )}
                        </group>
                    );
                })
            )}

            {enemies.map(enemy =>
                enemy.isDefeated ? null : (
                    <group key={enemy.id}>
                        <SpriteBillboard position={getWorldPosition(enemy.x, enemy.z)} spriteUrl={enemy.sprite} scale={[1.3, 1.7, 1]} />
                        {tacticalOverlay && (
                            <mesh position={[getWorldPosition(enemy.x, enemy.z)[0], 0.04, getWorldPosition(enemy.x, enemy.z)[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                                <ringGeometry args={[0.46, 0.58, 24]} />
                                <meshBasicMaterial color="#ef4444" transparent opacity={0.42} />
                            </mesh>
                        )}
                    </group>
                )
            )}
            {traps.map(trap => (
                <TrapMarker key={trap.id} position={[getWorldPosition(trap.x, trap.z)[0], 0.02, getWorldPosition(trap.x, trap.z)[2]]} trapType={trap.type} isArmed={trap.isArmed} />
            ))}
            {selectedTrapRange ? (
                <mesh position={getWorldPosition(playerPos.x, playerPos.z)} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[Math.max(0.65, selectedTrapRange - 0.2), selectedTrapRange + 0.25, 36]} />
                    <meshBasicMaterial color="#fbbf24" transparent opacity={0.22} />
                </mesh>
            ) : null}
            <TrapAimGhost position={trapAimTarget ? getWorldPositionFromPos(trapAimTarget) : null} />
            <SpriteBillboard position={getWorldPositionFromPos(playerRenderPos)} spriteUrl={playerSpriteUrl} scale={[1.2, 1.8, 1]} />
        </group>
    );
};

const DirectionPad: React.FC<{ onMove: (dx: number, dz: number) => void }> = ({ onMove }) => (
    <div className="grid grid-cols-3 gap-2 w-[170px]">
        <div />
        <button className="h-12 rounded-xl bg-slate-900/90 border border-cyan-300/25 text-white font-black text-sm active:scale-95 transition-transform" onClick={() => onMove(0, -1)}>N</button>
        <div />
        <button className="h-12 rounded-xl bg-slate-900/90 border border-cyan-300/25 text-white font-black text-sm active:scale-95 transition-transform" onClick={() => onMove(-1, 0)}>W</button>
        <button className="h-12 rounded-xl bg-slate-800/90 border border-amber-500/40 text-amber-300 font-black text-[10px] tracking-wide">STEP</button>
        <button className="h-12 rounded-xl bg-slate-900/90 border border-cyan-300/25 text-white font-black text-sm active:scale-95 transition-transform" onClick={() => onMove(1, 0)}>E</button>
        <div />
        <button className="h-12 rounded-xl bg-slate-900/90 border border-cyan-300/25 text-white font-black text-sm active:scale-95 transition-transform" onClick={() => onMove(0, 1)}>S</button>
        <div />
    </div>
);

export const Exploration3DScene: React.FC = () => {
    const gameState = useGameStore(s => s.gameState);
    const playerPosHex = useGameStore(s => s.playerPos);
    const party = useGameStore(s => s.party);
    const fatigue = useGameStore(s => s.fatigue);
    const supplies = useGameStore(s => s.supplies);
    const explorationState = useGameStore(s => s.explorationState);
    const tacticalUiState = useGameStore(s => s.tacticalUiState);
    const activeDungeonId = useGameStore(s => s.activeDungeonId);
    const dungeonRuntimeById = useGameStore(s => s.dungeonRuntimeById);
    const initZone = useGameStore(s => s.initZone);
    const dispatchTacticalAction = useGameStore(s => s.dispatchTacticalAction);
    const setInputMode = useGameStore(s => s.setInputMode);

    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [showDetails, setShowDetails] = useState(false);
    const [trapConfirmTarget, setTrapConfirmTarget] = useState<{ x: number; z: number } | null>(null);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        setInputMode(isMobile ? 'mobile' : 'desktop');
    }, [isMobile, setInputMode]);

    useEffect(() => {
        if (gameState === GameState.EXPLORATION_3D && explorationState.map.length === 0) {
            initZone('forest', playerPosHex);
        }
    }, [gameState, explorationState.map.length, initZone, playerPosHex]);

    const player = party[0];
    const selectedTrap = explorationState.selectedTrapType;
    const statusMessage = tacticalUiState.blockReason || tacticalUiState.message || 'Mueve 1 casillero y fuerza errores del enemigo.';
    const activeRuntime = activeDungeonId ? dungeonRuntimeById[activeDungeonId] : null;
    const currentRoomDoors = useMemo(() => {
        if (!explorationState.roomGraphRef || !explorationState.currentRoomId) return [];
        return Object.values(explorationState.roomGraphRef.doors).filter(
            door => door.fromRoomId === explorationState.currentRoomId || door.toRoomId === explorationState.currentRoomId
        );
    }, [explorationState.roomGraphRef, explorationState.currentRoomId]);

    const attemptMove = useCallback((dx: number, dz: number) => {
        dispatchTacticalAction({ type: 'MoveStep', dx, dz });
    }, [dispatchTacticalAction]);

    const handleTilePress = useCallback((x: number, z: number) => {
        if (selectedTrap) {
            dispatchTacticalAction({ type: 'AimTrapAt', x, z });
            if (trapConfirmTarget && trapConfirmTarget.x === x && trapConfirmTarget.z === z) {
                dispatchTacticalAction({ type: 'PlaceTrap', x, z, trapType: selectedTrap });
                setTrapConfirmTarget(null);
                return;
            }
            setTrapConfirmTarget({ x, z });
            return;
        }
        setTrapConfirmTarget(null);
        dispatchTacticalAction({ type: 'MoveToTile', x, z });
    }, [selectedTrap, dispatchTacticalAction, trapConfirmTarget]);

    useEffect(() => {
        if (!selectedTrap) {
            setTrapConfirmTarget(null);
        }
    }, [selectedTrap]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (gameState !== GameState.EXPLORATION_3D) return;

            if (event.key === 'w' || event.key === 'ArrowUp') {
                event.preventDefault();
                attemptMove(0, -1);
            } else if (event.key === 's' || event.key === 'ArrowDown') {
                event.preventDefault();
                attemptMove(0, 1);
            } else if (event.key === 'a' || event.key === 'ArrowLeft') {
                event.preventDefault();
                attemptMove(-1, 0);
            } else if (event.key === 'd' || event.key === 'ArrowRight') {
                event.preventDefault();
                attemptMove(1, 0);
            } else if (event.key.toLowerCase() === 'p') {
                event.preventDefault();
                dispatchTacticalAction({ type: 'ToggleTacticalPause' });
            } else if (event.key.toLowerCase() === 'm') {
                event.preventDefault();
                dispatchTacticalAction({ type: 'ToggleMinimap' });
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [attemptMove, gameState, dispatchTacticalAction]);

    if (gameState !== GameState.EXPLORATION_3D) return null;

    return (
        <div className="w-full h-full relative overflow-hidden bg-[#04070b]">
            <Canvas shadows camera={{ position: [0, 6, 6], fov: 55 }} className="touch-none">
                <color attach="background" args={['#0b1220']} />
                <ambientLight intensity={0.75} />
                <directionalLight position={[10, 18, 8]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
                <fog attach="fog" args={['#0b1220', 8, 26]} />
                <ThirdPersonCameraRig
                    playerPos={explorationState.smoothedWorldPos}
                    cameraMode={explorationState.cameraMode}
                    movementIntent={explorationState.movementIntent}
                    tacticalPaused={explorationState.tacticalPaused}
                />

                <TacticalBoard
                    map={explorationState.map}
                    playerPos={explorationState.playerMapPos}
                    playerRenderPos={explorationState.smoothedWorldPos}
                    enemies={explorationState.zoneEnemies}
                    traps={explorationState.traps.map(trap => ({
                        id: trap.id,
                        x: trap.position.x,
                        z: trap.position.z,
                        type: trap.type,
                        isArmed: trap.isArmed,
                    }))}
                    highlightedTiles={explorationState.highlightedTiles}
                    trapAimTarget={explorationState.trapAimTarget}
                    selectedTrapRange={selectedTrap ? (tacticalUiState.selectedTrapRange ?? TRAP_DATA[selectedTrap].range) : null}
                    tacticalOverlay={explorationState.tacticalPaused || !!selectedTrap}
                    onTilePress={handleTilePress}
                    playerSpriteUrl={player?.visual?.spriteUrl}
                />
            </Canvas>

            <div className="absolute inset-0 pointer-events-none flex flex-col">
                <div className="pointer-events-auto p-2 sm:p-3">
                    <div className="mx-auto max-w-[880px] rounded-xl border border-cyan-300/25 bg-gradient-to-b from-slate-950/80 to-slate-900/64 shadow-[0_6px_20px_rgba(0,0,0,0.42)] backdrop-blur-md">
                        <div className="p-2 flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/90 font-bold">
                                    {explorationState.zoneContext?.kind === 'dungeon' ? 'Dungeon Hunt' : 'Trap Hunt'}
                                </div>
                                <h2 className="text-white font-black text-base sm:text-lg leading-none truncate tracking-wide">{tacticalUiState.zoneName}</h2>
                                <p className={`text-cyan-100/75 text-[11px] mt-1 truncate ${tacticalUiState.blockReason ? 'motion-safe:animate-pulse text-amber-200' : ''}`}>{statusMessage}</p>
                                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] sm:text-[11px]">
                                    <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-white/10 text-white font-bold">HP {player?.stats.hp ?? 0}/{player?.stats.maxHp ?? 0}</span>
                                    <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-white/10 text-white font-bold">ENEM {tacticalUiState.enemyCount}</span>
                                    <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-white/10 text-white font-bold">TURNO {tacticalUiState.turnStep}</span>
                                    <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-white/10 text-white font-bold">TRAPS {tacticalUiState.trapCount}/{tacticalUiState.maxTraps}</span>
                                    <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-amber-300/30 text-amber-200 font-bold">COMBO x{(tacticalUiState.comboMultiplier ?? 1).toFixed(2)}</span>
                                    <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-emerald-300/30 text-emerald-200 font-bold">TRAP$ {tacticalUiState.trapCurrency ?? 0}</span>
                                    <span className={`px-2 py-[3px] rounded-md border font-bold ${explorationState.tacticalPaused ? 'bg-amber-400 text-black border-amber-300' : 'bg-slate-900/90 border-white/10 text-white'}`}>{explorationState.tacticalPaused ? 'SET TRAP' : 'RUN'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button onClick={() => setShowDetails(prev => !prev)} className="px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-black bg-slate-800/90 text-white border border-white/10 hover:border-cyan-300/40 transition-colors">
                                    {showDetails ? 'DETALLE -' : 'DETALLE +'}
                                </button>
                                <button onClick={() => dispatchTacticalAction({ type: 'ToggleMinimap' })} className="px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-black bg-slate-800/90 text-white border border-white/10 hover:border-cyan-300/40 transition-colors">
                                    {explorationState.showMinimap ? 'RADAR OFF' : 'RADAR ON'}
                                </button>
                                <button onClick={() => dispatchTacticalAction({ type: 'ToggleTacticalPause' })} className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black transition-all ${explorationState.tacticalPaused ? 'bg-amber-400 text-black motion-safe:animate-pulse' : 'bg-slate-800/90 text-white border border-white/10 hover:border-cyan-300/40'}`}>
                                    {explorationState.tacticalPaused ? 'Reanudar' : 'Pausa'}
                                </button>
                                <button onClick={() => dispatchTacticalAction({ type: 'ExitTrapZone' })} className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-xs font-black transition-colors">
                                    Salir
                                </button>
                            </div>
                        </div>
                        {showDetails && (
                            <div className="px-2 pb-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-[10px] sm:text-[11px]">
                                <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">Fatiga</span><div className="text-white font-black">{fatigue.toFixed(1)}</div></div>
                                <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">Sumin.</span><div className="text-white font-black">{supplies.toFixed(1)}</div></div>
                                <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">Objetivo</span><div className="text-white font-black">{tacticalUiState.objectiveLabel || 'Explorar'}</div></div>
                                <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">Riesgo</span><div className="text-white font-black">{tacticalUiState.riskLabel || 'Moderado'}</div></div>
                                <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">Timeline</span><div className="text-white font-black">{tacticalUiState.timelineLabel || 'Dia 0'}</div></div>
                                <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">Sala</span><div className="text-white font-black">{explorationState.currentRoomId || '-'}</div></div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1" />

                <div className="pointer-events-auto p-2 sm:p-3 grid gap-2 md:grid-cols-[1fr,auto] items-end">
                    <div className="order-2 md:order-1 mx-auto w-full max-w-[880px] rounded-xl border border-cyan-300/25 bg-gradient-to-b from-slate-950/78 to-slate-900/62 backdrop-blur-md p-2">
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="text-white font-black text-xs sm:text-sm tracking-wide">
                                {tacticalUiState.trapCount}/{tacticalUiState.maxTraps} colocadas
                            </div>
                            <div className="text-right text-[10px] sm:text-[11px] text-cyan-100/70">
                                {trapConfirmTarget && selectedTrap
                                    ? `Confirmar en ${trapConfirmTarget.x},${trapConfirmTarget.z}`
                                    : selectedTrap
                                    ? `${TRAP_DATA[selectedTrap].name} - Alc ${tacticalUiState.selectedTrapRange ?? TRAP_DATA[selectedTrap].range}`
                                    : 'Elige una trampa'}
                            </div>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 md:grid md:grid-cols-6 md:gap-2 md:overflow-visible md:pb-0">
                            {(Object.keys(TRAP_DATA) as TrapType[]).slice(0, 6).map(type => (
                                <button
                                    key={type}
                                    onClick={() => dispatchTacticalAction({ type: 'SelectTrap', trapType: selectedTrap === type ? null : type })}
                                    className={`min-w-[112px] md:min-w-0 rounded-xl px-2 py-2 text-left border transition-all duration-150 hover:-translate-y-[1px] ${
                                        selectedTrap === type
                                            ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)]'
                                            : 'bg-slate-900/88 text-white border-white/10 hover:border-cyan-300/45'
                                    }`}
                                >
                                    <div className="text-[10px] uppercase font-black">{type}</div>
                                    <div className={`text-[11px] mt-1 ${selectedTrap === type ? 'text-black/75' : 'text-white/65'}`}>
                                        Alc {TRAP_DATA[type].range}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {explorationState.currentRoomId && currentRoomDoors.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {currentRoomDoors.map(door => {
                                    const stateDoor = explorationState.doorStates[door.id] || door.state;
                                    const nextRoom = door.fromRoomId === explorationState.currentRoomId ? door.toRoomId : door.fromRoomId;
                                    return (
                                        <button
                                            key={door.id}
                                            onClick={() => dispatchTacticalAction({ type: 'OpenDoor', doorId: door.id })}
                                            className={`px-2 py-1 rounded-md text-[10px] font-black border ${
                                                stateDoor === 'open'
                                                    ? 'bg-emerald-900/50 text-emerald-200 border-emerald-400/40'
                                                    : stateDoor === 'locked'
                                                        ? 'bg-red-900/50 text-red-200 border-red-400/40'
                                                        : 'bg-amber-900/50 text-amber-200 border-amber-400/40'
                                            }`}
                                        >
                                            {stateDoor === 'open' ? `Ir ${nextRoom}` : `${stateDoor === 'locked' ? 'Bloq' : 'Abrir'} ${nextRoom}`}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-2 text-[11px] text-white/50">
                            {isMobile
                                ? 'Mobile: Pad mover | Tap colocar | Pausa | Radar'
                                : 'Desktop: WASD/Flechas | Click colocar/interactuar | P pausa | M radar'}
                        </div>
                    </div>

                    {isMobile && (
                        <div className="order-1 flex justify-center">
                            <DirectionPad onMove={attemptMove} />
                        </div>
                    )}
                </div>
            </div>

            {explorationState.showMinimap && (
                <Exploration3DMinimap
                    mapSize={explorationState.mapSize || TACTICAL_MAP_SIZE}
                    playerPos={explorationState.playerMapPos}
                    enemies={explorationState.zoneEnemies.map(enemy => ({
                        id: enemy.id,
                        x: enemy.x,
                        z: enemy.z,
                        type: enemy.name,
                        isDefeated: enemy.isDefeated,
                    }))}
                    traps={explorationState.traps.map(trap => ({
                        id: trap.id,
                        x: trap.position.x,
                        z: trap.position.z,
                        type: trap.type,
                        isArmed: trap.isArmed,
                    }))}
                    targetPos={selectedTrap ? explorationState.trapAimTarget : undefined}
                    roomGraph={explorationState.roomGraphRef}
                    doorStates={explorationState.doorStates}
                    discoveredRooms={activeRuntime?.discoveredRooms || []}
                    currentRoomId={explorationState.currentRoomId}
                />
            )}
        </div>
    );
};

export default Exploration3DScene;
