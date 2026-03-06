
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { TrapMarker } from './TrapMarker';
import { Exploration3DMinimap } from './Exploration3DMinimap';
import { AssetManager } from '../services/AssetManager';
import { GameState } from '../types';

import { inputManager, InputType } from '../services/input/InputManager';

interface MapCell {
    x: number;
    z: number;
    type: 'FLOOR' | 'WALL' | 'TREE' | 'ROCK' | 'WATER';
    height: number;
}

const MAP_SIZE = 20;

const generateExplorationMap = (): MapCell[][] => {
    const map: MapCell[][] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
        map[x] = [];
        for (let z = 0; z < MAP_SIZE; z++) {
            let cellType: MapCell['type'] = 'FLOOR';
            let height = 0;
            if (x === 0 || x === MAP_SIZE - 1 || z === 0 || z === MAP_SIZE - 1) {
                cellType = 'WALL';
                height = 2;
            } else if (Math.random() < 0.12) {
                cellType = 'TREE';
                height = 3 + Math.random() * 2;
            } else if (Math.random() < 0.04) {
                cellType = 'ROCK';
                height = 1 + Math.random();
            } else if (Math.random() < 0.02) {
                cellType = 'WATER';
                height = -0.5;
            }
            map[x][z] = { x, z, type: cellType, height };
        }
    }
    map[Math.floor(MAP_SIZE / 2)][Math.floor(MAP_SIZE / 2)] = { x: Math.floor(MAP_SIZE / 2), z: Math.floor(MAP_SIZE / 2), type: 'FLOOR', height: 0 };
    return map;
};

const FloorTile: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <mesh position={position} receiveShadow>
        <boxGeometry args={[0.95, 0.1, 0.95]} />
        <meshStandardMaterial color="#4ade80" roughness={0.8} />
    </mesh>
);

const Wall: React.FC<{ position: [number, number, number]; height: number }> = ({ position, height }) => (
    <group position={position}>
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[1, height, 1]} />
            <meshStandardMaterial color="#57534e" roughness={0.9} />
        </mesh>
    </group>
);

const Tree: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <group position={position}>
        <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
            <meshStandardMaterial color="#78350f" />
        </mesh>
        <mesh position={[0, 2.5, 0]} castShadow>
            <coneGeometry args={[1, 2, 8]} />
            <meshStandardMaterial color="#166534" />
        </mesh>
    </group>
);

const Rock: React.FC<{ position: [number, number, number] }> = ({ position }) => (
    <mesh position={[position[0], position[1] + 0.3, position[2]]} castShadow>
        <dodecahedronGeometry args={[0.4]} />
        <meshStandardMaterial color="#6b7280" roughness={1} />
    </mesh>
);

const Water: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.05;
        }
    });
    return (
        <mesh ref={meshRef} position={position}>
            <boxGeometry args={[0.95, 0.1, 0.95]} />
            <meshStandardMaterial color="#3b82f6" transparent opacity={0.7} roughness={0.1} />
        </mesh>
    );
};

// small helper to safely load a texture into a sprite material
const SafeSprite3D: React.FC<{ url?: string; onLoaded?: (tex: THREE.Texture) => void }> = ({ url, onLoaded }) => {
    const [tex, setTex] = useState<THREE.Texture | null>(null);
    useEffect(() => {
        if (!url) return;
        const loader = new THREE.TextureLoader();
        const safeUrl = AssetManager.getSafeSprite(url);
        loader.load(
            safeUrl,
            (t) => {
                t.magFilter = THREE.NearestFilter;
                t.minFilter = THREE.NearestFilter;
                setTex(t);
                if (onLoaded) onLoaded(t);
            },
            undefined,
            () => {
                console.warn('[SafeSprite3D] Failed to load sprite:', url);
                // Try fallback
                loader.load(AssetManager.getSafeSprite(AssetManager.FALLBACK_SPRITE), (fbTex) => {
                    setTex(fbTex);
                    if (onLoaded) onLoaded(fbTex);
                });
            }
        );
    }, [url]);
    if (!tex) return null;
    return <spriteMaterial map={tex} transparent alphaTest={0.5} />;
};

const PlayerCharacter: React.FC<{ position: [number, number, number]; hp: number; maxHp: number; spriteUrl?: string }> = ({ position, hp, maxHp, spriteUrl }) => {
    const hpPercent = hp / maxHp;
    const hpColor = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
    const [scale, setScale] = useState<[number, number, number]>([1.2, 1.8, 1]);

    const handleLoaded = useCallback((tex: THREE.Texture) => {
        if (tex.image) {
            const aspect = tex.image.width / tex.image.height;
            const height = 1.8;
            setScale([height * aspect, height, 1]);
        }
    }, []);

    return (
        <group position={position}>
            {spriteUrl ? (
                <sprite scale={scale} position={[0, 0.9, 0]}>
                    <SafeSprite3D url={spriteUrl} onLoaded={handleLoaded} />
                </sprite>
            ) : null}
            <mesh position={[0, 1.5, 0]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshBasicMaterial color={hpColor} />
            </mesh>
        </group>
    );
};


const EnemyCharacter: React.FC<{ position: [number, number, number]; spriteUrl?: string; isDefeated: boolean }> = ({ position, spriteUrl, isDefeated }) => {
    const [scale, setScale] = useState<[number, number, number]>([1.3, 1.3, 1]);

    const handleLoaded = useCallback((tex: THREE.Texture) => {
        if (tex.image) {
            const aspect = tex.image.width / tex.image.height;
            const height = 1.6;
            setScale([height * aspect, height, 1]);
        }
    }, []);

    if (isDefeated) return null;
    return (
        <group position={position}>
            {spriteUrl && (
                <sprite scale={scale} position={[0, 0.8, 0]}>
                    <SafeSprite3D url={spriteUrl} onLoaded={handleLoaded} />
                </sprite>
            )}
        </group>
    );
};


const ExplorationMap: React.FC<{
    map: MapCell[][];
    playerPos: { x: number; z: number };
    playerHp: number;
    playerMaxHp: number;
    playerSpriteUrl?: string;
    enemies: { id: string; x: number; z: number; spriteUrl?: string; isDefeated: boolean }[];
    traps: { id: string; x: number; z: number; type: string; isArmed: boolean }[];
}> = ({ map, playerPos, playerHp, playerMaxHp, playerSpriteUrl, enemies, traps }) => (
    <group>
        {map.map((row, x) => row.map((cell, z) => {
            const pos: [number, number, number] = [x - MAP_SIZE / 2, cell.height * 0.1, z - MAP_SIZE / 2];
            if (cell.type === 'FLOOR') return <FloorTile key={`floor-${x}-${z}`} position={pos} />;
            if (cell.type === 'WALL') return <Wall key={`wall-${x}-${z}`} position={pos} height={cell.height} />;
            if (cell.type === 'TREE') return <Tree key={`tree-${x}-${z}`} position={pos} />;
            if (cell.type === 'ROCK') return <Rock key={`rock-${x}-${z}`} position={pos} />;
            if (cell.type === 'WATER') return <Water key={`water-${x}-${z}`} position={pos} />;
            return null;
        }))}
        <PlayerCharacter position={[playerPos.x - MAP_SIZE / 2, 0, playerPos.z - MAP_SIZE / 2]} hp={playerHp} maxHp={playerMaxHp} spriteUrl={playerSpriteUrl} />
        {enemies.map(enemy => (
            <EnemyCharacter key={enemy.id} position={[enemy.x - MAP_SIZE / 2, 0, enemy.z - MAP_SIZE / 2]} spriteUrl={enemy.spriteUrl} isDefeated={enemy.isDefeated} />
        ))}
        {traps.map(trap => trap.isArmed && (
            <TrapMarker key={trap.id} position={[trap.x - MAP_SIZE / 2, 0.1, trap.z - MAP_SIZE / 2]} trapType={trap.type} isArmed={trap.isArmed} />
        ))}
    </group>
);

const VirtualJoystick: React.FC<{
    onMove: (dx: number, dy: number) => void;
    onRelease: () => void;
}> = ({ onMove, onRelease }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const [hasMoved, setHasMoved] = useState(false);
    const baseSize = 120;
    const maxDistance = 40;

    const handleStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setStartPos({ x: touch.clientX, y: touch.clientY });
        setCurrentPos({ x: touch.clientX, y: touch.clientY });
        setIsDragging(true);
        setHasMoved(false);
    };

    const handleMove = (e: React.TouchEvent) => {
        if (!isDragging || hasMoved) return;
        e.preventDefault();
        const touch = e.touches[0];
        setCurrentPos({ x: touch.clientX, y: touch.clientY });
        
        const dx = Math.max(-1, Math.min(1, (touch.clientX - startPos.x) / maxDistance));
        const dy = Math.max(-1, Math.min(1, (touch.clientY - startPos.y) / maxDistance));
        
        if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
            onMove(dx, dy);
            setHasMoved(true);
        }
    };

    const handleEnd = () => {
        setIsDragging(false);
        setCurrentPos(startPos);
        setHasMoved(false);
        onRelease();
    };

    const distance = Math.sqrt(Math.pow(currentPos.x - startPos.x, 2) + Math.pow(currentPos.y - startPos.y, 2));
    const clampedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(currentPos.y - startPos.y, currentPos.x - startPos.x);
    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;

    return (
        <div 
            className="absolute bottom-32 left-8 touch-none select-none"
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        >
            <div 
                className="w-28 h-28 rounded-full bg-black/40 border-4 border-white/20 flex items-center justify-center"
                style={{ width: baseSize, height: baseSize }}
            >
                <div 
                    className="w-12 h-12 rounded-full bg-white/30 border-2 border-white/50 transition-transform"
                    style={{ 
                        transform: `translate(${knobX}px, ${knobY}px)`,
                        backgroundColor: isDragging ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)'
                    }}
                />
            </div>
        </div>
    );
};

const TrapButton: React.FC<{
    type: string;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    onPlace: () => void;
}> = ({ type, index, isSelected, onSelect, onPlace }) => {
    const [isLongPressing, setIsLongPressing] = useState(false);
    const longPressTimer = useRef<number | null>(null);
    
    const handleTouchStart = () => {
        longPressTimer.current = window.setTimeout(() => {
            setIsLongPressing(true);
            onPlace();
        }, 500);
    };
    
    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setIsLongPressing(false);
    };
    
    const trapColors: Record<string, string> = {
        SPIKE: 'bg-gray-400',
        FIRE: 'bg-orange-500',
        ICE: 'bg-cyan-400',
        POISON: 'bg-purple-500',
        EXPLOSIVE: 'bg-red-500',
        STUN: 'bg-yellow-400'
    };
    
    return (
        <button
            onClick={onSelect}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className={`w-14 h-14 rounded-xl font-bold text-xs transition-all active:scale-90 flex flex-col items-center justify-center ${
                isSelected 
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50' 
                    : `${trapColors[type] || 'bg-black/60'} text-white/80 border border-white/20`
            } ${isLongPressing ? 'animate-pulse ring-4 ring-white' : ''}`}
        >
            <span>{index + 1}</span>
            <span className="text-[8px]">{type.charAt(0) + type.slice(1).toLowerCase()}</span>
        </button>
    );
};

export const Exploration3DScene: React.FC = () => {
    const map = useMemo(() => generateExplorationMap(), []);
    const [playerPos, setPlayerPos] = useState({ x: Math.floor(MAP_SIZE / 2), z: Math.floor(MAP_SIZE / 2) });
    const [selectedTrap, setSelectedTrap] = useState<string | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [targetPos, setTargetPos] = useState<{ x: number; z: number } | null>(null);
    const [canMove, setCanMove] = useState(true);
    const moveIntervalRef = useRef<number | null>(null);
    
    const gameState = useGameStore(s => s.gameState);
    const party = useGameStore(s => s.party);
    const explorationState = useGameStore(s => s.explorationState);
    const setGameState = useGameStore(s => s.setGameState);
    const initZone = useGameStore(s => s.initZone);
    const movePlayer = useGameStore(s => s.movePlayer);
    const placeTrap = useGameStore(s => s.placeTrap);
    const fatigue = useGameStore(s => s.fatigue);
    const supplies = useGameStore(s => s.supplies);
    const changeFatigue = useGameStore(s => s.changeFatigue);
    
    useEffect(() => {
        if (gameState === GameState.EXPLORATION_3D && explorationState.zoneEnemies.length === 0) {
            initZone('forest');
        }
    }, [gameState]);
    
    const currentPlayer = party[0];
    const playerHp = currentPlayer?.stats.hp || 1;
    const playerMaxHp = currentPlayer?.stats.maxHp || 1;
    const playerSpriteUrl = currentPlayer?.visual?.spriteUrl;
    
    const enemies = explorationState.zoneEnemies.map(e => ({
        id: e.id, x: e.x, z: e.z,
        spriteUrl: e.sprite,
        isDefeated: e.isDefeated
    }));
    
    const traps = explorationState.traps.map(t => ({
        id: t.id, x: t.position.x, z: t.position.z, type: t.type, isArmed: t.isArmed
    }));
    
    const aliveEnemies = explorationState.zoneEnemies.filter(e => !e.isDefeated).length;
    const zoneProgress = explorationState.zoneEnemies.length > 0 
        ? `${explorationState.zoneEnemies.length - aliveEnemies}/${explorationState.zoneEnemies.length}`
        : '0/0';
    
    const handleJoystickMove = useCallback((dx: number, dy: number) => {
        if (dx === 0 && dy === 0 || !canMove) return;
        
        const fatigue = useGameStore.getState().fatigue || 0;
        const supplies = useGameStore.getState().supplies || 0;
        
        // tile movement costs 1 fatigue and 0.5 supplies
        if (fatigue >= 1 && supplies >= 0.5) {
            let newX = playerPos.x;
            let newZ = playerPos.z;
            
            if (dy < -0.3) newZ -= 1;
            if (dy > 0.3) newZ += 1;
            if (dx < -0.3) newX -= 1;
            if (dx > 0.3) newX += 1;
            
            if (newX >= 0 && newX < MAP_SIZE && newZ >= 0 && newZ < MAP_SIZE) {
                const cell = map[newX][newZ];
                if (cell.type === 'FLOOR') {
                    setPlayerPos({ x: newX, z: newZ });
                    movePlayer(newX, newZ);
                    changeFatigue(1);  // increment fatigue
                    // reduce supplies: 0.5 per tile moved
                    useGameStore.setState(s => ({ supplies: Math.max(0, (s.supplies || 0) - 0.5) }));
                    setCanMove(false);
                    setTimeout(() => setCanMove(true), 150);
                }
            }
        }
    }, [playerPos, map, movePlayer, canMove]);
    
    const handleJoystickRelease = useCallback(() => {
        setIsMoving(false);
    }, []);
    
    useEffect(() => {
        const unsubscribe = inputManager.subscribe((event) => {
            if (event.type === InputType.MOVE_TO && event.x !== undefined && event.z !== undefined) {
                // handle direct move if needed for PC controls later
            }
        });
        return () => { unsubscribe(); };
    }, []);
    
    const handleTrapPlace = () => {
        if (selectedTrap) {
            placeTrap(selectedTrap as any, playerPos.x, playerPos.z);
        }
    };

    if (gameState !== GameState.EXPLORATION_3D) return null;

    return (
        <div className="w-full h-full relative bg-black">
            <Canvas shadows camera={{ position: [10, 15, 10], fov: 50 }}>
                <color attach="background" args={['#1e293b']} />
                <ambientLight intensity={0.4} />
                <directionalLight position={[10, 20, 10]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
                <fog attach="fog" args={['#1e293b', 10, 30]} />
                <ExplorationMap map={map} playerPos={playerPos} playerHp={playerHp} playerMaxHp={playerMaxHp} playerSpriteUrl={playerSpriteUrl} enemies={enemies} traps={traps} />
                <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 2.5} />
            </Canvas>
            
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex justify-between items-center">
                    <button 
                        onClick={() => setGameState(GameState.OVERWORLD)}
                        className="bg-blue-600/80 hover:bg-blue-500 px-4 py-2 rounded-xl font-bold text-white text-sm"
                    >
                        ← Volver
                    </button>
                    <div className="text-center">
                        <div className="text-amber-400 font-bold text-sm">{explorationState.zoneName}</div>
                        <div className="text-white/70 text-xs">Enemigos: {zoneProgress}</div>
                    </div>
                    <div className="bg-black/60 px-3 py-1 rounded-lg">
                        <div className="text-emerald-400 font-bold text-sm">HP</div>
                        <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${(playerHp / playerMaxHp) * 100}%` }} />
                        </div>
                    </div>
                    <div className="bg-black/60 px-3 py-1 rounded-lg">
                        <div className="text-orange-400 font-bold text-sm">Fatiga</div>
                        <div className="text-xs text-white">{fatigue || 0} / 100</div>
                    </div>
                    <div className="bg-black/60 px-3 py-1 rounded-lg">
                        <div className="text-blue-400 font-bold text-sm">Suministros</div>
                        <div className="text-xs text-white">{(supplies || 0).toFixed(1)}</div>
                    </div>
                </div>
            </div>
            
            {/* Virtual Joystick */}
            <VirtualJoystick onMove={handleJoystickMove} onRelease={handleJoystickRelease} />
            
            {/* Minimap */}
            <Exploration3DMinimap 
                mapSize={MAP_SIZE}
                playerPos={playerPos}
                enemies={enemies.map(e => ({ ...e, type: 'enemy', isDefeated: e.isDefeated }))}
                traps={traps}
                targetPos={targetPos}
            />
            
            {/* Trap Buttons - Bottom Right */}
            <div className="absolute bottom-4 right-4">
                <div className="grid grid-cols-3 gap-2">
                    {['SPIKE', 'FIRE', 'ICE', 'POISON', 'EXPLOSIVE', 'STUN'].map((type, i) => (
                        <TrapButton
                            key={type}
                            type={type}
                            index={i}
                            isSelected={selectedTrap === type}
                            onSelect={() => setSelectedTrap(selectedTrap === type ? null : type)}
                            onPlace={handleTrapPlace}
                        />
                    ))}
                </div>
                {selectedTrap && (
                    <button 
                        onClick={handleTrapPlace}
                        className="mt-2 w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold text-white text-sm active:scale-95"
                    >
                        Colocar Trampa
                    </button>
                )}
            </div>
            
            {/* Zone Complete Banner */}
            {explorationState.zoneCompleted && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                    <div className="bg-gradient-to-r from-amber-500 to-amber-700 p-8 rounded-2xl text-center animate-bounce">
                        <div className="text-3xl mb-2">🎉</div>
                        <div className="text-2xl font-black text-white">¡ZONA COMPLETADA!</div>
                        <button 
                            onClick={() => setGameState(GameState.OVERWORLD)}
                            className="mt-4 bg-white text-amber-700 px-6 py-3 rounded-xl font-bold"
                        >
                            Continuar →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Exploration3DScene;
