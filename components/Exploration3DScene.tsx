import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { GameState, TrapType, EnemyAiState, KageroMissionState, TrapPlacementSurface, PlacedTrap, KageroEnemyState, KageroTrapSlot } from '../types';
import { TRAP_DATA } from '../data/trapsData';
import { generateTacticalMap, TACTICAL_MAP_SIZE } from '../services/trapHuntMap';
import * as THREE from 'three';

const CELL_SIZE = 2;
const GRID_OFFSET = (TACTICAL_MAP_SIZE * CELL_SIZE) / 2;
const PLAYER_HEIGHT = 1.6;
const DETECTION_RADIUS = 4;
const TRAP_TRIGGER_RADIUS = 1.2;
const COMBO_WINDOW_STEPS = 3;

const TRAP_COLORS: Record<TrapType, string> = {
    [TrapType.SPIKE]: '#8b5cf6',
    [TrapType.FIRE]: '#ef4444',
    [TrapType.ICE]: '#06b6d4',
    [TrapType.POISON]: '#22c55e',
    [TrapType.EXPLOSIVE]: '#f97316',
    [TrapType.STUN]: '#eab308',
    [TrapType.TELEPORT]: '#a855f7',
    [TrapType.DECOY]: '#ec4899',
    [TrapType.TRAP_DOOR]: '#64748b',
    [TrapType.ALARM]: '#3b82f6',
};

function gridToWorld(gridX: number, gridZ: number, y: number = 0): [number, number, number] {
    return [
        gridX * CELL_SIZE - GRID_OFFSET + CELL_SIZE / 2,
        y,
        gridZ * CELL_SIZE - GRID_OFFSET + CELL_SIZE / 2
    ];
}

function worldToGrid(worldX: number, worldZ: number): { x: number; z: number } {
    return {
        x: Math.round((worldX + GRID_OFFSET - CELL_SIZE / 2) / CELL_SIZE),
        z: Math.round((worldZ + GRID_OFFSET - CELL_SIZE / 2) / CELL_SIZE)
    };
}

function PlayerController({ 
    position, 
    onPositionChange, 
    canMove,
    rotation 
}: { 
    position: [number, number, number], 
    onPositionChange: (p: [number, number, number]) => void, 
    canMove: boolean,
    rotation: React.MutableRefObject<number>
}) {
    const meshRef = useRef<THREE.Group>(null);
    const { camera } = useThree();
    const keysPressed = useRef<Set<string>>(new Set());
    const moveSpeed = 0.1;
    const smoothRotation = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                keysPressed.current.add(key);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useFrame(() => {
        if (!canMove) return;

        let dx = 0, dz = 0;
        if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dz -= moveSpeed;
        if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dz += moveSpeed;
        if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= moveSpeed;
        if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += moveSpeed;

        if (dx !== 0 || dz !== 0) {
            const len = Math.sqrt(dx * dx + dz * dz);
            dx = (dx / len) * moveSpeed;
            dz = (dz / len) * moveSpeed;

            const bounds = GRID_OFFSET - CELL_SIZE;
            const newX = Math.max(-bounds, Math.min(bounds, position[0] + dx));
            const newZ = Math.max(-bounds, Math.min(bounds, position[2] + dz));
            
            onPositionChange([newX, position[1], newZ]);
            
            rotation.current = Math.atan2(dx, dz);
        }

        const targetRot = rotation.current;
        smoothRotation.current += (targetRot - smoothRotation.current) * 0.15;

        if (meshRef.current) {
            meshRef.current.rotation.y = smoothRotation.current;
        }

        const cameraOffset = 5;
        const cameraHeight = 7;
        camera.position.set(
            position[0] - Math.sin(smoothRotation.current) * cameraOffset,
            cameraHeight,
            position[2] + Math.cos(smoothRotation.current) * cameraOffset
        );
        camera.lookAt(position[0], position[1] + 0.5, position[2]);
    });

    return (
        <group ref={meshRef} position={position}>
            <mesh castShadow>
                <cylinderGeometry args={[0.35, 0.4, PLAYER_HEIGHT, 8]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.3} roughness={0.7} />
            </mesh>
            <mesh position={[0, PLAYER_HEIGHT / 2 + 0.15, 0]}>
                <sphereGeometry args={[0.28, 12, 12]} />
                <meshStandardMaterial color="#fef3c7" />
            </mesh>
            <mesh position={[0.4, PLAYER_HEIGHT / 2 - 0.2, 0]} rotation={[0, 0, -Math.PI / 6]}>
                <coneGeometry args={[0.1, 0.5, 6]} />
                <meshStandardMaterial color="#92400e" />
            </mesh>
        </group>
    );
}

function DungeonEnvironment({ map }: { map: any[][] }) {
    return (
        <group>
            {map.map((row, x) =>
                row.map((cell: any, z: number) => {
                    if (cell.type === 'WALL') {
                        const [wx, , wz] = gridToWorld(x, z);
                        return (
                            <mesh key={`wall-${x}-${z}`} position={[wx, cell.height / 2, wz]} castShadow receiveShadow>
                                <boxGeometry args={[CELL_SIZE, cell.height, CELL_SIZE]} />
                                <meshStandardMaterial color="#44403c" roughness={0.9} />
                            </mesh>
                        );
                    }
                    if (cell.type === 'STONE') {
                        const [wx, , wz] = gridToWorld(x, z);
                        return (
                            <mesh key={`stone-${x}-${z}`} position={[wx, cell.height / 2, wz]} castShadow receiveShadow>
                                <boxGeometry args={[CELL_SIZE * 0.6, cell.height, CELL_SIZE * 0.6]} />
                                <meshStandardMaterial color="#78716c" roughness={0.95} />
                            </mesh>
                        );
                    }
                    return null;
                })
            )}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
                <planeGeometry args={[TACTICAL_MAP_SIZE * CELL_SIZE, TACTICAL_MAP_SIZE * CELL_SIZE]} />
                <meshStandardMaterial color="#1c1917" roughness={1} />
            </mesh>
        </group>
    );
}

function TacticalGridOverlay({ 
    map, 
    visible, 
    surface, 
    onCellClick, 
    trapPlacements, 
    selectedTrap,
    hoveredCell 
}: { 
    map: any[][], 
    visible: boolean, 
    surface: TrapPlacementSurface,
    onCellClick: (x: number, z: number) => void, 
    trapPlacements: PlacedTrap[], 
    selectedTrap: TrapType | null,
    hoveredCell: { x: number; z: number } | null
}) {
    if (!visible) return null;

    return (
        <group>
            {map.map((row, x) =>
                row.map((cell: any, z: number) => {
                    const isWall = cell.type === 'WALL';
                    const isStone = cell.type === 'STONE';
                    
                    let canPlace = false;
                    let y = 0.02;
                    
                    if (surface === 'floor' && !isWall && !isStone) {
                        canPlace = true;
                        y = 0.02;
                    } else if (surface === 'wall' && isWall) {
                        canPlace = true;
                        y = cell.height / 2;
                    } else if (surface === 'ceiling') {
                        canPlace = true;
                        y = 6;
                    }

                    const existingTrap = trapPlacements.find(t => t.gridX === x && t.gridZ === z && t.surface === surface);
                    const isHovered = hoveredCell?.x === x && hoveredCell?.z === z;
                    
                    let color = '#22c55e22';
                    let opacity = 0.15;
                    
                    if (existingTrap) {
                        color = TRAP_COLORS[existingTrap.trapType];
                        opacity = 0.7;
                    } else if (isHovered && canPlace && selectedTrap) {
                        color = TRAP_COLORS[selectedTrap];
                        opacity = 0.5;
                    } else if (!canPlace) {
                        color = '#ef444422';
                        opacity = 0.1;
                    }

                    const [wx, , wz] = gridToWorld(x, z);
                    
                    return (
                        <mesh
                            key={`tgrid-${surface}-${x}-${z}`}
                            position={[wx, y, wz]}
                            rotation={surface === 'wall' ? [-Math.PI / 2, 0, 0] : surface === 'ceiling' ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
                            onClick={() => canPlace && onCellClick(x, z)}
                            onPointerEnter={() => {}}
                            onPointerLeave={() => {}}
                        >
                            <planeGeometry args={[CELL_SIZE * 0.92, CELL_SIZE * 0.92]} />
                            <meshBasicMaterial color={color} transparent opacity={opacity} />
                        </mesh>
                    );
                })
            )}
        </group>
    );
}

function TrapMesh({ trap }: { trap: PlacedTrap }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const color = trap.triggered ? '#444444' : TRAP_COLORS[trap.trapType];

    useFrame(({ clock }) => {
        if (meshRef.current && !trap.triggered) {
            meshRef.current.rotation.y = clock.getElapsedTime() * 1.5;
            const bounce = Math.sin(clock.getElapsedTime() * 4) * 0.05;
            meshRef.current.position.y = trap.position.y + bounce;
        }
    });

    const [wx, wy, wz] = gridToWorld(trap.gridX, trap.gridZ, trap.position.y);

    return (
        <mesh ref={meshRef} position={[wx, wy, wz]} castShadow>
            <boxGeometry args={[0.5, 0.12, 0.5]} />
            <meshStandardMaterial 
                color={color} 
                emissive={color} 
                emissiveIntensity={trap.triggered ? 0 : 0.5}
                metalness={0.4}
                roughness={0.3}
            />
        </mesh>
    );
}

function EnemyMesh({ enemy }: { enemy: KageroEnemyState }) {
    const groupRef = useRef<THREE.Group>(null);
    const targetPos = useRef({ x: 0, z: 0 });

    useEffect(() => {
        targetPos.current = {
            x: enemy.gridX * CELL_SIZE - GRID_OFFSET + CELL_SIZE / 2,
            z: enemy.gridZ * CELL_SIZE - GRID_OFFSET + CELL_SIZE / 2
        };
    }, [enemy.gridX, enemy.gridZ]);

    useFrame(() => {
        if (groupRef.current) {
            const currentX = groupRef.current.position.x;
            const currentZ = groupRef.current.position.z;
            groupRef.current.position.x += (targetPos.current.x - currentX) * 0.12;
            groupRef.current.position.z += (targetPos.current.z - currentZ) * 0.12;
        }
    });

    const hpPercent = enemy.hp / enemy.maxHp;
    const stateColor = enemy.aiState === EnemyAiState.PATROL ? '#ef4444' :
                      enemy.aiState === EnemyAiState.INVESTIGATE ? '#eab308' :
                      enemy.aiState === EnemyAiState.CHASE ? '#f97316' :
                      enemy.aiState === EnemyAiState.STUNNED ? '#6b7280' :
                      enemy.aiState === EnemyAiState.DECOYED ? '#ec4899' : '#ef4444';

    const [wx, , wz] = gridToWorld(enemy.gridX, enemy.gridZ);

    return (
        <group ref={groupRef} position={[wx, 0.6, wz]}>
            <mesh castShadow>
                <boxGeometry args={[0.65, 1.0, 0.65]} />
                <meshStandardMaterial color={stateColor} />
            </mesh>
            <mesh position={[0, 0.65, 0]}>
                <sphereGeometry args={[0.22, 8, 8]} />
                <meshStandardMaterial color={stateColor} />
            </mesh>
            <mesh position={[0, 1.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.5, 0.06]} />
                <meshBasicMaterial color="#22c55e" />
            </mesh>
            <mesh position={[0, 1.25, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.52, 0.08]} />
                <meshBasicMaterial color="#1f2937" />
            </mesh>
        </group>
    );
}

function Lighting() {
    return (
        <>
            <ambientLight intensity={0.2} color="#fef3c7" />
            <directionalLight position={[8, 12, 8]} intensity={0.6} castShadow shadow-mapSize={[2048, 2048]} />
            <pointLight position={[0, 5, 0]} intensity={0.3} color="#fef9c3" />
            <pointLight position={[-6, 3, -6]} intensity={0.15} color="#ef4444" />
            <pointLight position={[6, 3, 6]} intensity={0.15} color="#3b82f6" />
        </>
    );
}

function SceneContent({ 
    missionState, 
    map, 
    trapPlacements, 
    enemies, 
    onCellClick, 
    playerPos, 
    setPlayerPos,
    playerRotation,
    selectedSurface,
    hoveredCell
}: any) {
    const canMove = [
        KageroMissionState.THIRD_PERSON_EXPLORATION,
        KageroMissionState.ENEMY_APPROACH
    ].includes(missionState);
    
    const showGrid = missionState === KageroMissionState.TACTICAL_MODE;

    return (
        <>
            <Lighting />
            <DungeonEnvironment map={map} />
            <PlayerController 
                position={playerPos} 
                onPositionChange={setPlayerPos} 
                canMove={canMove}
                rotation={playerRotation}
            />
            <TacticalGridOverlay 
                visible={showGrid}
                map={map}
                surface={selectedSurface}
                onCellClick={onCellClick}
                trapPlacements={trapPlacements}
                selectedTrap={null}
                hoveredCell={hoveredCell}
            />
            {trapPlacements.map(trap => (
                <TrapMesh key={trap.id} trap={trap} />
            ))}
            {enemies.filter(e => e.isAlive).map(enemy => (
                <EnemyMesh key={enemy.id} enemy={enemy} />
            ))}
        </>
    );
}

export default function Exploration3DScene() {
    const explorationState = useGameStore(s => s.explorationState);
    const setGameState = useGameStore(s => s.setGameState);
    const addLog = useGameStore(s => s.addLog);
    const clearCurrentEncounter = useGameStore(s => s.clearCurrentEncounter);
    const syncOverworldEnemies = useGameStore(s => s.syncOverworldEnemies);

    const [missionState, setMissionState] = useState<KageroMissionState>(KageroMissionState.MISSION_LOAD);
    const [selectedTrapType, setSelectedTrapType] = useState<TrapType>(TrapType.SPIKE);
    const [selectedSurface, setSelectedSurface] = useState<TrapPlacementSurface>('floor');
    const [trapPlacements, setTrapPlacements] = useState<PlacedTrap[]>([]);
    const [enemies, setEnemies] = useState<KageroEnemyState[]>([]);
    const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, PLAYER_HEIGHT / 2, 0]);
    const [playerRotation] = useState<React.MutableRefObject<number>>({ current: 0 });
    const [hoveredCell, setHoveredCell] = useState<{ x: number; z: number } | null>(null);
    const [comboCount, setComboCount] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);
    const [missionProgress, setMissionProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    const [comboTimeout, setComboTimeout] = useState<NodeJS.Timeout | null>(null);
    
    const mapSeed = explorationState.zoneContext?.poiId || 'kagero_default';
    const map = useMemo(() => generateTacticalMap(mapSeed), [mapSeed]);
    const totalEnemies = useMemo(() => enemies.length, [enemies]);
    const enemiesAlive = useMemo(() => enemies.filter(e => e.isAlive).length, [enemies]);

    const exitToHex = useCallback(() => {
        if (missionState === KageroMissionState.MISSION_COMPLETE) {
            clearCurrentEncounter();
            addLog('Zona limpiada!', 'combat');
        }
        syncOverworldEnemies();
        setGameState(GameState.OVERWORLD);
    }, [missionState, clearCurrentEncounter, syncOverworldEnemies, setGameState, addLog]);

    useEffect(() => {
        const zoneEnemies = explorationState.zoneEnemies || [];
        
        const spawnedEnemies: KageroEnemyState[] = zoneEnemies.map((e: any, idx: number) => {
            const spawnX = 8 + Math.floor(Math.random() * 6);
            const spawnZ = 8 + Math.floor(Math.random() * 6);
            const patrolPath = [
                { x: spawnX, z: spawnZ },
                { x: spawnX + 3, z: spawnZ },
                { x: spawnX + 3, z: spawnZ + 3 },
                { x: spawnX, z: spawnZ + 3 },
            ];
            
            return {
                id: e.id || `enemy_${idx}`,
                name: e.name || ['Goblin', 'Orco', 'Slime', 'Skeleton'][idx % 4],
                hp: e.hp || 40,
                maxHp: e.maxHp || e.hp || 40,
                position: { x: 0, y: 0, z: 0 },
                gridX: spawnX,
                gridZ: spawnZ,
                aiState: EnemyAiState.PATROL,
                patrolPath,
                patrolIndex: 0,
                targetX: patrolPath[0].x,
                targetZ: patrolPath[0].z,
                detectionRadius: DETECTION_RADIUS,
                moveSpeed: 0.8,
                stunnedTurns: 0,
                poisonTurns: 0,
                knockedBack: false,
                knockbackDir: null,
                triggeredTrapIds: [],
                isAlive: true,
            };
        });

        if (spawnedEnemies.length === 0) {
            spawnedEnemies.push({
                id: 'patrol_01',
                name: 'Patrullero',
                hp: 35,
                maxHp: 35,
                position: { x: 0, y: 0, z: 0 },
                gridX: 10,
                gridZ: 10,
                aiState: EnemyAiState.PATROL,
                patrolPath: [{ x: 10, z: 10 }, { x: 14, z: 10 }, { x: 14, z: 14 }, { x: 10, z: 14 }],
                patrolIndex: 0,
                targetX: 10,
                targetZ: 10,
                detectionRadius: DETECTION_RADIUS,
                moveSpeed: 0.7,
                stunnedTurns: 0,
                poisonTurns: 0,
                knockedBack: false,
                knockbackDir: null,
                triggeredTrapIds: [],
                isAlive: true,
            });
            spawnedEnemies.push({
                id: 'patrol_02',
                name: 'Explorador',
                hp: 28,
                maxHp: 28,
                position: { x: 0, y: 0, z: 0 },
                gridX: 6,
                gridZ: 12,
                aiState: EnemyAiState.PATROL,
                patrolPath: [{ x: 6, z: 12 }, { x: 6, z: 6 }, { x: 12, z: 6 }],
                patrolIndex: 0,
                targetX: 6,
                targetZ: 12,
                detectionRadius: DETECTION_RADIUS + 1,
                moveSpeed: 0.9,
                stunnedTurns: 0,
                poisonTurns: 0,
                knockedBack: false,
                knockbackDir: null,
                triggeredTrapIds: [],
                isAlive: true,
            });
        }

        setEnemies(spawnedEnemies);
        addLog(`=== MISION KAGERO INICIADA ===`, 'narrative');
        addLog(`Zona: ${explorationState.zoneName || 'Calabozo'}`, 'narrative');
        addLog(`Enemigos activos: ${spawnedEnemies.length}`, 'info');
        addLog('[T] Modo Tactico | [1/2/3] Superficie', 'info');

        const loadTimer = setTimeout(() => {
            setMissionState(KageroMissionState.THIRD_PERSON_EXPLORATION);
        }, 800);

        return () => clearTimeout(loadTimer);
    }, [addLog, explorationState]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '1') {
                setSelectedSurface('floor');
                addLog('Superficie: PISO', 'info');
            } else if (e.key === '2') {
                setSelectedSurface('wall');
                addLog('Superficie: PARED', 'info');
            } else if (e.key === '3') {
                setSelectedSurface('ceiling');
                addLog('Superficie: TECHO', 'info');
            }
            
            if (e.key.toLowerCase() === 't') {
                if (missionState === KageroMissionState.THIRD_PERSON_EXPLORATION) {
                    setMissionState(KageroMissionState.TACTICAL_MODE);
                    addLog('>>> MODO TACTICO: Planifica trampas', 'info');
                } else if (missionState === KageroMissionState.TACTICAL_MODE) {
                    setMissionState(KageroMissionState.THIRD_PERSON_EXPLORATION);
                    addLog('<<< Explorando...', 'info');
                }
            }
            
            if (e.key === 'Escape') {
                if (missionState === KageroMissionState.TACTICAL_MODE) {
                    setMissionState(KageroMissionState.THIRD_PERSON_EXPLORATION);
                } else {
                    setMissionState(KageroMissionState.RETURN_TO_HEX);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [missionState, addLog]);

    useEffect(() => {
        if (missionState !== KageroMissionState.THIRD_PERSON_EXPLORATION && 
            missionState !== KageroMissionState.ENEMY_APPROACH) return;

        const interval = setInterval(() => {
            setCurrentStep(s => s + 1);

            const playerGrid = worldToGrid(playerPos[0], playerPos[2]);

            setEnemies(prevEnemies => {
                let anyChasing = false;

                const updated = prevEnemies.map(enemy => {
                    if (!enemy.isAlive || enemy.stunnedTurns > 0) {
                        return enemy.stunnedTurns > 0 
                            ? { ...enemy, stunnedTurns: enemy.stunnedTurns - 1, aiState: EnemyAiState.STUNNED }
                            : enemy;
                    }

                    const distToPlayer = Math.sqrt(
                        Math.pow(enemy.gridX - playerGrid.x, 2) + 
                        Math.pow(enemy.gridZ - playerGrid.z, 2)
                    );

                    let newAiState = enemy.aiState;
                    let newGridX = enemy.gridX;
                    let newGridZ = enemy.gridZ;
                    let newTargetX = enemy.targetX;
                    let newTargetZ = enemy.targetZ;
                    let newPatrolIndex = enemy.patrolIndex;

                    if (distToPlayer < enemy.detectionRadius) {
                        newAiState = EnemyAiState.CHASE;
                        anyChasing = true;
                        
                        const dx = playerGrid.x - enemy.gridX;
                        const dz = playerGrid.z - enemy.gridZ;
                        
                        if (Math.abs(dx) > Math.abs(dz)) {
                            newGridX = Math.max(1, Math.min(TACTICAL_MAP_SIZE - 2, enemy.gridX + Math.sign(dx)));
                        } else {
                            newGridZ = Math.max(1, Math.min(TACTICAL_MAP_SIZE - 2, enemy.gridZ + Math.sign(dz)));
                        }
                    } else {
                        if (enemy.aiState === EnemyAiState.CHASE) {
                            newAiState = EnemyAiState.PATROL;
                        }

                        const distToTarget = Math.sqrt(
                            Math.pow(enemy.gridX - enemy.targetX, 2) + 
                            Math.pow(enemy.gridZ - enemy.targetZ, 2)
                        );

                        if (distToTarget < 1) {
                            newPatrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
                            newTargetX = enemy.patrolPath[newPatrolIndex].x;
                            newTargetZ = enemy.patrolPath[newPatrolIndex].z;
                        }

                        const pdx = newTargetX - enemy.gridX;
                        const pdz = newTargetZ - enemy.gridZ;
                        
                        if (Math.abs(pdx) > Math.abs(pdz)) {
                            newGridX = Math.max(1, Math.min(TACTICAL_MAP_SIZE - 2, enemy.gridX + Math.sign(pdx)));
                        } else {
                            newGridZ = Math.max(1, Math.min(TACTICAL_MAP_SIZE - 2, enemy.gridZ + Math.sign(pdz)));
                        }
                    }

                    const nearTrap = trapPlacements.find(t => 
                        !t.triggered &&
                        t.surface === 'floor' &&
                        Math.abs(t.gridX - newGridX) <= 1 && 
                        Math.abs(t.gridZ - newGridZ) <= 1 &&
                        !enemy.triggeredTrapIds.includes(t.id)
                    );

                    if (nearTrap && distToPlayer < TRAP_TRIGGER_RADIUS * 2) {
                        const trapData = TRAP_DATA[nearTrap.trapType];
                        
                        setMissionState(KageroMissionState.TRAP_TRIGGER);
                        
                        setTrapPlacements(tp => tp.map(t => 
                            t.id === nearTrap.id ? { ...t, triggered: true, triggeredAtStep: currentStep } : t
                        ));

                        const damage = trapData.damage + Math.floor(Math.random() * 10);
                        const newHp = Math.max(0, enemy.hp - damage);
                        
                        let newStunned = enemy.stunnedTurns;
                        let newKnockedBack = enemy.knockedBack;
                        let newKnockbackDir = enemy.knockbackDir;

                        if (trapData.stateEffect === 'stun') {
                            newStunned = 2;
                            newAiState = EnemyAiState.STUNNED;
                        } else if (trapData.stateEffect === 'knockback') {
                            newKnockedBack = true;
                            newKnockbackDir = { x: Math.sign(newGridX - enemy.gridX) || 1, z: Math.sign(newGridZ - enemy.gridZ) || 1 };
                        }

                        setTimeout(() => {
                            setMissionState(KageroMissionState.COMBO_RESOLUTION);
                            
                            setComboCount(c => {
                                const newCombo = c + 1;
                                setMaxCombo(m => Math.max(m, newCombo));
                                addLog(`>>> CADENA x${newCombo}: ${trapData.triggerMessage}`, 'combat');
                                setMissionProgress(p => Math.min(100, p + 10));
                                return newCombo;
                            });

                            if (newHp <= 0) {
                                addLog(`>>> ELIMINADO: ${enemy.name}`, 'combat');
                                setMissionProgress(p => Math.min(100, p + 25));
                            }

                            setTimeout(() => {
                                setMissionState(KageroMissionState.VICTORY_CHECK);
                            }, 400);
                        }, 200);

                        return {
                            ...enemy,
                            hp: newHp,
                            gridX: newKnockedBack ? Math.max(1, Math.min(TACTICAL_MAP_SIZE - 2, enemy.gridX + (newKnockbackDir?.x || 0) * 2)) : newGridX,
                            gridZ: newKnockedBack ? Math.max(1, Math.min(TACTICAL_MAP_SIZE - 2, enemy.gridZ + (newKnockbackDir?.z || 0) * 2)) : newGridZ,
                            aiState: newAiState,
                            stunnedTurns: newStunned,
                            knockedBack: newKnockedBack,
                            knockbackDir: newKnockbackDir,
                            triggeredTrapIds: [...enemy.triggeredTrapIds, nearTrap.id],
                            isAlive: newHp > 0,
                        };
                    }

                    return {
                        ...enemy,
                        gridX: newGridX,
                        gridZ: newGridZ,
                        aiState: newAiState,
                        targetX: newTargetX,
                        targetZ: newTargetZ,
                        patrolIndex: newPatrolIndex,
                    };
                });

                const allDead = updated.every(e => !e.isAlive);
                if (allDead && updated.length > 0) {
                    setTimeout(() => {
                        setMissionState(KageroMissionState.MISSION_COMPLETE);
                        addLog('=== MISION COMPLETADA ===', 'combat');
                    }, 600);
                } else if (anyChasing) {
                    setMissionState(KageroMissionState.ENEMY_APPROACH);
                } else {
                    setMissionState(KageroMissionState.THIRD_PERSON_EXPLORATION);
                }

                return updated;
            });
        }, 700);

        return () => clearInterval(interval);
    }, [missionState, playerPos, trapPlacements, currentStep, addLog]);

    useEffect(() => {
        if (missionState === KageroMissionState.VICTORY_CHECK) {
            const alive = enemies.filter(e => e.isAlive).length;
            if (alive > 0) {
                setTimeout(() => {
                    setMissionState(KageroMissionState.THIRD_PERSON_EXPLORATION);
                }, 500);
            }
        }
    }, [missionState, enemies]);

    useEffect(() => {
        if (missionState === KageroMissionState.RETURN_TO_HEX) {
            exitToHex();
        }
    }, [missionState, exitToHex]);

    const handleCellClick = useCallback((gridX: number, gridZ: number) => {
        if (missionState !== KageroMissionState.TACTICAL_MODE) return;
        if (trapPlacements.filter(t => !t.triggered).length >= 5) {
            addLog('Max 5 trampas activas', 'info');
            return;
        }

        const existing = trapPlacements.find(t => 
            t.gridX === gridX && t.gridZ === gridZ && t.surface === selectedSurface
        );

        if (existing) {
            setTrapPlacements(prev => prev.filter(t => t.id !== existing.id));
            addLog(`Trampa removida (${gridX}, ${gridZ})`, 'info');
            return;
        }

        const trapData = TRAP_DATA[selectedTrapType];
        let y = selectedSurface === 'floor' ? 0.1 : selectedSurface === 'wall' ? 2.5 : 6;

        const newTrap: PlacedTrap = {
            id: `trap_${Date.now()}_${gridX}_${gridZ}`,
            trapType: selectedTrapType,
            surface: selectedSurface,
            position: { x: 0, y, z: 0 },
            gridX,
            gridZ,
            trigger: trapData.triggerMode || 'auto',
            effects: trapData.stateEffect ? [trapData.stateEffect] : ['none'],
            damage: trapData.damage,
            cooldown: trapData.cooldown || 3,
            currentCooldown: 0,
            triggered: false,
            triggeredAtStep: -1,
            chainTargets: [],
        };

        setTrapPlacements(prev => [...prev, newTrap]);
        addLog(`[${selectedSurface}] ${trapData.name} en (${gridX}, ${gridZ})`, 'info');
    }, [missionState, selectedTrapType, selectedSurface, trapPlacements, addLog]);

    const defeatedCount = totalEnemies - enemiesAlive;

    const getStateLabel = () => {
        switch (missionState) {
            case KageroMissionState.MISSION_LOAD: return 'CARGANDO...';
            case KageroMissionState.THIRD_PERSON_EXPLORATION: return 'EXPLORANDO';
            case KageroMissionState.TACTICAL_MODE: return 'MODO TACTICO';
            case KageroMissionState.ENEMY_APPROACH: return '¡ENEMIGO ACERCA!';
            case KageroMissionState.TRAP_TRIGGER: return 'TRAMPA ACTIVADA';
            case KageroMissionState.COMBO_RESOLUTION: return `CADENA x${comboCount}`;
            case KageroMissionState.VICTORY_CHECK: return 'VERIFICANDO...';
            case KageroMissionState.MISSION_COMPLETE: return 'COMPLETADO';
            case KageroMissionState.MISSION_FAILED: return 'FALLIDO';
            case KageroMissionState.RETURN_TO_HEX: return 'REGRESANDO...';
            default: return 'DESCONOCIDO';
        }
    };

    const getStateColor = () => {
        if ([KageroMissionState.TRAP_TRIGGER, KageroMissionState.COMBO_RESOLUTION].includes(missionState)) return 'text-red-500';
        if (missionState === KageroMissionState.TACTICAL_MODE) return 'text-green-500';
        if (missionState === KageroMissionState.ENEMY_APPROACH) return 'text-orange-500';
        if (missionState === KageroMissionState.MISSION_COMPLETE) return 'text-amber-500';
        return 'text-blue-400';
    };

    return (
        <div className="fixed inset-0 bg-slate-950 z-50">
            <Canvas shadows camera={{ position: [0, 8, 10], fov: 55 }}>
                <SceneContent
                    missionState={missionState}
                    map={map}
                    trapPlacements={trapPlacements}
                    enemies={enemies}
                    onCellClick={handleCellClick}
                    playerPos={playerPos}
                    setPlayerPos={setPlayerPos}
                    playerRotation={playerRotation}
                    selectedSurface={selectedSurface}
                    hoveredCell={hoveredCell}
                />
            </Canvas>

            <div className="absolute top-4 left-4 bg-slate-900/95 rounded-lg p-4 text-white border border-slate-700 shadow-xl min-w-[200px]">
                <h3 className="text-amber-500 font-bold mb-2 text-lg">
                    {explorationState.zoneName || 'Zona de Caza'}
                </h3>
                <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Enemigos:</span>
                        <span className="font-mono">{defeatedCount}/{totalEnemies}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Vivos:</span>
                        <span className="font-mono text-red-400">{enemiesAlive}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Trampas:</span>
                        <span className="font-mono">{trapPlacements.filter(t => !t.triggered).length}/5</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3 mt-2">
                        <div 
                            className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all duration-300 shadow-lg shadow-green-500/30" 
                            style={{ width: `${missionProgress}%` }} 
                        />
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Progreso</span>
                        <span className="text-green-400">{missionProgress}%</span>
                    </div>
                </div>
            </div>

            <div className="absolute top-4 right-4 bg-slate-900/95 rounded-lg p-4 text-white border border-slate-700 shadow-xl">
                <div className={`text-sm font-bold ${getStateColor()}`}>
                    [{getStateLabel()}]
                </div>
                <div className="text-xs text-slate-400 mt-1">
                    <span className="text-amber-400">Cadena:</span> x{comboCount} <span className="text-slate-500">(max: x{maxCombo})</span>
                </div>
            </div>

            <div className="absolute bottom-4 left-4 bg-slate-900/95 rounded-lg p-3 text-white border border-slate-700">
                <div className="text-xs text-slate-400 space-y-1">
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">T</kbd> Tactico</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">1</kbd> Piso</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">2</kbd> Pared</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">3</kbd> Techo</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">WASD</kbd> Mover</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">Click</kbd> Colocar</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">ESC</kbd> Salir</div>
                </div>
            </div>

            {missionState === KageroMissionState.TACTICAL_MODE && (
                <div className="absolute bottom-4 right-4 bg-slate-900/95 rounded-lg p-4 text-white border border-green-700 shadow-xl min-w-[220px]">
                    <h4 className="text-green-400 font-bold mb-2 text-sm flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        TRAMPAS
                    </h4>
                    <div className="grid grid-cols-2 gap-1.5">
                        {Object.entries(TRAP_DATA).slice(0, 6).map(([key, data]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedTrapType(key as TrapType)}
                                className={`p-2 rounded text-xs flex items-center gap-1.5 transition-all ${
                                    selectedTrapType === key 
                                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/30' 
                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                                }`}
                            >
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TRAP_COLORS[key as TrapType] }} />
                                <span>{data.name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-700">
                        <div className="text-xs text-slate-400">
                            Superficie: <span className="text-white font-mono">{selectedSurface.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute top-1/2 -translate-y-1/2 left-4 bg-slate-900/90 rounded-lg p-2 text-white">
                <div className="text-xs space-y-1">
                    {enemies.filter(e => e.isAlive).map(e => (
                        <div key={e.id} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                                e.aiState === EnemyAiState.PATROL ? 'bg-red-500' :
                                e.aiState === EnemyAiState.INVESTIGATE ? 'bg-yellow-500' :
                                e.aiState === EnemyAiState.CHASE ? 'bg-orange-500 animate-pulse' :
                                e.aiState === EnemyAiState.STUNNED ? 'bg-gray-500' : 'bg-red-500'
                            }`} />
                            <span className="text-slate-300 text-xs">{e.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {missionState === KageroMissionState.MISSION_COMPLETE && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-60">
                    <div className="bg-slate-900 rounded-xl p-8 text-center border-2 border-amber-500 shadow-2xl shadow-amber-500/20">
                        <div className="text-7xl mb-4">🏆</div>
                        <h2 className="text-4xl font-bold text-amber-500 mb-2">MISION COMPLETADA</h2>
                        <p className="text-slate-400 mb-6">Has eliminado a todos los enemigos</p>
                        <div className="flex justify-center gap-8 mb-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-400">{maxCombo}</div>
                                <div className="text-xs text-slate-500">Cadena Max</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-400">{totalEnemies}</div>
                                <div className="text-xs text-slate-500">Enemigos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-purple-400">{trapPlacements.length}</div>
                                <div className="text-xs text-slate-500">Trampas</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setMissionState(KageroMissionState.RETURN_TO_HEX)}
                            className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-lg transition-all shadow-lg shadow-amber-600/30"
                        >
                            Volver al Mapa
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
