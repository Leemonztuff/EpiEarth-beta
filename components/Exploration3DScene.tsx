
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { TrapMarker } from './TrapMarker';
import { GameState } from '../types';

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

const PlayerCharacter: React.FC<{ position: [number, number, number]; direction: number; hp: number; maxHp: number }> = ({ position, direction, hp, maxHp }) => {
    const hpPercent = hp / maxHp;
    const hpColor = hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#eab308' : '#ef4444';
    
    return (
        <group position={position} rotation={[0, direction, 0]}>
            <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[0.4, 0.8, 0.4]} />
                <meshStandardMaterial color="#3b82f6" />
            </mesh>
            <mesh position={[0, 1, 0]} castShadow>
                <sphereGeometry args={[0.25, 8, 8]} />
                <meshStandardMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[0, 1.5, 0]}>
                <sphereGeometry args={[0.15, 8, 8]} />
                <meshBasicMaterial color={hpColor} />
            </mesh>
        </group>
    );
};

const EnemyCharacter: React.FC<{ position: [number, number, number]; type: string; isDefeated: boolean }> = ({ position, type, isDefeated }) => {
    if (isDefeated) return null;
    
    const colors: Record<string, string> = {
        goblin: '#22c55e',
        slime: '#06b6d4',
        skeleton: '#e5e7eb',
        orc: '#84cc16',
        wolf: '#a3a3a3',
        default: '#ef4444'
    };
    
    return (
        <group position={position}>
            <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[0.5, 0.9, 0.5]} />
                <meshStandardMaterial color={colors[type] || colors.default} />
            </mesh>
            <mesh position={[0, 1.1, 0]} castShadow>
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshStandardMaterial color={colors[type] || colors.default} emissive={colors[type] || colors.default} emissiveIntensity={0.3} />
            </mesh>
        </group>
    );
};

const ExplorationMap: React.FC<{
    map: MapCell[][];
    playerPos: { x: number; z: number };
    playerDirection: number;
    playerHp: number;
    playerMaxHp: number;
    enemies: { id: string; x: number; z: number; type: string; isDefeated: boolean }[];
    traps: { id: string; x: number; z: number; type: string; isArmed: boolean }[];
}> = ({ map, playerPos, playerDirection, playerHp, playerMaxHp, enemies, traps }) => {
    return (
        <group>
            {map.map((row, x) =>
                row.map((cell, z) => {
                    const pos: [number, number, number] = [x - MAP_SIZE / 2, cell.height * 0.1, z - MAP_SIZE / 2];
                    
                    if (cell.type === 'FLOOR') {
                        return <FloorTile key={`floor-${x}-${z}`} position={pos} />;
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
                hp={playerHp}
                maxHp={playerMaxHp}
            />
            
            {enemies.map(enemy => (
                <EnemyCharacter 
                    key={enemy.id}
                    position={[enemy.x - MAP_SIZE / 2, 0, enemy.z - MAP_SIZE / 2]}
                    type={enemy.type}
                    isDefeated={enemy.isDefeated}
                />
            ))}
            
            {traps.map(trap => (
                trap.isArmed && (
                    <TrapMarker 
                        key={trap.id}
                        position={[trap.x - MAP_SIZE / 2, 0.1, trap.z - MAP_SIZE / 2]}
                        trapType={trap.type}
                        isArmed={trap.isArmed}
                    />
                )
            ))}
        </group>
    );
};

const CameraController: React.FC<{ playerPos: { x: number; z: number } }> = ({ playerPos }) => {
    return null;
};

export const Exploration3DScene: React.FC = () => {
    const map = useMemo(() => generateExplorationMap(), []);
    const [playerPos, setPlayerPos] = useState({ x: Math.floor(MAP_SIZE / 2), z: Math.floor(MAP_SIZE / 2) });
    const [playerDirection, setPlayerDirection] = useState(0);
    const [selectedTrap, setSelectedTrap] = useState<string | null>(null);
    
    const gameState = useGameStore(s => s.gameState);
    const party = useGameStore(s => s.party);
    const explorationState = useGameStore(s => s.explorationState);
    const setGameState = useGameStore(s => s.setGameState);
    const initZone = useGameStore(s => s.initZone);
    const movePlayer = useGameStore(s => s.movePlayer);
    const placeTrap = useGameStore(s => s.placeTrap);
    const exploration = useGameStore(s => s.explorationState);
    
    useEffect(() => {
        if (gameState === GameState.EXPLORATION_3D && explorationState.zoneEnemies.length === 0) {
            initZone('forest');
        }
    }, [gameState]);
    
    const currentPlayer = party[0];
    const playerHp = currentPlayer?.stats.hp || 1;
    const playerMaxHp = currentPlayer?.stats.maxHp || 1;
    
    const enemies = explorationState.zoneEnemies.map(e => ({
        id: e.id,
        x: e.x,
        z: e.z,
        type: e.name.toLowerCase().includes('goblin') ? 'goblin' : 
              e.name.toLowerCase().includes('slime') ? 'slime' :
              e.name.toLowerCase().includes('skeleton') ? 'skeleton' :
              e.name.toLowerCase().includes('orco') ? 'orc' : 'wolf',
        isDefeated: e.isDefeated
    }));
    
    const traps = explorationState.traps.map(t => ({
        id: t.id,
        x: t.position.x,
        z: t.position.z,
        type: t.type,
        isArmed: t.isArmed
    }));
    
    const aliveEnemies = explorationState.zoneEnemies.filter(e => !e.isDefeated).length;
    const zoneProgress = explorationState.zoneEnemies.length > 0 
        ? `${explorationState.zoneEnemies.length - aliveEnemies}/${explorationState.zoneEnemies.length}`
        : '0/0';
    
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (gameState !== GameState.EXPLORATION_3D) return;
        
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
                    placeTrap(selectedTrap as any, newX, newZ);
                }
                break;
            case '1': setSelectedTrap('SPIKE'); break;
            case '2': setSelectedTrap('FIRE'); break;
            case '3': setSelectedTrap('ICE'); break;
            case '4': setSelectedTrap('POISON'); break;
            case '5': setSelectedTrap('EXPLOSIVE'); break;
            case '6': setSelectedTrap('STUN'); break;
            default:
                return;
        }
        
        if (newX >= 0 && newX < MAP_SIZE && newZ >= 0 && newZ < MAP_SIZE) {
            const cell = map[newX][newZ];
            if (cell.type === 'FLOOR') {
                setPlayerPos({ x: newX, z: newZ });
                setPlayerDirection(newDir);
                movePlayer(newX, newZ);
            }
        }
    }, [playerPos, playerDirection, selectedTrap, map, placeTrap, movePlayer, gameState]);
    
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    
    if (gameState !== GameState.EXPLORATION_3D) return null;
    
    return (
        <div className="w-full h-full relative">
            <Canvas shadows camera={{ position: [10, 15, 10], fov: 50 }}>
                <color attach="background" args={['#1e293b']} />
                <ambientLight intensity={0.4} />
                <directionalLight position={[10, 20, 10]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
                <fog attach="fog" args={['#1e293b', 10, 30]} />
                <ExplorationMap 
                    map={map}
                    playerPos={playerPos}
                    playerDirection={playerDirection}
                    playerHp={playerHp}
                    playerMaxHp={playerMaxHp}
                    enemies={enemies}
                    traps={traps}
                />
                <CameraController playerPos={playerPos} />
                <OrbitControls enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 2.5} />
            </Canvas>
            
            <div className="absolute top-4 left-4 bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <h3 className="text-amber-500 font-black uppercase text-xs mb-2">📍 {explorationState.zoneName}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>Enemigos:</span>
                    <span className="text-emerald-500 font-bold">{zoneProgress}</span>
                </div>
                {explorationState.zoneCompleted && (
                    <div className="mt-2 text-amber-500 font-bold text-sm animate-pulse">
                        ¡ZONA COMPLETADA!
                    </div>
                )}
            </div>
            
            <div className="absolute bottom-4 left-4 bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <h3 className="text-amber-500 font-black uppercase text-xs mb-2">Controles</h3>
                <div className="text-slate-300 text-xs space-y-1">
                    <p>WASD / Flechas: Moverse</p>
                    <p>1-6: Seleccionar trampa</p>
                    <p>Espacio: Colocar trampa</p>
                </div>
            </div>
            
            <div className="absolute top-4 right-4 bg-slate-900/90 p-4 rounded-xl border border-slate-700">
                <h3 className="text-amber-500 font-black uppercase text-xs mb-2">Trampas ({traps.filter(t => t.isArmed).length}/{explorationState.maxTraps})</h3>
                <div className="flex gap-1 flex-wrap">
                    {['SPIKE', 'FIRE', 'ICE', 'POISON', 'EXPLOSIVE', 'STUN'].map((type, i) => (
                        <button
                            key={type}
                            onClick={() => setSelectedTrap(selectedTrap === type ? null : type)}
                            className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                                selectedTrap === type 
                                    ? 'bg-amber-600 text-white' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            {i + 1}. {type}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="absolute bottom-4 right-4 bg-slate-900/90 p-4 rounded-xl border border-slate-700 min-w-[200px]">
                <h3 className="text-amber-500 font-black uppercase text-xs mb-2">🎭 {currentPlayer?.name || 'Jugador'}</h3>
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                        <div 
                            className={`h-full transition-all ${
                                playerHp > playerMaxHp * 0.5 ? 'bg-emerald-500' : 
                                playerHp > playerMaxHp * 0.25 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(playerHp / playerMaxHp) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono text-white">{playerHp}/{playerMaxHp}</span>
                </div>
            </div>
        </div>
    );
};

export default Exploration3DScene;
