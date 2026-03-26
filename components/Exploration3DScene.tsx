import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { GameState, TrapOrientation, TrapType } from '../types';
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

function orientationToVector(orientation: TrapOrientation): { x: number; z: number } {
    if (orientation === 'N') return { x: 0, z: -1 };
    if (orientation === 'E') return { x: 1, z: 0 };
    if (orientation === 'S') return { x: 0, z: 1 };
    return { x: -1, z: 0 };
}

function rotateOrientationLeft(orientation: TrapOrientation): TrapOrientation {
    if (orientation === 'N') return 'W';
    if (orientation === 'W') return 'S';
    if (orientation === 'S') return 'E';
    return 'N';
}

function rotateOrientationRight(orientation: TrapOrientation): TrapOrientation {
    if (orientation === 'N') return 'E';
    if (orientation === 'E') return 'S';
    if (orientation === 'S') return 'W';
    return 'N';
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
            <planeGeometry args={[0.86, 0.86]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.28} />
        </mesh>
    );
};

const TrapAimGhost: React.FC<{ position: [number, number, number] | null }> = ({ position }) => {
    if (!position) return null;
    return (
        <mesh position={[position[0], 0.07, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.78, 0.78]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.45} />
        </mesh>
    );
};

const PlacementGridOverlay: React.FC<{ mapSize: number; active: boolean }> = ({ mapSize, active }) => {
    if (!active) return null;
    const size = mapSize;
    return (
        <group position={[-0.5, 0.02, -0.5]}>
            <gridHelper
                args={[size, size, '#00ff66', '#00aa44']}
                position={[0, 0, 0]}
            />
        </group>
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
    environmentTraps: { id: string; x: number; z: number; type: string }[];
    highlightedTiles: { x: number; z: number }[];
    trapAimTarget: { x: number; z: number } | null;
    selectedTrapRange: number | null;
    selectedTrapType: TrapType | null;
    showTargetingOverlays: boolean;
    showPlacementGrid: boolean;
    onTilePress: (x: number, z: number) => void;
    playerSpriteUrl?: string;
}> = ({ map, playerPos, playerRenderPos, enemies, traps, environmentTraps, highlightedTiles, trapAimTarget, selectedTrapRange, selectedTrapType, showTargetingOverlays, showPlacementGrid, onTilePress, playerSpriteUrl }) => {
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
    const selectedSurface = selectedTrapType ? (TRAP_DATA[selectedTrapType].placementSurface ?? 'floor') : null;

    const isTileValidForSurface = useCallback((cell: any): boolean => {
        if (!selectedSurface) return false;
        if (cell.zone !== 'ROOM') return false;
        if (selectedSurface === 'wall') return cell.type === 'WALL' || cell.type === 'STONE';
        return !!cell.walkable;
    }, [selectedSurface]);

    return (
        <group>
            {map.map((column, x) =>
                column.map(cell => {
                    const pos = getWorldPosition(x, cell.z);
                    const texture = textures[cell.type] || textures.FLOOR;
                    const isHighlight = highlightSet.has(`${x},${cell.z}`);
                    const isSurfaceValid = isTileValidForSurface(cell);
                    const overlayColor = !selectedSurface
                        ? '#16a34a'
                        : isSurfaceValid
                        ? '#22c55e'
                        : '#ef4444';
                    const overlayOpacity = !selectedSurface
                        ? 0.06
                        : isSurfaceValid
                        ? 0.26
                        : 0.22;

                    if (cell.type === 'WALL' || cell.type === 'STONE') {
                        return (
                            <group key={`cell-${x}-${cell.z}`}>
                                <mesh position={[pos[0], cell.height / 2, pos[2]]} onClick={() => onTilePress(x, cell.z)} onPointerDown={() => onTilePress(x, cell.z)} castShadow receiveShadow>
                                    <boxGeometry args={[TILE_SIZE, Math.max(0.8, cell.height), TILE_SIZE]} />
                                    <meshStandardMaterial map={texture} />
                                </mesh>
                                <TrapPlacementHighlight position={pos} active={isHighlight} />
                                {showPlacementGrid && isHighlight && (
                                    <mesh position={[pos[0], Math.max(0.1, cell.height + 0.02), pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                                        <planeGeometry args={[0.84, 0.84]} />
                                        <meshBasicMaterial color={overlayColor} transparent opacity={overlayOpacity} />
                                    </mesh>
                                )}
                            </group>
                        );
                    }

                    return (
                        <group key={`cell-${x}-${cell.z}`}>
                            <mesh position={[pos[0], cell.height / 2 - 0.05, pos[2]]} onClick={() => onTilePress(x, cell.z)} onPointerDown={() => onTilePress(x, cell.z)} receiveShadow>
                                <boxGeometry args={[TILE_SIZE, 0.12, TILE_SIZE]} />
                                <meshStandardMaterial map={texture} color={cell.zone === 'CORRIDOR' ? '#9ca3af' : '#ffffff'} />
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
                            <TrapPlacementHighlight position={pos} active={showPlacementGrid && isHighlight} />
                            {showPlacementGrid && (
                                <mesh position={[pos[0], 0.01, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                                    <planeGeometry args={[0.96, 0.96]} />
                                    <meshBasicMaterial color={isHighlight ? overlayColor : '#16a34a'} transparent opacity={isHighlight ? overlayOpacity : 0.06} />
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
                        {showTargetingOverlays && (
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
            {environmentTraps.map(env => (
                <mesh key={env.id} position={[getWorldPosition(env.x, env.z)[0], 0.05, getWorldPosition(env.x, env.z)[2]]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.26, 0.4, 18]} />
                    <meshBasicMaterial color="#fb7185" transparent opacity={0.5} />
                </mesh>
            ))}
            {showTargetingOverlays && selectedTrapRange ? (
                <mesh position={getWorldPosition(playerPos.x, playerPos.z)} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[Math.max(0.65, selectedTrapRange - 0.2), selectedTrapRange + 0.25, 36]} />
                    <meshBasicMaterial color="#fbbf24" transparent opacity={0.22} />
                </mesh>
            ) : null}
            {showTargetingOverlays && <TrapAimGhost position={trapAimTarget ? getWorldPositionFromPos(trapAimTarget) : null} />}
            <PlacementGridOverlay mapSize={map.length || TACTICAL_MAP_SIZE} active={showPlacementGrid} />
            <SpriteBillboard position={getWorldPositionFromPos(playerRenderPos)} spriteUrl={playerSpriteUrl} scale={[1.2, 1.8, 1]} />
        </group>
    );
};

const DirectionPad: React.FC<{
    onForward: () => void;
    onBackstep: () => void;
    onRotateLeft: () => void;
    onRotateRight: () => void;
    onStrafeLeft: () => void;
    onStrafeRight: () => void;
    onQuickTurn: () => void;
}> = ({ onForward, onBackstep, onRotateLeft, onRotateRight, onStrafeLeft, onStrafeRight, onQuickTurn }) => (
    <div className="grid grid-cols-3 gap-2 w-[190px]">
        <div />
        <button className="h-12 rounded-xl bg-slate-900/90 border border-cyan-300/25 text-white font-black text-xs active:scale-95 transition-transform" onClick={onForward}>Forward</button>
        <div />
        <button className="h-12 rounded-xl bg-slate-900/90 border border-cyan-300/25 text-white font-black text-xs active:scale-95 transition-transform" onClick={onRotateLeft}>Turn L</button>
        <button className="h-12 rounded-xl bg-slate-800/90 border border-amber-500/40 text-amber-300 font-black text-[10px] tracking-wide active:scale-95 transition-transform" onClick={onQuickTurn}>180</button>
        <button className="h-12 rounded-xl bg-slate-900/90 border border-cyan-300/25 text-white font-black text-xs active:scale-95 transition-transform" onClick={onRotateRight}>Turn R</button>
        <div />
        <button className="h-12 rounded-xl bg-slate-900/90 border border-cyan-300/25 text-white font-black text-xs active:scale-95 transition-transform" onClick={onBackstep}>Back</button>
        <div />
        <button className="h-10 rounded-xl bg-slate-900/90 border border-cyan-300/25 text-white font-black text-[10px] active:scale-95 transition-transform" onClick={onStrafeLeft}>Strafe L</button>
        <div />
        <button className="h-10 rounded-xl bg-slate-900/90 border border-cyan-300/25 text-white font-black text-[10px] active:scale-95 transition-transform" onClick={onStrafeRight}>Strafe R</button>
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
    const [isShortViewport, setIsShortViewport] = useState(() => window.innerHeight < 760);
    const [mobileTrapDrawerOpen, setMobileTrapDrawerOpen] = useState(false);
    const [trapSetPanel, setTrapSetPanel] = useState<'TRAP_SET' | 'ENEMY_DATA' | 'MAP'>('TRAP_SET');
    const [trapConfirmTarget, setTrapConfirmTarget] = useState<{ x: number; z: number } | null>(null);

    useEffect(() => {
        const onResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsShortViewport(window.innerHeight < 760);
        };
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
    const trapSetMode = explorationState.tacticalPaused;
    const showPlacementGrid = trapSetMode;
    const showTargetingOverlays = trapSetMode || !!selectedTrap;
    const armedSurfaceCount = useMemo(() => {
        const base = { floor: 0, wall: 0, ceiling: 0 };
        explorationState.traps.forEach(trap => {
            if (!trap.isArmed || !trap.placementSurface) return;
            base[trap.placementSurface] += 1;
        });
        return base;
    }, [explorationState.traps]);
    const currentRoomDoors = useMemo(() => {
        if (!explorationState.roomGraphRef || !explorationState.currentRoomId) return [];
        return Object.values(explorationState.roomGraphRef.doors).filter(
            door => door.fromRoomId === explorationState.currentRoomId || door.toRoomId === explorationState.currentRoomId
        );
    }, [explorationState.roomGraphRef, explorationState.currentRoomId]);

    const facing = explorationState.trapOrientation;
    const facingVector = useMemo(() => orientationToVector(facing), [facing]);
    const leftVector = useMemo(() => ({ x: facingVector.z, z: -facingVector.x }), [facingVector.x, facingVector.z]);
    const rightVector = useMemo(() => ({ x: -facingVector.z, z: facingVector.x }), [facingVector.x, facingVector.z]);

    const attemptForward = useCallback(() => {
        dispatchTacticalAction({ type: 'MoveStep', dx: facingVector.x, dz: facingVector.z });
    }, [dispatchTacticalAction, facingVector.x, facingVector.z]);

    const attemptBackstep = useCallback(() => {
        dispatchTacticalAction({ type: 'MoveStep', dx: -facingVector.x, dz: -facingVector.z });
    }, [dispatchTacticalAction, facingVector.x, facingVector.z]);

    const attemptStrafeLeft = useCallback(() => {
        dispatchTacticalAction({ type: 'MoveStep', dx: leftVector.x, dz: leftVector.z });
    }, [dispatchTacticalAction, leftVector.x, leftVector.z]);

    const attemptStrafeRight = useCallback(() => {
        dispatchTacticalAction({ type: 'MoveStep', dx: rightVector.x, dz: rightVector.z });
    }, [dispatchTacticalAction, rightVector.x, rightVector.z]);

    const rotateLeft = useCallback(() => {
        dispatchTacticalAction({ type: 'SetTrapOrientation', orientation: rotateOrientationLeft(facing) });
    }, [dispatchTacticalAction, facing]);

    const rotateRight = useCallback(() => {
        dispatchTacticalAction({ type: 'SetTrapOrientation', orientation: rotateOrientationRight(facing) });
    }, [dispatchTacticalAction, facing]);

    const quickTurn = useCallback(() => {
        dispatchTacticalAction({ type: 'SetTrapOrientation', orientation: rotateOrientationRight(rotateOrientationRight(facing)) });
    }, [dispatchTacticalAction, facing]);

    const lockOnNearestEnemy = useCallback(() => {
        const aliveEnemies = explorationState.zoneEnemies.filter(enemy => !enemy.isDefeated);
        if (aliveEnemies.length === 0) return;
        const playerPos = explorationState.playerMapPos;
        const nearest = [...aliveEnemies].sort((a, b) => {
            const da = Math.abs(a.x - playerPos.x) + Math.abs(a.z - playerPos.z);
            const db = Math.abs(b.x - playerPos.x) + Math.abs(b.z - playerPos.z);
            return da - db;
        })[0];
        const deltaX = nearest.x - playerPos.x;
        const deltaZ = nearest.z - playerPos.z;
        const nextOrientation = Math.abs(deltaX) > Math.abs(deltaZ)
            ? (deltaX > 0 ? 'E' : 'W')
            : (deltaZ > 0 ? 'S' : 'N');
        dispatchTacticalAction({ type: 'SetTrapOrientation', orientation: nextOrientation });
        dispatchTacticalAction({ type: 'SetCameraMode', cameraMode: 'OVER_SHOULDER' });
    }, [dispatchTacticalAction, explorationState.playerMapPos, explorationState.zoneEnemies]);

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
        if (!trapSetMode) return;
        setTrapConfirmTarget(null);
    }, [selectedTrap, trapSetMode, dispatchTacticalAction, trapConfirmTarget]);

    useEffect(() => {
        if (!selectedTrap) {
            setTrapConfirmTarget(null);
        }
    }, [selectedTrap]);

    useEffect(() => {
        const desiredCamera = trapSetMode ? 'TACTICAL_ZOOM' : 'OVER_SHOULDER';
        if (explorationState.cameraMode !== desiredCamera) {
            dispatchTacticalAction({ type: 'SetCameraMode', cameraMode: desiredCamera });
        }
    }, [trapSetMode, explorationState.cameraMode, dispatchTacticalAction]);

    useEffect(() => {
        if (!isMobile) {
            setMobileTrapDrawerOpen(true);
            return;
        }
        setMobileTrapDrawerOpen(trapSetMode);
    }, [isMobile, trapSetMode]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (gameState !== GameState.EXPLORATION_3D) return;

            if (event.key === 'w' || event.key === 'ArrowUp') {
                event.preventDefault();
                attemptForward();
            } else if (event.key === 's' || event.key === 'ArrowDown') {
                event.preventDefault();
                attemptBackstep();
            } else if (event.key === 'a' || event.key === 'ArrowLeft') {
                event.preventDefault();
                rotateLeft();
            } else if (event.key === 'd' || event.key === 'ArrowRight') {
                event.preventDefault();
                rotateRight();
            } else if (event.key.toLowerCase() === 'q') {
                event.preventDefault();
                if (trapSetMode) {
                    const order = ['N', 'W', 'S', 'E'] as const;
                    const idx = order.indexOf(explorationState.trapOrientation);
                    dispatchTacticalAction({ type: 'SetTrapOrientation', orientation: order[(idx + 1) % order.length] });
                } else {
                    attemptStrafeLeft();
                }
            } else if (event.key.toLowerCase() === 'e') {
                event.preventDefault();
                if (trapSetMode) {
                    const order = ['N', 'E', 'S', 'W'] as const;
                    const idx = order.indexOf(explorationState.trapOrientation);
                    dispatchTacticalAction({ type: 'SetTrapOrientation', orientation: order[(idx + 1) % order.length] });
                } else {
                    attemptStrafeRight();
                }
            } else if (event.key.toLowerCase() === 'p') {
                event.preventDefault();
                dispatchTacticalAction({ type: 'ToggleTacticalPause' });
            } else if (event.key.toLowerCase() === 'm') {
                event.preventDefault();
                dispatchTacticalAction({ type: 'ToggleMinimap' });
            } else if (event.key.toLowerCase() === 'l') {
                event.preventDefault();
                lockOnNearestEnemy();
            } else if (event.key === ' ') {
                event.preventDefault();
                quickTurn();
            } else if (event.key === '1') {
                event.preventDefault();
                dispatchTacticalAction({ type: 'TriggerTrapSurface', surface: 'floor' });
            } else if (event.key === '2') {
                event.preventDefault();
                dispatchTacticalAction({ type: 'TriggerTrapSurface', surface: 'wall' });
            } else if (event.key === '3') {
                event.preventDefault();
                dispatchTacticalAction({ type: 'TriggerTrapSurface', surface: 'ceiling' });
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        attemptBackstep,
        attemptForward,
        attemptStrafeLeft,
        attemptStrafeRight,
        dispatchTacticalAction,
        gameState,
        lockOnNearestEnemy,
        quickTurn,
        rotateLeft,
        rotateRight,
        trapSetMode,
        explorationState.trapOrientation,
    ]);

    if (gameState !== GameState.EXPLORATION_3D) return null;

    return (
        <div className="w-full h-[100dvh] min-h-[100svh] relative overflow-hidden bg-[#04070b]">
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
                    environmentTraps={explorationState.environmentTraps.map(env => ({
                        id: env.id,
                        x: env.position.x,
                        z: env.position.z,
                        type: env.type,
                    }))}
                    highlightedTiles={explorationState.highlightedTiles}
                    trapAimTarget={explorationState.trapAimTarget}
                    selectedTrapRange={selectedTrap ? (tacticalUiState.selectedTrapRange ?? TRAP_DATA[selectedTrap].range) : null}
                    selectedTrapType={selectedTrap}
                    showTargetingOverlays={showTargetingOverlays}
                    showPlacementGrid={showPlacementGrid}
                    onTilePress={handleTilePress}
                    playerSpriteUrl={player?.visual?.spriteUrl}
                />
            </Canvas>

            <div className="absolute inset-0 pointer-events-none flex flex-col">
                {!trapSetMode && (
                <div className={`pointer-events-auto ${isMobile ? 'px-2 pt-2' : 'p-2 sm:p-3'}`}>
                    <div className={`mx-auto rounded-xl border border-cyan-300/25 bg-gradient-to-b from-[#0b1321]/92 to-[#090f1a]/88 shadow-[0_10px_28px_rgba(0,0,0,0.48)] backdrop-blur-md ${isMobile ? 'max-w-[96vw]' : 'max-w-[920px]'}`}>
                        <div className={`flex items-start justify-between gap-2 ${isMobile ? 'p-2' : 'p-2 sm:p-2.5'}`}>
                            <div className="min-w-0">
                                <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/90 font-bold">
                                    {explorationState.zoneContext?.kind === 'dungeon' ? 'Dungeon Hunt' : 'Trap Hunt'}
                                </div>
                                <h2 className={`text-white font-black leading-none truncate tracking-wide ${isMobile ? 'text-sm' : 'text-base sm:text-lg'}`}>{tacticalUiState.zoneName}</h2>
                                <p className={`text-cyan-100/75 mt-1 truncate ${isMobile ? 'text-[10px]' : 'text-[11px]'} ${tacticalUiState.blockReason ? 'motion-safe:animate-pulse text-amber-200' : ''}`}>{statusMessage}</p>
                                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] sm:text-[11px]">
                                    <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-white/10 text-white font-bold">HP {player?.stats.hp ?? 0}/{player?.stats.maxHp ?? 0}</span>
                                    <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-white/10 text-white font-bold">ENEM {tacticalUiState.enemyCount}</span>
                                    <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-white/10 text-white font-bold">PASO {tacticalUiState.turnStep}</span>
                                    <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-white/10 text-white font-bold">TRAPS {tacticalUiState.trapCount}/{tacticalUiState.maxTraps}</span>
                                    {(!isMobile || trapSetMode) && (
                                        <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-cyan-300/30 text-cyan-200 font-bold">FACING {facing}</span>
                                    )}
                                    {trapSetMode && (
                                        <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-amber-300/30 text-amber-200 font-bold">COMBO x{(tacticalUiState.comboMultiplier ?? 1).toFixed(2)}</span>
                                    )}
                                    {trapSetMode && (
                                        <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-emerald-300/30 text-emerald-200 font-bold">ARK {tacticalUiState.trapCurrency ?? 0}</span>
                                    )}
                                    {trapSetMode && (
                                        <span className="px-2 py-[3px] rounded-md bg-slate-900/90 border border-cyan-300/30 text-cyan-200 font-bold">{tacticalUiState.stepPhase || 'PLAYER_STEP'}</span>
                                    )}
                                    <span className={`px-2 py-[3px] rounded-md border font-bold ${trapSetMode ? 'bg-amber-400 text-black border-amber-300' : 'bg-slate-900/90 border-white/10 text-white'}`}>{trapSetMode ? 'TRAP SET' : 'RUN'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <button onClick={() => dispatchTacticalAction({ type: 'ToggleMinimap' })} className="px-2 py-1.5 rounded-lg text-[10px] sm:text-xs font-black bg-slate-800/90 text-white border border-white/10 hover:border-cyan-300/40 transition-colors">
                                    {explorationState.showMinimap ? 'Radar Off' : 'Radar'}
                                </button>
                                <button onClick={() => dispatchTacticalAction({ type: 'ToggleTacticalPause' })} className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black transition-all ${trapSetMode ? 'bg-amber-400 text-black motion-safe:animate-pulse' : 'bg-slate-800/90 text-white border border-white/10 hover:border-cyan-300/40'}`}>
                                    {trapSetMode ? 'Run' : 'Trap Set'}
                                </button>
                                <button onClick={() => dispatchTacticalAction({ type: 'ExitTrapZone' })} className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-xs font-black transition-colors">
                                    Salir
                                </button>
                            </div>
                        </div>
                        {trapSetMode && (!isMobile || !isShortViewport) && (
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
                )}

                {trapSetMode && (
                    <div className={`pointer-events-auto ${isMobile ? 'px-2 pt-2' : 'p-2 sm:p-3'}`}>
                        <div className={`mx-auto rounded-xl border border-amber-300/35 bg-gradient-to-b from-[#101722]/95 to-[#0c1320]/92 shadow-[0_10px_28px_rgba(0,0,0,0.56)] backdrop-blur-md ${isMobile ? 'max-w-[96vw]' : 'max-w-[980px]'}`}>
                            <div className="p-2 sm:p-3 flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/90 font-bold">Trap Set</div>
                                    <h2 className="text-white font-black text-base sm:text-lg leading-none truncate tracking-wide">{tacticalUiState.zoneName}</h2>
                                    <p className="text-cyan-100/75 text-[11px] mt-1 truncate">{statusMessage}</p>
                                </div>
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                    <button onClick={() => setTrapSetPanel('TRAP_SET')} className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-black border ${trapSetPanel === 'TRAP_SET' ? 'bg-amber-400 text-black border-amber-300' : 'bg-slate-800/90 text-white border-white/10'}`}>TRAP SET</button>
                                    <button onClick={() => setTrapSetPanel('ENEMY_DATA')} className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-black border ${trapSetPanel === 'ENEMY_DATA' ? 'bg-amber-400 text-black border-amber-300' : 'bg-slate-800/90 text-white border-white/10'}`}>ENEMY DATA</button>
                                    <button onClick={() => setTrapSetPanel('MAP')} className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-black border ${trapSetPanel === 'MAP' ? 'bg-amber-400 text-black border-amber-300' : 'bg-slate-800/90 text-white border-white/10'}`}>MAP</button>
                                    <button onClick={() => dispatchTacticalAction({ type: 'ToggleTacticalPause' })} className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black bg-amber-400 text-black">Run</button>
                                    <button onClick={() => dispatchTacticalAction({ type: 'ExitTrapZone' })} className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-xs font-black transition-colors">Salir</button>
                                </div>
                            </div>
                            <div className="px-2 pb-2">
                                {trapSetPanel === 'TRAP_SET' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 text-[10px] sm:text-[11px]">
                                        <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">TRAPS</span><div className="text-white font-black">{tacticalUiState.trapCount}/{tacticalUiState.maxTraps}</div></div>
                                        <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">FACING</span><div className="text-white font-black">{facing}</div></div>
                                        <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">Riesgo</span><div className="text-white font-black">{tacticalUiState.riskLabel || 'Moderado'}</div></div>
                                        <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">Timeline</span><div className="text-white font-black">{tacticalUiState.timelineLabel || 'Dia 0'}</div></div>
                                        <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">Sala</span><div className="text-white font-black">{explorationState.currentRoomId || '-'}</div></div>
                                        <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">COMBO</span><div className="text-white font-black">x{(tacticalUiState.comboMultiplier ?? 1).toFixed(2)}</div></div>
                                        <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">ARK</span><div className="text-white font-black">{tacticalUiState.trapCurrency ?? 0}</div></div>
                                        <div className="rounded-xl bg-slate-900/85 border border-white/10 p-2"><span className="text-white/50">PASO</span><div className="text-white font-black">{tacticalUiState.turnStep}</div></div>
                                    </div>
                                )}
                                {trapSetPanel === 'ENEMY_DATA' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto">
                                        {explorationState.zoneEnemies.filter(enemy => !enemy.isDefeated).map(enemy => (
                                            <div key={enemy.id} className="rounded-lg border border-white/10 bg-slate-900/80 p-2 text-[11px] text-white">
                                                <div className="font-black">{enemy.name}</div>
                                                <div>HP {enemy.hp}/{enemy.maxHp}</div>
                                                <div>AI {enemy.aiState} | IQ {enemy.intelligenceLevel}</div>
                                                <div className="text-cyan-200/90">Res F/W/C: {Math.round(enemy.resistances.floor * 100)} / {Math.round(enemy.resistances.wall * 100)} / {Math.round(enemy.resistances.ceiling * 100)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {trapSetPanel === 'MAP' && (
                                    <div className="text-[11px] text-cyan-100/85 grid md:grid-cols-[248px,1fr] gap-2 items-start">
                                        <Exploration3DMinimap
                                            embedded
                                            kageroStyle
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
                                        <div>
                                            <div className="mb-1 font-black text-white">Room Network</div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[160px] overflow-y-auto">
                                                {(explorationState.roomGraphRef ? Object.values(explorationState.roomGraphRef.rooms) : []).map(room => (
                                                    <div key={room.id} className={`rounded-md px-2 py-1 border ${room.id === explorationState.currentRoomId ? 'border-amber-300 bg-amber-400/25 text-amber-100' : 'border-white/10 bg-slate-900/70 text-white'}`}>
                                                        {room.label}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1" />

                <div className={`pointer-events-auto grid gap-2 md:grid-cols-[1fr,auto] items-end ${isMobile ? 'px-2 pb-[calc(env(safe-area-inset-bottom)+8px)]' : 'p-2 sm:p-3'}`}>
                    <div className={`order-2 md:order-1 mx-auto w-full rounded-xl border border-cyan-300/25 bg-gradient-to-b from-[#0b1321]/90 to-[#0b1019]/84 backdrop-blur-md ${isMobile ? 'max-w-[96vw] p-1.5' : 'max-w-[880px] p-2'}`}>
                        {!trapSetMode ? (
                            <>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => dispatchTacticalAction({ type: 'TriggerTrapSurface', surface: 'floor' })}
                                        className={`rounded-lg px-2 py-2 text-left border transition-all ${armedSurfaceCount.floor > 0 ? 'border-orange-300 bg-orange-950/40 text-orange-100 shadow-[0_0_12px_rgba(251,146,60,0.25)] motion-safe:animate-pulse' : 'border-white/15 bg-slate-900/88 text-white'}`}
                                    >
                                        <div className="text-[10px] uppercase font-black tracking-wide">Piso (X)</div>
                                        <div className="text-[11px] font-bold">{isMobile ? 'Tap directo' : 'Tecla 1'}</div>
                                    </button>
                                    <button
                                        onClick={() => dispatchTacticalAction({ type: 'TriggerTrapSurface', surface: 'wall' })}
                                        className={`rounded-lg px-2 py-2 text-left border transition-all ${armedSurfaceCount.wall > 0 ? 'border-cyan-300 bg-cyan-950/40 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.22)] motion-safe:animate-pulse' : 'border-white/15 bg-slate-900/88 text-white'}`}
                                    >
                                        <div className="text-[10px] uppercase font-black tracking-wide">Pared ([])</div>
                                        <div className="text-[11px] font-bold">{isMobile ? 'Tap directo' : 'Tecla 2'}</div>
                                    </button>
                                    <button
                                        onClick={() => dispatchTacticalAction({ type: 'TriggerTrapSurface', surface: 'ceiling' })}
                                        className={`rounded-lg px-2 py-2 text-left border transition-all ${armedSurfaceCount.ceiling > 0 ? 'border-violet-300 bg-violet-950/40 text-violet-100 shadow-[0_0_12px_rgba(167,139,250,0.22)] motion-safe:animate-pulse' : 'border-white/15 bg-slate-900/88 text-white'}`}
                                    >
                                        <div className="text-[10px] uppercase font-black tracking-wide">Techo (/\\)</div>
                                        <div className="text-[11px] font-bold">{isMobile ? 'Tap directo' : 'Tecla 3'}</div>
                                    </button>
                                </div>
                                {isMobile && (
                                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={quickTurn}
                                            className="rounded-lg px-2 py-2 text-[11px] font-black border border-amber-300/40 text-amber-200 bg-amber-950/45"
                                        >
                                            Giro 180
                                        </button>
                                        <button
                                            onClick={lockOnNearestEnemy}
                                            className="rounded-lg px-2 py-2 text-[11px] font-black border border-cyan-300/40 text-cyan-200 bg-cyan-950/45"
                                        >
                                            Lock
                                        </button>
                                    </div>
                                )}
                                <div className="mt-2 text-[11px] text-white/50">
                                    {isMobile
                                        ? 'Tank: forward/back + turn + strafe | Trap Set para preparar'
                                        : 'Tank: W/S avance-retroceso | A/D giro | Q/E strafe | Space 180 | L lock'}
                                </div>
                            </>
                        ) : (
                            <>
                                {isMobile && (
                                    <div className="mb-2 flex justify-end">
                                        <button
                                            onClick={() => setMobileTrapDrawerOpen(prev => !prev)}
                                            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-slate-800/90 text-white border border-white/10"
                                        >
                                            {mobileTrapDrawerOpen ? 'Ocultar Deck' : 'Abrir Deck'}
                                        </button>
                                    </div>
                                )}
                                {(!isMobile || mobileTrapDrawerOpen) && (
                                    <>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="text-white font-black text-xs sm:text-sm tracking-wide">
                                        {tacticalUiState.trapCount}/{tacticalUiState.maxTraps} colocadas
                                    </div>
                                    <div className="text-right text-[10px] sm:text-[11px] text-cyan-100/70">
                                        {trapConfirmTarget && selectedTrap
                                            ? `Confirmar en ${trapConfirmTarget.x},${trapConfirmTarget.z}`
                                            : selectedTrap
                                            ? `${TRAP_DATA[selectedTrap].name} - Alc ${tacticalUiState.selectedTrapRange ?? TRAP_DATA[selectedTrap].range}`
                                            : 'Selecciona trampa'}
                                    </div>
                                </div>
                                <div className="flex gap-1.5 overflow-x-auto pb-1 md:grid md:grid-cols-6 md:gap-2 md:overflow-visible md:pb-0">
                                    {(Object.keys(TRAP_DATA) as TrapType[]).slice(0, 6).map(type => (
                                        (() => {
                                            const mastery = explorationState.trapMastery[type];
                                            const isLocked = !mastery?.unlocked;
                                            const cooldown = explorationState.trapCooldowns[type] ?? 0;
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => dispatchTacticalAction({ type: 'SelectTrap', trapType: selectedTrap === type ? null : type })}
                                                    className={`min-w-[112px] md:min-w-0 rounded-xl px-2 py-2 text-left border transition-all duration-150 hover:-translate-y-[1px] ${
                                                        isLocked
                                                            ? 'bg-slate-950/95 text-slate-500 border-slate-700'
                                                            : selectedTrap === type
                                                            ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)]'
                                                            : 'bg-slate-900/88 text-white border-white/10 hover:border-cyan-300/45'
                                                    }`}
                                                >
                                                    <div className="text-[10px] uppercase font-black">{type}</div>
                                                    <div className={`text-[11px] mt-1 ${selectedTrap === type ? 'text-black/75' : 'text-white/65'}`}>
                                                        {isLocked ? `Lock ${TRAP_DATA[type].unlockCost ?? 0}` : `Alc ${TRAP_DATA[type].range}`}
                                                    </div>
                                                    <div className={`text-[10px] mt-0.5 ${selectedTrap === type ? 'text-black/75' : 'text-white/55'}`}>
                                                        Lvl {mastery?.level ?? 1} {cooldown > 0 ? `| CD ${cooldown}` : ''}
                                                    </div>
                                                </button>
                                            );
                                        })()
                                    ))}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {selectedTrap && (
                                        <button onClick={() => dispatchTacticalAction({ type: 'UpgradeTrap', trapType: selectedTrap })} className="px-2 py-1 rounded-md text-[10px] font-black border border-emerald-300/40 text-emerald-200 bg-emerald-950/40">Upgrade {selectedTrap}</button>
                                    )}
                                    <button onClick={() => dispatchTacticalAction({ type: 'SetTrapOrientation', orientation: 'N' })} className="px-2 py-1 rounded-md text-[10px] font-black border border-cyan-300/40 text-cyan-200 bg-cyan-950/40">N</button>
                                    <button onClick={() => dispatchTacticalAction({ type: 'SetTrapOrientation', orientation: 'E' })} className="px-2 py-1 rounded-md text-[10px] font-black border border-cyan-300/40 text-cyan-200 bg-cyan-950/40">E</button>
                                    <button onClick={() => dispatchTacticalAction({ type: 'SetTrapOrientation', orientation: 'S' })} className="px-2 py-1 rounded-md text-[10px] font-black border border-cyan-300/40 text-cyan-200 bg-cyan-950/40">S</button>
                                    <button onClick={() => dispatchTacticalAction({ type: 'SetTrapOrientation', orientation: 'W' })} className="px-2 py-1 rounded-md text-[10px] font-black border border-cyan-300/40 text-cyan-200 bg-cyan-950/40">W</button>
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
                                        ? 'Trap Set: tap en tile para colocar | confirma al segundo tap'
                                        : 'Trap Set: click para apuntar/confirmar | Q/E rota rapido'}
                                </div>
                                <div className="mt-1 text-[10px] text-cyan-200/75">
                                    Superficie valida: verde | invalida: rojo (piso/pared/techo segun trampa).
                                </div>
                                {trapSetPanel !== 'TRAP_SET' && (
                                    <div className="mt-2 rounded-lg border border-amber-300/35 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-100">
                                        Panel activo arriba: {trapSetPanel.replace('_', ' ')}.
                                    </div>
                                )}
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    {isMobile && !trapSetMode && (
                        <div className="order-1 flex justify-center">
                            <DirectionPad
                                onForward={attemptForward}
                                onBackstep={attemptBackstep}
                                onRotateLeft={rotateLeft}
                                onRotateRight={rotateRight}
                                onStrafeLeft={attemptStrafeLeft}
                                onStrafeRight={attemptStrafeRight}
                                onQuickTurn={quickTurn}
                            />
                        </div>
                    )}
                </div>
            </div>

            {explorationState.showMinimap && !trapSetMode && (
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
