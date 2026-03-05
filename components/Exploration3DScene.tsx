
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture, Box, Plane, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import { TerrainType } from '../types';
import { useGameStore } from '../store/gameStore';
import { TerrainLayer } from './battle/TerrainLayer';
import { LightingSystem } from './battle/LightingSystem';
import { FogController } from './battle/FogController';
import { EntityRenderer } from './battle/EntityRenderer';
import { TrapMarker } from './TrapMarker';

interface ExplorationSceneProps {
    onEncounter?: () => void;
    onTrapTrigger?: (trapId: string) => void;
}

interface MapCell {
    x: number;
    z: number;
    type: 'FLOOR' | 'WALL' | 'TREE' | 'ROCK' | 'WATER' | 'TRAP';
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
            } else if (Math.random() < 0.15) {
                cellType = 'TREE';
                height = 3 + Math.random() * 2;
            } else if (Math.random() < 0.05) {
                cellType = 'ROCK';
                height = 1 + Math.random();
            } else if (Math.random() < 0.03) {
                cellType = 'WATER';
                height = -0.5;
            }
            
            map[x][z] = { x, z, type: cellType, height };
        }
    }
    map[Math.floor(MAP_SIZE / 2)][Math.floor(MAP_SIZE / 2)] = { x: Math.floor(MAP_SIZE / 2), z: Math.floor(MAP_SIZE / 2), type: 'FLOOR', height: 0 };
    return map;
};

const FloorTile: React.FC<{ position: [number, number, number]; color: string }> = ({ position, color }) => {
    return (
        <mesh position={position} receiveShadow>
            <boxGeometry args={[0.95, 0.1, 0.95]} />
            <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
    );
};

const Wall: React.FC<{ position: [number, number, number]; height: number }> = ({ position, height }) => {
    return (
        <group position={position}>
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[1, height, 1]} />
                <meshStandardMaterial color="#57534e" roughness={0.9} />
            </mesh>
        </group>
    );
};

const Tree: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    return (
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
};

const Rock: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    return (
        <mesh position={[position[0], position[1] + 0.3, position[2]]} castShadow>
            <dodecahedronGeometry args={[0.4]} />
            <meshStandardMaterial color="#6b7280" roughness={1} />
        </mesh>
    );
};

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

const PlayerCharacter: React.FC<{ position: [number, number, number]; direction: number }> = ({ position, direction }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    return (
        <group ref={groupRef} position={position} rotation={[0, direction, 0]}>
            <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[0.4, 0.8, 0.4]} />
                <meshStandardMaterial color="#3b82f6" />
            </mesh>
            <mesh position={[0, 1, 0]} castShadow>
                <sphereGeometry args={[0.25, 8, 8]} />
                <meshStandardMaterial color="#fbbf24" />
            </mesh>
        </group>
    );
};

const EnemyCharacter: React.FC<{ position: [number, number, number]; direction: number; type: string }> = ({ position, direction, type }) => {
    const colors: Record<string, string> = {
        'goblin': '#22c55e',
        'skeleton': '#e5e7eb',
        'slime': '#06b6d4',
        'orc': '#84cc16',
        'dragon': '#dc2626'
    };
    
    return (
        <group position={position} rotation={[0, direction, 0]}>
            <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[0.5, 0.9, 0.5]} />
                <meshStandardMaterial color={colors[type] || '#ef4444'} />
            </mesh>
            <mesh position={[0, 1.1, 0]} castShadow>
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshStandardMaterial color={colors[type] || '#ef4444'} emissive={colors[type] || '#ef4444'} emissiveIntensity={0.3} />
            </mesh>
        </group>
    );
};

const ExplorationMap: React.FC<{
    map: MapCell[][];
    playerPos: { x: number; z: number };
    playerDirection: number;
    enemies: { id: string; x: number; z: number; type: string; direction: number }[];
    traps: { id: string; x: number; z: number; type: string; isArmed: boolean }[];
    onPlayerClick?: (x: number, z: number) => void;
}> = ({ map, playerPos, playerDirection, enemies, traps, onPlayerClick }) => {
    const floorColor = '#4ade80';
    
    return (
        <group>
            {map.map((row, x) =>
                row.map((cell, z) => {
                    const pos: [number, number, number] = [x - MAP_SIZE / 2, cell.height * 0.1, z - MAP_SIZE / 2];
                    
                    if (cell.type === 'FLOOR' || cell.type === 'TRAP') {
                        return <FloorTile key={`floor-${x}-${z}`} position={pos} color={floorColor} />;
                    } else if (cell.type === 'WALL') {
                        return <Wall key={`wall-${x}-${z}`} position={pos} height={cell.height} />;
                    } else if (cell.type === 'TREE') {
                        return <Tree key={`tree-${x}-${z}`} position={pos} />;
                    } else if (cell.type === 'ROCK') {
                        return <Rock key={`rock-${x}-${z}`} position={pos} />;
                    } else if (cell.type === 'WATER') {
                        return <Water key={`water-${x}-${z}`} position={pos} />;
                    }
                    return null;
                })
            )}
            
            <PlayerCharacter 
                position={[playerPos.x - MAP_SIZE / 2, 0, playerPos.z - MAP_SIZE / 2]} 
                direction={playerDirection} 
            />
            
            {enemies.map(enemy => (
                <EnemyCharacter 
                    key={enemy.id}
                    position={[enemy.x - MAP_SIZE / 2, 0, enemy.z - MAP_SIZE / 2]}
                    direction={enemy.direction}
                    type={enemy.type}
                />
            ))}
            
            {traps.map(trap => (
                <TrapMarker 
                    key={trap.id}
                    position={[trap.x - MAP_SIZE / 2, 0.1, trap.z - MAP_SIZE / 2]}
                    trapType={trap.type}
                    isArmed={trap.isArmed}
                />
            ))}
        </group>
    );
};

const CameraController: React.FC<{ playerPos: { x: number; z: number } }> = ({ playerPos }) => {
    const { camera } = useThree();
    
    useEffect(() => {
        camera.position.set(
            playerPos.x - MAP_SIZE / 2 + 8,
            12,
            playerPos.z - MAP_SIZE / 2 + 8
        );
        camera.lookAt(
            playerPos.x - MAP_SIZE / 2,
            0,
            playerPos.z - MAP_SIZE / 2
        );
    }, [playerPos, camera]);
    
    return null;
};

export const Exploration3DScene: React.FC<ExplorationSceneProps> = ({ onEncounter, onTrapTrigger }) => {
    const map = useMemo(() => generateExplorationMap(), []);
    const [playerPos, setPlayerPos] = useState({ x: Math.floor(MAP_SIZE / 2), z: Math.floor(MAP_SIZE / 2) });
    const [playerDirection, setPlayerDirection] = useState(0);
    const [enemies, setEnemies] = useState<{ id: string; x: number; z: number; type: string; direction: number }[]>([
        { id: 'e1', x: 5, z: 5, type: 'goblin', direction: Math.PI },
        { id: 'e2', x: 15, z: 10, type: 'skeleton', direction: Math.PI },
        { id: 'e3', x: 10, z: 15, type: 'orc', direction: Math.PI },
    ]);
    const [traps, setTraps] = useState<{ id: string; x: number; z: number; type: string; isArmed: boolean }[]>([]);
    const [selectedTrap, setSelectedTrap] = useState<string | null>(null);
    const gameState = useGameStore(s => s.gameState);
    
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const speed = 1;
        let newX = playerPos.x;
        let newZ = playerPos.z;
        let newDir = playerDirection;
        
        switch (e.key) {
            case 'w':
            case 'ArrowUp':
                newZ -= speed;
                newDir = Math.PI;
                break;
            case 's':
            case 'ArrowDown':
                newZ += speed;
                newDir = 0;
                break;
            case 'a':
            case 'ArrowLeft':
                newX -= speed;
                newDir = -Math.PI / 2;
                break;
            case 'd':
            case 'ArrowRight':
                newX += speed;
                newDir = Math.PI / 2;
                break;
            case ' ':
                if (selectedTrap && map[newX]?.[newZ]?.type === 'FLOOR') {
                    setTraps(prev => [...prev, { 
                        id: `trap_${Date.now()}`, 
                        x: newX, 
                        z: newZ, 
                        type: selectedTrap, 
                        isArmed: true 
                    }]);
                }
                break;
            default:
                return;
        }
        
        if (newX >= 0 && newX < MAP_SIZE && newZ >= 0 && newZ < MAP_SIZE) {
            const cell = map[newX][newZ];
            if (cell.type === 'FLOOR' || cell.type === 'TRAP') {
                setPlayerPos({ x: newX, z: newZ });
                setPlayerDirection(newDir);
                
                const enemyAtPos = enemies.find(e => e.x === newX && e.z === newZ);
                if (enemyAtPos && onEncounter) {
                    onEncounter();
                }
                
                const trapAtPos = traps.find(t => t.x === newX && t.z === newZ && t.isArmed);
                if (trapAtPos && onTrapTrigger) {
                    onTrapTrigger(trapAtPos.id);
                    setTraps(prev => prev.map(t => 
                        t.id === trapAtPos.id ? { ...t, isArmed: false } : t
                    ));
                }
            }
        }
    }, [playerPos, playerDirection, selectedTrap, map, enemies, traps, onEncounter, onTrapTrigger]);
    
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    
    const moveEnemy = useCallback(() => {
        setEnemies(prev => prev.map(enemy => {
            if (Math.random() < 0.3) {
                const dir = Math.random() * Math.PI * 2;
                const dx = Math.round(Math.cos(dir));
                const dz = Math.round(Math.sin(dir));
                const newX = enemy.x + dx;
                const newZ = enemy.z + dz;
                
                if (newX >= 0 && newX < MAP_SIZE && newZ >= 0 && newZ < MAP_SIZE) {
                    const cell = map[newX][newZ];
                    if (cell.type === 'FLOOR' || cell.type === 'TRAP') {
                        return { ...enemy, x: newX, z: newZ, direction: dir };
                    }
                }
            }
            return enemy;
        }));
    }, [map]);
    
    useEffect(() => {
        const interval = setInterval(moveEnemy, 2000);
        return () => clearInterval(interval);
    }, [moveEnemy]);
    
    return (
        <div className="w-full h-full relative">
            <Canvas shadows camera={{ position: [10, 15, 10], fov: 50 }}>
                <color attach="background" args={['#1e293b']} />
                <ambientLight intensity={0.4} />
                <directionalLight 
                    position={[10, 20, 10]} 
                    intensity={1} 
                    castShadow 
                    shadow-mapSize={[2048, 2048]}
                />
                <FogController />
                <ExplorationMap 
                    map={map}
                    playerPos={playerPos}
                    playerDirection={playerDirection}
                    enemies={enemies}
                    traps={traps}
                />
                <CameraController playerPos={playerPos} />
                <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 2.5} />
            </Canvas>
            
            <div className="absolute bottom-4 left-4 bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <h3 className="text-amber-500 font-black uppercase text-xs mb-2">Controles</h3>
                <div className="text-slate-300 text-xs space-y-1">
                    <p>WASD / Flechas: Moverse</p>
                    <p>Espacio: Colocar trampa</p>
                </div>
            </div>
            
            <div className="absolute top-4 right-4 bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <h3 className="text-amber-500 font-black uppercase text-xs mb-2">Trampas</h3>
                <div className="flex gap-2">
                    {['SPIKE', 'FIRE', 'ICE', 'POISON', 'EXPLOSIVE', 'STUN'].map(type => (
                        <button
                            key={type}
                            onClick={() => setSelectedTrap(type === selectedTrap ? null : type)}
                            className={`px-3 py-2 rounded text-xs font-bold uppercase transition-all ${
                                selectedTrap === type 
                                    ? 'bg-amber-600 text-white' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
                <p className="text-slate-500 text-xs mt-2">{traps.length}/5 trampas</p>
            </div>
        </div>
    );
};

export default Exploration3DScene;
