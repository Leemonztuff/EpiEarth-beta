import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import { 
    GameState, 
    KageroMissionState, 
    KageroMission, 
    KageroRoom,
    KageroEnemyState,
    TrapSlot,
    TrapSurface,
    KageroEnemyAIState,
    KageroDoor,
    TrapType,
    PlacedKageroTrap
} from '../types';
import { generateKageroMission, getMissionForTile } from '../services/KageroDungeonGenerator';
import { TRAP_DATA, TrapData } from '../data/trapsData';
import * as THREE from 'three';

const CELL_SIZE = 2;
const TRAP_TRIGGER_DISTANCE = 1.0;

interface PlayerState {
    position: THREE.Vector3;
    rotation: number;
    roomId: string;
}

function PlayerController({ 
    playerRef, 
    canMove,
    mission 
}: { 
    playerRef: React.MutableRefObject<PlayerState>, 
    canMove: boolean,
    mission: KageroMission | null
}) {
    const meshRef = useRef<THREE.Group>(null);
    const { camera } = useThree();
    const keysPressed = useRef<Set<string>>(new Set());
    const moveSpeed = 0.15;
    const runSpeed = 0.25;
    const smoothRotation = useRef(0);
    const isRunning = useRef(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressed.current.add(e.key.toLowerCase());
            if (e.key === 'Shift') isRunning.current = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase());
            if (e.key === 'Shift') isRunning.current = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;

        let dx = 0, dz = 0;
        if (canMove) {
            const currentSpeed = isRunning.current ? runSpeed : moveSpeed;
            
            if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dz -= 1;
            if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dz += 1;
            if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= 1;
            if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += 1;

            if (dx !== 0 || dz !== 0) {
                const cameraAngle = Math.atan2(
                    camera.position.x - playerRef.current.position.x,
                    camera.position.z - playerRef.current.position.z
                );
                
                const inputAngle = Math.atan2(dx, dz);
                const moveAngle = cameraAngle + inputAngle;
                
                const len = Math.sqrt(dx * dx + dz * dz);
                const normalizedDx = dx / len;
                const normalizedDz = dz / len;
                
                const worldDx = Math.sin(moveAngle) * currentSpeed;
                const worldDz = Math.cos(moveAngle) * currentSpeed;

                const newX = playerRef.current.position.x + worldDx;
                const newZ = playerRef.current.position.z + worldDz;
                
                let canMove = true;
                if (mission) {
                    const currentRoom = mission.rooms.find(r => r.id === mission.currentRoomId);
                    if (currentRoom) {
                        const bounds = currentRoom.bounds;
                        const margin = 1.5;
                        canMove = newX >= bounds.minX * CELL_SIZE + margin && 
                                  newX <= bounds.maxX * CELL_SIZE - margin &&
                                  newZ >= bounds.minZ * CELL_SIZE + margin && 
                                  newZ <= bounds.maxZ * CELL_SIZE - margin;
                    }
                }
                
                if (canMove) {
                    playerRef.current.position.x = newX;
                    playerRef.current.position.z = newZ;
                }
                
                playerRef.current.rotation = moveAngle;
            }
        }

        smoothRotation.current += (playerRef.current.rotation - smoothRotation.current) * 0.15;
        meshRef.current.rotation.y = smoothRotation.current;
        meshRef.current.position.copy(playerRef.current.position);

        const offsetDist = 8;
        const camHeight = 12;
        camera.position.set(
            playerRef.current.position.x - Math.sin(smoothRotation.current) * offsetDist,
            camHeight,
            playerRef.current.position.z + Math.cos(smoothRotation.current) * offsetDist
        );
        camera.lookAt(playerRef.current.position.x, playerRef.current.position.y + 1, playerRef.current.position.z);
    });

    return (
        <group ref={meshRef}>
            <spotLight 
                position={[0, 4, 0]} 
                angle={0.8} 
                penumbra={0.5} 
                intensity={1.5} 
                color="#ffefd5"
                castShadow
                target-position={[0, 0, 0]}
            />
            <mesh castShadow position={[0, 0.7, 0]}>
                <cylinderGeometry args={[0.3, 0.35, 1.4, 8]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.3} roughness={0.7} />
            </mesh>
            <mesh position={[0, 1.5, 0]}>
                <sphereGeometry args={[0.25, 12, 12]} />
                <meshStandardMaterial color="#fef3c7" />
            </mesh>
        </group>
    );
}

function RoomGeometry({ room }: { room: KageroRoom }) {
    const bounds = room.bounds;
    const width = (bounds.maxX - bounds.minX) * CELL_SIZE;
    const depth = (bounds.maxZ - bounds.minZ) * CELL_SIZE;
    const centerX = (bounds.minX + bounds.maxX) / 2 * CELL_SIZE;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2 * CELL_SIZE;

    return (
        <group>
            <mesh position={[centerX, -0.1, centerZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[width, depth]} />
                <meshStandardMaterial color="#5a5a7a" roughness={0.9} />
            </mesh>

            <mesh position={[centerX - width/2, room.wallHeight/2, centerZ]} castShadow receiveShadow>
                <boxGeometry args={[0.3, room.wallHeight, depth]} />
                <meshStandardMaterial color="#6a6a8a" roughness={0.8} />
            </mesh>
            <mesh position={[centerX + width/2, room.wallHeight/2, centerZ]} castShadow receiveShadow>
                <boxGeometry args={[0.3, room.wallHeight, depth]} />
                <meshStandardMaterial color="#6a6a8a" roughness={0.8} />
            </mesh>
            <mesh position={[centerX, room.wallHeight/2, centerZ - depth/2]} castShadow receiveShadow>
                <boxGeometry args={[width, room.wallHeight, 0.3]} />
                <meshStandardMaterial color="#6a6a8a" roughness={0.8} />
            </mesh>
            <mesh position={[centerX, room.wallHeight/2, centerZ + depth/2]} castShadow receiveShadow>
                <boxGeometry args={[width, room.wallHeight, 0.3]} />
                <meshStandardMaterial color="#6a6a8a" roughness={0.8} />
            </mesh>

            <mesh position={[centerX, room.wallHeight + 0.1, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[width, depth]} />
                <meshStandardMaterial color="#5a5a7a" roughness={0.9} />
            </mesh>
        </group>
    );
}

function TrapSlotMesh({ 
    slot, 
    onClick, 
    selected, 
    hasTrap,
    trapType,
    showRange,
    playerPos 
}: { 
    slot: TrapSlot, 
    onClick: () => void, 
    selected: boolean,
    hasTrap: boolean,
    trapType?: TrapType,
    showRange?: boolean,
    playerPos?: THREE.Vector3
}) {
    const surfaceColor = slot.surface === TrapSurface.FLOOR ? '#22c55e' : 
                        slot.surface === TrapSurface.WALL ? '#f59e0b' : '#3b82f6';
    const color = hasTrap ? '#8b5cf6' : selected ? surfaceColor : '#4ade8044';
    const opacity = hasTrap ? 0.9 : selected ? 0.8 : 0.4;

    const showEffectRange = showRange && selected && trapType && TRAP_DATA[trapType]?.range;
    const range = showEffectRange ? TRAP_DATA[trapType].range : 0;

    return (
        <group>
            <mesh
                position={[slot.position.x, slot.position.y, slot.position.z]}
                onClick={onClick}
            >
                <boxGeometry args={[1.2, 0.1, 1.2]} />
                <meshStandardMaterial 
                    color={color} 
                    transparent 
                    opacity={opacity}
                    emissive={hasTrap ? '#8b5cf6' : selected ? surfaceColor : '#000000'}
                    emissiveIntensity={hasTrap ? 0.3 : selected ? 0.4 : 0}
                />
            </mesh>
            {showEffectRange && range > 0 && (
                <mesh
                    position={[slot.position.x, slot.position.y + 0.05, slot.position.z]}
                    rotation={[-Math.PI / 2, 0, 0]}
                >
                    <ringGeometry args={[range * CELL_SIZE - 0.5, range * CELL_SIZE, 16]} />
                    <meshBasicMaterial 
                        color={TRAP_DATA[trapType].trapColor} 
                        transparent 
                        opacity={0.3}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
        </group>
    );
}

function GridOverlay({ room, show }: { room: KageroRoom | undefined, show: boolean }) {
    if (!show || !room) return null;
    
    const bounds = room.bounds;
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;
    const centerX = (bounds.minX + bounds.maxX) / 2 * CELL_SIZE;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2 * CELL_SIZE;
    
    return (
        <group>
            {Array.from({ length: width }).map((_, x) =>
                Array.from({ length: depth }).map((_, z) => {
                    const worldX = (bounds.minX + x + 0.5) * CELL_SIZE;
                    const worldZ = (bounds.minZ + z + 0.5) * CELL_SIZE;
                    return (
                        <mesh
                            key={`grid_${x}_${z}`}
                            position={[worldX, 0.02, worldZ]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            <planeGeometry args={[CELL_SIZE * 0.95, CELL_SIZE * 0.95]} />
                            <meshBasicMaterial 
                                color="#ffffff"
                                transparent 
                                opacity={0.08}
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    );
                })
            )}
        </group>
    );
}

function TrapRangeIndicator({ 
    trap, 
    trapData 
}: { 
    trap: PlacedKageroTrap | null,
    trapData: TrapData | null 
}) {
    if (!trap || !trapData || trapData.range <= 0) return null;
    
    const range = trapData.range * CELL_SIZE;
    
    return (
        <mesh
            position={[trap.position.x, trap.position.y + 0.1, trap.position.z]}
            rotation={[-Math.PI / 2, 0, 0]}
        >
            <circleGeometry args={[range, 32]} />
            <meshBasicMaterial 
                color={trapData.trapColor}
                transparent 
                opacity={0.2}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

function EnemyMesh({ enemy }: { enemy: KageroEnemyState }) {
    const groupRef = useRef<THREE.Group>(null);
    const targetPos = useRef(new THREE.Vector3());

    useEffect(() => {
        targetPos.current.set(enemy.position.x, enemy.position.y, enemy.position.z);
    }, [enemy.position]);

    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.position.lerp(targetPos.current, 0.1);
        }
    });

    if (!enemy.isAlive) return null;

    const hpPercent = enemy.hp / enemy.maxHp;
    const stateColor = enemy.aiState === 'idle' ? '#9ca3af' :
                      enemy.aiState === 'patrol' ? '#ef4444' :
                      enemy.aiState === 'alert' ? '#f59e0b' :
                      enemy.aiState === 'investigate' ? '#eab308' :
                      enemy.aiState === 'chase' ? '#f97316' :
                      enemy.aiState === 'trapped' ? '#dc2626' :
                      enemy.aiState === 'stunned' ? '#6b7280' :
                      enemy.aiState === 'confused' ? '#a855f7' :
                      enemy.aiState === 'frozen' ? '#06b6d4' : '#ef4444';

    return (
        <group ref={groupRef} position={[enemy.position.x, enemy.position.y, enemy.position.z]}>
            <mesh castShadow>
                <boxGeometry args={[0.7, 1.2, 0.7]} />
                <meshStandardMaterial color={stateColor} />
            </mesh>
            <mesh position={[0, 0.75, 0]}>
                <sphereGeometry args={[0.25, 8, 8]} />
                <meshStandardMaterial color={stateColor} />
            </mesh>
            
            <mesh position={[0, 1.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.5 * hpPercent, 0.08]} />
                <meshBasicMaterial color="#22c55e" />
            </mesh>
            <mesh position={[0, 1.35, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.52, 0.1]} />
                <meshBasicMaterial color="#1f2937" />
            </mesh>
        </group>
    );
}

function Lighting() {
    return (
        <>
            <ambientLight intensity={0.8} color="#e8e8ff" />
            <directionalLight 
                position={[10, 25, 10]} 
                intensity={1.5} 
                color="#fff5e6"
                castShadow 
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={60}
                shadow-camera-left={-30}
                shadow-camera-right={30}
                shadow-camera-top={30}
                shadow-camera-bottom={-30}
            />
            <pointLight position={[10, 8, 10]} intensity={1.5} color="#ffefd5" distance={30} />
            <hemisphereLight args={['#b4d7ff', '#5a5a7a', 0.6]} />
            <fog attach="fog" args={['#1a1a2e', 15, 50]} />
        </>
    );
}

function DoorMesh({ 
    door, 
    onPlayerEnter 
}: { 
    door: KageroDoor, 
    onPlayerEnter: (door: KageroDoor) => void 
}) {
    const [hovered, setHovered] = useState(false);
    
    return (
        <group 
            position={[door.position.x, door.position.y, door.position.z]}
            onClick={() => onPlayerEnter(door)}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
        >
            <mesh castShadow>
                <boxGeometry args={[2, 3, 0.3]} />
                <meshStandardMaterial 
                    color={hovered ? '#22c55e' : door.isLocked ? '#dc2626' : '#78716c'} 
                    emissive={hovered ? '#22c55e' : '#000000'}
                    emissiveIntensity={hovered ? 0.3 : 0}
                />
            </mesh>
            {door.isLocked && (
                <mesh position={[0.4, 0, 0.2]}>
                    <sphereGeometry args={[0.15, 8, 8]} />
                    <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
                </mesh>
            )}
        </group>
    );
}

function CorridorMesh({ from, to }: { from: KageroRoom, to: KageroRoom }) {
    const midZ = ((from.bounds.maxZ + to.bounds.minZ) / 2) * CELL_SIZE;
    const length = (to.bounds.minZ - from.bounds.maxZ) * CELL_SIZE;
    const centerX = from.center.x;
    
    return (
        <group>
            <mesh position={[centerX, -0.1, midZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[4, Math.abs(length)]} />
                <meshStandardMaterial color="#1a1a2e" roughness={1} />
            </mesh>
            <mesh position={[centerX - 2, 2.5, midZ]} castShadow receiveShadow>
                <boxGeometry args={[0.3, 5, Math.abs(length)]} />
                <meshStandardMaterial color="#2d2d44" roughness={0.9} />
            </mesh>
            <mesh position={[centerX + 2, 2.5, midZ]} castShadow receiveShadow>
                <boxGeometry args={[0.3, 5, Math.abs(length)]} />
                <meshStandardMaterial color="#2d2d44" roughness={0.9} />
            </mesh>
        </group>
    );
}

function SceneContent({ 
    mission, 
    missionState, 
    selectedSlot, 
    selectedTrapType,
    onSlotClick, 
    onDoorEnter,
    playerRef,
    enemies,
    triggeringTraps,
    timeFrozen
}: any) {
    const canMove = !timeFrozen && (missionState === KageroMissionState.EXPLORATION || 
                   missionState === KageroMissionState.KAGERO_PLAYER_LURE);
    const showTrapSlots = missionState === KageroMissionState.TACTICAL_SETUP || timeFrozen;
    const showGrid = missionState === KageroMissionState.TACTICAL_SETUP || timeFrozen;

    const currentRoom = mission?.rooms.find(r => r.id === mission.currentRoomId);
    const currentRoomDoors = mission?.doors.filter(d => d.fromRoomId === currentRoom?.id) || [];

    return (
        <>
            <Lighting />
            <TimeFrozenOverlay active={timeFrozen} />
            
            {mission?.rooms.map(room => (
                <RoomGeometry key={room.id} room={room} />
            ))}
            
            {mission && mission.rooms.length > 1 && (
                <>
                    {mission.rooms.slice(0, -1).map((room, idx) => (
                        <CorridorMesh key={`corridor_${idx}`} from={room} to={mission.rooms[idx + 1]} />
                    ))}
                </>
            )}
            
            <PlayerController 
                playerRef={playerRef} 
                canMove={canMove}
                mission={mission}
            />
            
            <GridOverlay room={currentRoom} show={showGrid} />
            
            {showTrapSlots && currentRoom?.trapSlots.map(slot => {
                const hasTrap = mission?.placedTraps.some(t => t.slotId === slot.id);
                const isSelected = selectedSlot?.id === slot.id;
                return (
                    <TrapSlotMesh
                        key={slot.id}
                        slot={slot}
                        onClick={() => onSlotClick(slot)}
                        selected={isSelected}
                        hasTrap={!!hasTrap}
                        trapType={selectedTrapType}
                        showRange={isSelected}
                        playerPos={playerRef.current.position}
                    />
                );
            })}
            
            {enemies.filter(e => e.isAlive).map(enemy => (
                <EnemyMesh key={enemy.id} enemy={enemy} />
            ))}
            
            {currentRoomDoors.map(door => (
                <DoorMesh key={door.id} door={door} onPlayerEnter={onDoorEnter} />
            ))}
            
            {triggeringTraps.map(trapEffect => (
                <TrapEffect key={trapEffect.id} effect={trapEffect} />
            ))}
        </>
    );
}

interface TrapEffectData {
    id: string;
    position: THREE.Vector3;
    trapType: TrapType;
    startTime: number;
}

function TrapEffect({ effect }: { effect: TrapEffectData }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [opacity, setOpacity] = useState(1);
    
    useFrame(() => {
        const elapsed = Date.now() - effect.startTime;
        const duration = 800;
        if (elapsed > duration) {
            setOpacity(0);
        } else {
            setOpacity(1 - (elapsed / duration));
        }
        if (meshRef.current) {
            meshRef.current.scale.setScalar(1 + (elapsed / duration) * 2);
        }
    });
    
    const color = effect.trapType === TrapType.FIRE ? '#ef4444' :
                  effect.trapType === TrapType.ICE ? '#60a5fa' :
                  effect.trapType === TrapType.POISON ? '#a855f7' :
                  effect.trapType === TrapType.EXPLOSIVE ? '#f97316' :
                  effect.trapType === TrapType.STUN ? '#fbbf24' :
                  effect.trapType === TrapType.SPIKE ? '#dc2626' :
                  '#22c55e';
    
    return (
        <mesh ref={meshRef} position={[effect.position.x, effect.position.y, effect.position.z]}>
            <sphereGeometry args={[1.5, 16, 16]} />
            <meshStandardMaterial 
                color={color}
                transparent
                opacity={opacity * 0.6}
                emissive={color}
                emissiveIntensity={0.5}
            />
        </mesh>
    );
}

function TrapTrajectory({ trap }: { trap: PlacedKageroTrap }) {
    const { launchDirection, launchForce } = trap;
    
    if (!launchForce || launchForce === 0) return null;
    
    const endX = trap.position.x + launchDirection.x * launchForce * 3;
    const endZ = trap.position.z + launchDirection.z * launchForce * 3;
    const endY = trap.position.y + launchDirection.y * launchForce * 3;
    
    const points = useMemo(() => {
        return [
            new THREE.Vector3(trap.position.x, trap.position.y, trap.position.z),
            new THREE.Vector3(endX, endY, endZ),
        ];
    }, [trap.position, endX, endY, endZ]);
    
    const lineGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        return geometry;
    }, [points]);
    
    return (
        <primitive object={new THREE.Line(
            lineGeometry,
            new THREE.LineBasicMaterial({ color: '#ff6b6b', transparent: true, opacity: 0.7 })
        )} />
    );
}

function TimeFrozenOverlay({ active }: { active: boolean }) {
    if (!active) return null;
    
    return (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1000, 1000]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.15} />
        </mesh>
    );
}

export default function Exploration3DScene() {
    const explorationState = useGameStore(s => s.explorationState);
    const setGameState = useGameStore(s => s.setGameState);
    const addLog = useGameStore(s => s.addLog);
    const addGold = useGameStore(s => s.addGold);
    const clearCurrentEncounter = useGameStore(s => s.clearCurrentEncounter);
    const syncOverworldEnemies = useGameStore(s => s.syncOverworldEnemies);

    const [missionState, setMissionState] = useState<KageroMissionState>(KageroMissionState.LOADING);
    const [mission, setMission] = useState<KageroMission | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<TrapSlot | null>(null);
    const [selectedSurface, setSelectedSurface] = useState<TrapSurface>(TrapSurface.FLOOR);
    const [selectedTrapType, setSelectedTrapType] = useState<TrapType>(TrapType.SPIKE);
    const [triggeringTraps, setTriggeringTraps] = useState<TrapEffectData[]>([]);
    const [timeFrozen, setTimeFrozen] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [showTutorial, setShowTutorial] = useState(true);
    const playerRef = useRef<PlayerState>({
        position: new THREE.Vector3(0, 0.8, 0),
        rotation: 0,
        roomId: '',
    });
    const [currentStep, setCurrentStep] = useState(0);
    const [comboCount, setComboCount] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);

    const TUTORIAL_STEPS = [
        { key: 'T', text: 'Presiona [T] para entrar en MODO TACTICO' },
        { key: '1-3', text: 'Usa [1-2-3] para seleccionar superficie (Piso/Pared/Techo)' },
        { key: 'QWER', text: 'Usa [Q-W-E-R] para seleccionar tipo de trampa' },
        { key: 'CLICK', text: 'Haz CLICK en un slot verde para COLOCAR la trampa' },
        { key: 'E', text: 'Presiona [E] para ACTIVAR trampas manualmente' },
        { key: 'WASD', text: 'Usa [WASD] para MOVER al personaje y atraer enemigos' },
    ];

    const advanceTutorial = () => {
        if (tutorialStep < TUTORIAL_STEPS.length - 1) {
            setTutorialStep(t => t + 1);
        } else {
            setShowTutorial(false);
        }
    };

    const TRAP_TYPES_BY_SURFACE = useMemo(() => ({
        [TrapSurface.FLOOR]: [TrapType.SPIKE, TrapType.FIRE, TrapType.ICE, TrapType.POISON, TrapType.EXPLOSIVE, TrapType.TRAP_DOOR],
        [TrapSurface.WALL]: [TrapType.STUN, TrapType.EXPLOSIVE, TrapType.ALARM],
        [TrapSurface.CEILING]: [TrapType.STUN, TrapType.EXPLOSIVE, TrapType.TELEPORT],
    }), []);

    useEffect(() => {
        const tier = explorationState.zoneContext?.tier || 1;
        const { dungeonType, name } = getMissionForTile('dungeon', explorationState.currentBiome || 'dungeon', tier);
        
        const generatedMission = generateKageroMission(
            explorationState.zoneContext?.poiId || `mission_${Date.now()}`,
            dungeonType,
            name || explorationState.zoneName || 'Mision',
            tier
        );
        
        setMission(generatedMission);
        playerRef.current.position.set(
            generatedMission.playerPosition.x,
            generatedMission.playerPosition.y,
            generatedMission.playerPosition.z
        );
        playerRef.current.roomId = generatedMission.currentRoomId;
        
        addLog(`=== ${generatedMission.missionName.toUpperCase()} ===`, 'narrative');
        addLog(`Dungeon: ${generatedMission.dungeonType}`, 'narrative');
        addLog(`Enemigos: ${generatedMission.totalEnemies}`, 'info');
        addLog('[T] Modo Tactico | [1-3] Superficie | [WASD] Mover', 'info');

        const loadTimer = setTimeout(() => {
            setMissionState(KageroMissionState.EXPLORATION);
        }, 800);

        return () => clearTimeout(loadTimer);
    }, [addLog, explorationState]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '1') {
                setSelectedSurface(TrapSurface.FLOOR);
                setSelectedTrapType(TrapType.SPIKE);
                addLog('PISO - Spike', 'info');
                advanceTutorial();
            } else if (e.key === '2') {
                setSelectedSurface(TrapSurface.WALL);
                setSelectedTrapType(TrapType.STUN);
                addLog('PARED - Stun', 'info');
                advanceTutorial();
            } else if (e.key === '3') {
                setSelectedSurface(TrapSurface.CEILING);
                setSelectedTrapType(TrapType.EXPLOSIVE);
                addLog('TECHO - Explosivo', 'info');
                advanceTutorial();
            }
            
            if (e.key === 'q' || e.key === 'Q') {
                setSelectedTrapType(TrapType.SPIKE);
                addLog('Trampa: Spike', 'info');
                advanceTutorial();
            } else if (e.key === 'w' || e.key === 'W') {
                setSelectedTrapType(TrapType.FIRE);
                addLog('Trampa: Fuego', 'info');
            } else if (e.key === 'e' || e.key === 'E') {
                setSelectedTrapType(TrapType.ICE);
                addLog('Trampa: Hielo', 'info');
            } else if (e.key === 'r' || e.key === 'R') {
                setSelectedTrapType(TrapType.POISON);
                addLog('Trampa: Veneno', 'info');
            }
            
            if (e.key.toLowerCase() === 't') {
                if (missionState === KageroMissionState.EXPLORATION) {
                    setMissionState(KageroMissionState.TACTICAL_SETUP);
                    setTimeFrozen(true);
                    addLog('>>> TIEMPO DETENIDO: Coloca trampas', 'combat');
                    advanceTutorial();
                } else if (missionState === KageroMissionState.TACTICAL_SETUP) {
                    setMissionState(KageroMissionState.EXPLORATION);
                    setTimeFrozen(false);
                    addLog('<<< TIEMPO REANUDADO', 'combat');
                }
                advanceTutorial();
            }
            
            if (e.key === ' ' || e.key.toLowerCase() === 'activate') {
                if (missionState === KageroMissionState.EXPLORATION && mission) {
                    activateNearestTrap();
                    advanceTutorial();
                }
            }
            
            if (e.key === 'Escape') {
                if (missionState === KageroMissionState.TACTICAL_SETUP) {
                    setMissionState(KageroMissionState.EXPLORATION);
                    setTimeFrozen(false);
                    setSelectedSlot(null);
                } else {
                    setMissionState(KageroMissionState.RETURN_TO_HEX);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [missionState, addLog]);

    const activateNearestTrap = useCallback(() => {
        if (!mission) return;
        
        const playerPos = playerRef.current.position;
        let nearestTrap: PlacedKageroTrap | null = null;
        let nearestDist = Infinity;
        
        for (const trap of mission.placedTraps) {
            if (trap.triggered) continue;
            const dist = Math.sqrt(
                Math.pow(trap.position.x - playerPos.x, 2) + 
                Math.pow(trap.position.z - playerPos.z, 2)
            );
            if (dist < nearestDist && dist < 8) {
                nearestDist = dist;
                nearestTrap = trap;
            }
        }
        
        if (nearestTrap) {
            setMission(prev => {
                if (!prev) return prev;
                const updatedTraps = prev.placedTraps.map(t => 
                    t.id === nearestTrap!.id ? { ...t, triggered: true, triggeredAtStep: currentStep } : t
                );
                return { ...prev, placedTraps: updatedTraps };
            });
            
            setTriggeringTraps(prev => [...prev, {
                id: `${nearestTrap!.id}_manual_${Date.now()}`,
                position: new THREE.Vector3(nearestTrap!.position.x, nearestTrap!.position.y, nearestTrap!.position.z),
                trapType: nearestTrap!.trapType,
                startTime: Date.now(),
            }]);
            
            addLog(`>>> TRAMPA ACTIVADA: ${TRAP_DATA[nearestTrap!.trapType].name}`, 'combat');
            
            let enemiesHit = 0;
            setMission(prev => {
                if (!prev) return prev;
                
                const updatedEnemies = prev.enemies.map(enemy => {
                    if (!enemy.isAlive) return enemy;
                    
                    const dist = Math.sqrt(
                        Math.pow(enemy.position.x - nearestTrap!.position.x, 2) + 
                        Math.pow(enemy.position.z - nearestTrap!.position.z, 2)
                    );
                    
                    if (dist < 3) {
                        enemiesHit++;
                        const trapData = TRAP_DATA[nearestTrap!.trapType];
                        let damage = Math.floor(trapData.damage * (1 - enemy.resistances.physical / 100));
                        const finalHp = Math.max(0, enemy.hp - damage);
                        
                        addLog(`${enemy.name} alcanzado! -${damage} HP`, 'combat');
                        
                        if (finalHp <= 0) {
                            addLog(`${enemy.name} derrotado!`, 'combat');
                            return { ...enemy, hp: 0, isAlive: false };
                        }
                        
                        return { ...enemy, hp: finalHp };
                    }
                    return enemy;
                });
                
                return { ...prev, enemies: updatedEnemies };
            });
            
            if (enemiesHit > 1) {
                setComboCount(c => {
                    const newCombo = c + enemiesHit;
                    setMaxCombo(m => Math.max(m, newCombo));
                    return newCombo;
                });
                addLog(`>>> COMBO x${enemiesHit}!`, 'combat');
            }
        } else {
            addLog('No hay trampas cerca para activar', 'info');
        }
    }, [mission, currentStep, addLog]);

    const handleDoorEnter = useCallback((door: KageroDoor) => {
        if (!mission) return;
        if (door.isLocked) {
            addLog('Puerta bloqueada - Derrota a todos los enemigos primero', 'info');
            return;
        }
        
        const currentRoom = mission.rooms.find(r => r.id === mission.currentRoomId);
        if (currentRoom && !currentRoom.isCleared) {
            addLog('Derrota a todos los enemigos para desbloquear las puertas', 'info');
            return;
        }
        
        const nextRoomId = door.toRoomId;
        const nextRoom = mission.rooms.find(r => r.id === nextRoomId);
        if (!nextRoom) return;
        
        playerRef.current.position.set(nextRoom.center.x, 0.8, nextRoom.center.z);
        setMission(prev => prev ? { ...prev, currentRoomId: nextRoomId } : prev);
        addLog(`Entrando a: ${nextRoom.name}`, 'narrative');
    }, [mission, addLog]);

    const triggerTrap = useCallback((trap: PlacedKageroTrap, enemy: KageroEnemyState, currentCombo: number): { damage: number; effects: string[]; newCombo: number } => {
        const trapData = TRAP_DATA[trap.trapType];
        if (!trapData) return { damage: 0, effects: [], newCombo: currentCombo };
        
        const effects: string[] = [];
        let damage = trapData.damage;
        let newCombo = currentCombo;

        switch (trap.trapType) {
            case TrapType.FIRE:
                damage = Math.floor(damage * (1 - enemy.resistances.magical / 100));
                effects.push('Fuego');
                break;
            case TrapType.ICE:
                damage = Math.floor(damage * (1 - enemy.resistances.freeze / 100));
                if (enemy.frozenTurns === 0) effects.push('Congelado');
                break;
            case TrapType.POISON:
                damage = Math.floor(damage * (1 - enemy.resistances.poison / 100));
                if (enemy.poisonTurns === 0) effects.push('Envenenado');
                break;
            case TrapType.STUN:
                damage = Math.floor(damage * (1 - enemy.resistances.stun / 100));
                if (enemy.stunnedTurns === 0) effects.push('Aturdido');
                break;
            case TrapType.SPIKE:
            case TrapType.EXPLOSIVE:
                damage = Math.floor(damage * (1 - enemy.resistances.physical / 100));
                effects.push('Dano');
                break;
            default:
                effects.push('Efecto');
        }

        if (trap.trapType === TrapType.ALARM) {
            effects.push('Alarma');
        }

        const comboBonus = Math.min(currentCombo * 5, 50);
        damage = Math.floor(damage * (1 + comboBonus / 100));
        
        if (currentCombo > 0) {
            newCombo = currentCombo + 1;
            effects.push(`Cadena x${newCombo}`);
        } else {
            newCombo = 1;
        }
        
        setTriggeringTraps(prev => [...prev, {
            id: `${trap.id}_${Date.now()}`,
            position: new THREE.Vector3(trap.position.x, trap.position.y, trap.position.z),
            trapType: trap.trapType,
            startTime: Date.now(),
        }]);
        
        return { damage, effects, newCombo };
    }, []);

    useEffect(() => {
        if (missionState !== KageroMissionState.EXPLORATION && 
            missionState !== KageroMissionState.KAGERO_PLAYER_LURE) return;

        const interval = setInterval(() => {
            setCurrentStep(s => s + 1);

            if (!mission) return;

            setMission(prev => {
                if (!prev) return prev;

                const playerPos = playerRef.current.position;
                let localComboCount = 0;
                let updatedEnemies = [...prev.enemies];
                let updatedTraps = prev.placedTraps.map(t => ({ ...t }));
                
                updatedEnemies = updatedEnemies.map(enemy => {
                    if (!enemy.isAlive) return enemy;
                    
                    let newAiState = enemy.aiState;
                    let newPos = { ...enemy.position };
                    let newPatrolIndex = enemy.patrolIndex;
                    let newTargetPos = enemy.targetPosition;
                    let triggerResult: { damage: number; effects: string[]; newCombo: number } | null = null;
                    
                    const distToPlayer = Math.sqrt(
                        Math.pow(enemy.position.x - playerPos.x, 2) + 
                        Math.pow(enemy.position.z - playerPos.z, 2)
                    );

                    if (enemy.stunnedTurns > 0) {
                        return { ...enemy, stunnedTurns: enemy.stunnedTurns - 1, aiState: 'stunned' as KageroEnemyAIState };
                    }
                    if (enemy.confusedTurns > 0) {
                        const randMove = Math.random() > 0.5 ? 1 : -1;
                        newPos = {
                            x: enemy.position.x + randMove * 0.5,
                            y: enemy.position.y,
                            z: enemy.position.z + (Math.random() - 0.5) * 0.5,
                        };
                        return { ...enemy, confusedTurns: enemy.confusedTurns - 1, aiState: 'confused' as KageroEnemyAIState, position: newPos };
                    }
                    if (enemy.poisonTurns > 0) {
                        const poisonDmg = Math.floor(enemy.maxHp * 0.05);
                        if (enemy.hp - poisonDmg <= 0) {
                            addLog(`${enemy.name} muere por veneno! +${enemy.goldReward} oro`, 'combat');
                            return { ...enemy, hp: 0, isAlive: false };
                        }
                        return { ...enemy, hp: Math.max(0, enemy.hp - poisonDmg), poisonTurns: enemy.poisonTurns - 1 };
                    }
                    if (enemy.frozenTurns > 0) {
                        return { ...enemy, frozenTurns: enemy.frozenTurns - 1, aiState: 'frozen' as KageroEnemyAIState };
                    }

                    for (const trap of updatedTraps) {
                        if (trap.currentCooldown > 0 || trap.triggered) continue;
                        if (trap.slotId && !trap.slotId.includes(enemy.roomId)) continue;
                        
                        const distToTrap = Math.sqrt(
                            Math.pow(enemy.position.x - trap.position.x, 2) + 
                            Math.pow(enemy.position.z - trap.position.z, 2)
                        );
                        
                        if (distToTrap < TRAP_TRIGGER_DISTANCE) {
                            triggerResult = triggerTrap(trap, enemy, localComboCount);
                            trap.currentCooldown = trap.cooldown;
                            trap.triggered = true;
                            trap.triggeredAtStep = currentStep;
                            trap.comboChain = triggerResult.newCombo;
                            break;
                        }
                    }

                    if (triggerResult) {
                        localComboCount = triggerResult.newCombo;
                        setMaxCombo(m => Math.max(m, triggerResult!.newCombo));
                        
                        newAiState = 'trapped';
                        
                        if (triggerResult.effects.includes('Congelado')) {
                            newAiState = 'frozen';
                        } else if (triggerResult.effects.includes('Aturdido')) {
                            newAiState = 'stunned';
                        }
                        
                        const finalHp = Math.max(0, enemy.hp - triggerResult.damage);
                        
                        const trapName = TRAP_DATA[triggerResult.effects[0]]?.name || 'trampa';
                        addLog(`${enemy.name} cae en ${trapName}! -${triggerResult.damage} HP`, 'combat');
                        
                        if (finalHp <= 0) {
                            addLog(`${enemy.name} derrotado! +${enemy.goldReward} oro`, 'combat');
                            return { ...enemy, hp: 0, isAlive: false };
                        }
                        
                        return {
                            ...enemy,
                            hp: finalHp,
                            aiState: newAiState,
                            targetPosition: newTargetPos,
                            stunnedTurns: triggerResult.effects.includes('Aturdido') ? 2 : enemy.stunnedTurns,
                            frozenTurns: triggerResult.effects.includes('Congelado') ? 3 : enemy.frozenTurns,
                            poisonTurns: triggerResult.effects.includes('Envenenado') ? 5 : enemy.poisonTurns,
                        };
                    }

                    const inDetectionRange = distToPlayer < enemy.detectionRadius * CELL_SIZE;
                    const inChaseRange = distToPlayer < enemy.detectionRadius * CELL_SIZE * 0.6;

                    switch (enemy.aiState) {
                        case 'idle':
                            if (inDetectionRange) {
                                newAiState = 'alert';
                                addLog(`¡${enemy.name} te ve!`, 'combat');
                            } else if (enemy.patrolPath.length > 0) {
                                newAiState = 'patrol';
                            }
                            break;

                        case 'patrol':
                            if (inChaseRange) {
                                newAiState = 'alert';
                                addLog(`¡${enemy.name} te ha visto!`, 'combat');
                            } else if (enemy.patrolPath.length > 0) {
                                const target = enemy.patrolPath[enemy.patrolIndex];
                                const targetX = target.x * CELL_SIZE;
                                const targetZ = target.z * CELL_SIZE;
                                const distToTarget = Math.sqrt(
                                    Math.pow(enemy.position.x - targetX, 2) + 
                                    Math.pow(enemy.position.z - targetZ, 2)
                                );
                                
                                if (distToTarget < CELL_SIZE * 0.5) {
                                    newPatrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
                                } else {
                                    const dx = targetX - enemy.position.x;
                                    const dz = targetZ - enemy.position.z;
                                    const len = Math.sqrt(dx * dx + dz * dz) || 1;
                                    newPos = {
                                        x: enemy.position.x + (dx / len) * enemy.moveSpeed * 0.3,
                                        y: enemy.position.y,
                                        z: enemy.position.z + (dz / len) * enemy.moveSpeed * 0.3,
                                    };
                                }
                                newTargetPos = enemy.patrolPath[newPatrolIndex];
                            }
                            break;

                        case 'alert':
                            newAiState = 'investigate';
                            newTargetPos = { x: playerPos.x / CELL_SIZE, z: playerPos.z / CELL_SIZE };
                            break;

                        case 'investigate':
                            if (inChaseRange) {
                                newAiState = 'chase';
                                if (missionState !== KageroMissionState.KAGERO_PLAYER_LURE) {
                                    setMissionState(KageroMissionState.KAGERO_PLAYER_LURE);
                                }
                            } else if (enemy.targetPosition) {
                                const targetX = enemy.targetPosition.x * CELL_SIZE;
                                const targetZ = enemy.targetPosition.z * CELL_SIZE;
                                const distToTarget = Math.sqrt(
                                    Math.pow(enemy.position.x - targetX, 2) + 
                                    Math.pow(enemy.position.z - targetZ, 2)
                                );
                                
                                if (distToTarget < CELL_SIZE) {
                                    newAiState = 'patrol';
                                    newTargetPos = null;
                                    if (missionState === KageroMissionState.KAGERO_PLAYER_LURE) {
                                        setMissionState(KageroMissionState.EXPLORATION);
                                    }
                                } else {
                                    const dx = targetX - enemy.position.x;
                                    const dz = targetZ - enemy.position.z;
                                    const len = Math.sqrt(dx * dx + dz * dz) || 1;
                                    newPos = {
                                        x: enemy.position.x + (dx / len) * enemy.moveSpeed * 0.4,
                                        y: enemy.position.y,
                                        z: enemy.position.z + (dz / len) * enemy.moveSpeed * 0.4,
                                    };
                                }
                            }
                            break;

                        case 'chase':
                            if (!inDetectionRange) {
                                newAiState = 'investigate';
                                newTargetPos = { x: playerPos.x / CELL_SIZE, z: playerPos.z / CELL_SIZE };
                                if (missionState === KageroMissionState.KAGERO_PLAYER_LURE) {
                                    setMissionState(KageroMissionState.EXPLORATION);
                                }
                            } else {
                                const dx = playerPos.x - enemy.position.x;
                                const dz = playerPos.z - enemy.position.z;
                                const len = Math.sqrt(dx * dx + dz * dz) || 1;
                                newPos = {
                                    x: enemy.position.x + (dx / len) * enemy.moveSpeed * 0.6,
                                    y: enemy.position.y,
                                    z: enemy.position.z + (dz / len) * enemy.moveSpeed * 0.6,
                                };
                            }
                            break;

                        case 'trapped':
                        case 'dead':
                            break;

                        default:
                            if (enemy.patrolPath.length > 0) {
                                newAiState = 'patrol';
                            } else {
                                newAiState = 'idle';
                            }
                    }

                    return { 
                        ...enemy, 
                        position: newPos, 
                        aiState: newAiState, 
                        patrolIndex: newPatrolIndex,
                        targetPosition: newTargetPos 
                    };
                });

                updatedTraps = updatedTraps.map(trap => ({
                    ...trap,
                    currentCooldown: Math.max(0, trap.currentCooldown - 1),
                }));

                setComboCount(localComboCount);
                if (localComboCount === 0) {
                    setComboCount(0);
                }

                const allDead = updatedEnemies.every(e => !e.isAlive);
                if (allDead && updatedEnemies.length > 0 && prev.totalEnemies > 0) {
                    const currentRoom = prev.rooms.find(r => r.id === prev.currentRoomId);
                    if (currentRoom) {
                        currentRoom.isCleared = true;
                    }
                    updatedTraps = updatedTraps.map(t => ({ ...t, triggered: false }));
                    
                    const goldEarned = updatedEnemies.reduce((sum, e) => sum + (e.isAlive ? 0 : e.goldReward), 0);
                    setTimeout(() => {
                        setMissionState(KageroMissionState.MISSION_COMPLETE);
                        addLog(`=== MISION COMPLETADA === +${goldEarned} oro`, 'combat');
                    }, 500);
                }

                return { ...prev, enemies: updatedEnemies, placedTraps: updatedTraps };
            });
        }, 600);

        return () => clearInterval(interval);
    }, [missionState, mission, addLog, triggerTrap, currentStep]);

    useEffect(() => {
        const isReturnState = missionState === KageroMissionState.RETURN_TO_HEX || 
                             missionState === KageroMissionState.KAGERO_RETURN_TO_HEX;
        if (isReturnState) {
            const allDead = mission?.enemies.every(e => !e.isAlive);
            if (allDead) {
                clearCurrentEncounter();
                const goldEarned = mission?.enemies.reduce((sum, e) => sum + (e.isAlive ? 0 : e.goldReward), 0) || 0;
                if (goldEarned > 0) {
                    addGold(goldEarned);
                }
                addLog(`Oro ganado: ${goldEarned}`, 'combat');
            }
            syncOverworldEnemies();
            setGameState(GameState.OVERWORLD);
        }
    }, [missionState, mission, clearCurrentEncounter, syncOverworldEnemies, setGameState, addLog, addGold]);

    const handleSlotClick = useCallback((slot: TrapSlot) => {
        if (missionState !== KageroMissionState.TACTICAL_SETUP) return;
        if (!mission) return;

        const existingTrap = mission.placedTraps.find(t => t.slotId === slot.id);
        
        if (existingTrap) {
            setMission(prev => prev ? {
                ...prev,
                placedTraps: prev.placedTraps.filter(t => t.id !== existingTrap.id),
            } : prev);
            addLog(`Trampa removida de ${slot.surface}`, 'info');
            return;
        }

        const trapData = TRAP_DATA[selectedTrapType];
        
        const newTrap = {
            id: `trap_${Date.now()}`,
            trapType: selectedTrapType,
            slotId: slot.id,
            roomId: slot.roomId,
            surface: slot.surface,
            position: slot.position,
            effects: [trapData.stateEffect || 'damage'] as any[],
            damage: trapData.damage,
            launchDirection: trapData.forceVector ? { x: trapData.forceVector.x, y: 0, z: trapData.forceVector.z } : { x: 0, y: 0, z: 1 },
            launchForce: trapData.forceVector ? 1 : 0,
            stunDuration: trapData.stateEffect === 'stun' ? trapData.duration : 0,
            cooldown: trapData.cooldown || 3,
            currentCooldown: 0,
            triggered: false,
            triggeredAtStep: -1,
            comboChain: 0,
            arkCost: trapData.manaCost || 0,
        };

        setMission(prev => prev ? {
            ...prev,
            placedTraps: [...prev.placedTraps, newTrap],
        } : prev);
        addLog(`${trapData.name} en ${slot.surface} (${Math.round(slot.position.x)}, ${Math.round(slot.position.z)})`, 'info');
    }, [missionState, mission, addLog, selectedTrapType]);

    const defeatedCount = mission?.enemies.filter(e => !e.isAlive).length || 0;
    const totalEnemies = mission?.totalEnemies || 0;
    const enemiesAlive = mission?.enemies.filter(e => e.isAlive).length || 0;

    const getStateLabel = () => {
        if (timeFrozen) return 'TIEMPO DETENIDO';
        switch (missionState) {
            case KageroMissionState.LOADING: return 'CARGANDO...';
            case KageroMissionState.EXPLORATION: return 'EXPLORANDO';
            case KageroMissionState.TACTICAL_SETUP: return 'COLOCAR TRAMPAS';
            case KageroMissionState.KAGERO_ENEMY_PATROL: return 'ENEMIGOS PATRULLANDO';
            case KageroMissionState.KAGERO_PLAYER_LURE: return '¡ENEMIGO CERCA!';
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
        if (timeFrozen) return 'text-cyan-400';
        if ([KageroMissionState.TRAP_TRIGGER, KageroMissionState.COMBO_RESOLUTION].includes(missionState)) return 'text-red-500';
        if (missionState === KageroMissionState.TACTICAL_SETUP) return 'text-green-500';
        if (missionState === KageroMissionState.KAGERO_PLAYER_LURE) return 'text-orange-500';
        if (missionState === KageroMissionState.MISSION_COMPLETE) return 'text-amber-500';
        return 'text-blue-400';
    };

    return (
        <div className="fixed inset-0 bg-slate-950 z-50">
            <Canvas shadows camera={{ position: [10, 15, 20], fov: 60 }}>
                <SceneContent
                    mission={mission}
                    missionState={missionState}
                    selectedSlot={selectedSlot}
                    selectedTrapType={selectedTrapType}
                    onSlotClick={handleSlotClick}
                    onDoorEnter={handleDoorEnter}
                    playerRef={playerRef}
                    enemies={mission?.enemies || []}
                    triggeringTraps={triggeringTraps}
                    timeFrozen={timeFrozen}
                />
            </Canvas>

            <div className="absolute top-4 left-4 bg-slate-900/95 rounded-lg p-4 text-white border border-slate-700 shadow-xl min-w-[200px]">
                <h3 className="text-amber-500 font-bold mb-2 text-lg">{mission?.missionName || 'Mision'}</h3>
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
                        <span className="font-mono">{mission?.placedTraps.length || 0}</span>
                    </div>
                </div>
            </div>

            <div className="absolute top-4 right-4 bg-slate-900/95 rounded-lg p-4 text-white border border-slate-700 shadow-xl">
                <div className={`text-sm font-bold ${getStateColor()}`}>[{getStateLabel()}]</div>
                <div className="text-xs text-slate-400 mt-1">
                    <span className="text-amber-400">Cadena:</span> x{comboCount} <span className="text-slate-500">(max: x{maxCombo})</span>
                </div>
            </div>

            <div className="absolute bottom-4 left-4 bg-slate-900/95 rounded-lg p-3 text-white border border-slate-700">
                <div className="text-xs text-slate-400 space-y-1">
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">T</kbd> Tactico</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">1-3</kbd> Superficie</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">QWER</kbd> Trampa</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">ESPACIO</kbd> Activar</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">WASD</kbd> Mover</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">Click</kbd> Colocar</div>
                </div>
            </div>

            {showTutorial && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/98 rounded-xl p-6 text-white border-2 border-cyan-500 shadow-2xl z-50 max-w-md">
                    <div className="text-center mb-4">
                        <div className="text-4xl mb-2">🎯</div>
                        <h3 className="text-xl font-bold text-cyan-400">TUTORIAL</h3>
                    </div>
                    <div className="text-center mb-4">
                        <p className="text-slate-300">{TUTORIAL_STEPS[tutorialStep]?.text}</p>
                    </div>
                    <div className="flex justify-center gap-2 mb-4">
                        {TUTORIAL_STEPS.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`w-2 h-2 rounded-full ${
                                    idx === tutorialStep ? 'bg-cyan-400' : 
                                    idx < tutorialStep ? 'bg-green-500' : 'bg-slate-600'
                                }`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={advanceTutorial}
                        className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold transition-all"
                    >
                        {tutorialStep < TUTORIAL_STEPS.length - 1 ? 'SIGUIENTE' : 'ENTENDIDO'}
                    </button>
                    <button
                        onClick={() => setShowTutorial(false)}
                        className="w-full mt-2 px-4 py-1 text-slate-500 hover:text-slate-300 text-sm transition-all"
                    >
                        Saltar Tutorial
                    </button>
                </div>
            )}

            {(missionState === KageroMissionState.TACTICAL_SETUP || timeFrozen) && (
                <div className="absolute bottom-4 right-4 bg-slate-900/95 rounded-lg p-4 text-white border border-cyan-700 shadow-xl max-w-[280px]">
                    <h4 className={`font-bold mb-2 text-sm ${timeFrozen ? 'text-cyan-400' : 'text-green-400'}`}>
                        {timeFrozen ? '⏸ TIEMPO DETENIDO' : 'MODO TACTICO'}
                    </h4>
                    <div className="text-xs text-slate-400 mb-2">
                        {timeFrozen ? 'Coloca trampas mientras el tiempo esta detenido' : 'Haz clic en un slot para colocar la trampa'}
                    </div>
                    <div className="border-t border-slate-700 pt-2 mb-2">
                        <div className="text-xs mb-1">
                            Superficie: <span className={`font-mono ${timeFrozen ? 'text-cyan-400' : 'text-green-400'}`}>{selectedSurface.toUpperCase()}</span>
                        </div>
                    </div>
                    <div className="border-t border-slate-700 pt-2">
                        <div className="text-xs text-slate-400 mb-1">TRAMPA:</div>
                        <div className="grid grid-cols-3 gap-1">
                            {Object.entries(TRAP_DATA).slice(0, 6).map(([type, data]) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedTrapType(type as TrapType)}
                                    className={`px-2 py-1 text-xs rounded border ${
                                        selectedTrapType === type 
                                            ? 'bg-green-700 border-green-500 text-white' 
                                            : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                                    }`}
                                    title={data.name}
                                >
                                    {data.name.slice(0, 4)}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="border-t border-slate-700 mt-2 pt-2">
                        <div className="text-xs text-slate-500">
                            <div><kbd className="bg-slate-700 px-1 rounded">Q</kbd> <kbd className="bg-slate-700 px-1 rounded">W</kbd> <kbd className="bg-slate-700 px-1 rounded">E</kbd> <kbd className="bg-slate-700 px-1 rounded">R</kbd> Trampas</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute top-1/2 -translate-y-1/2 left-4 bg-slate-900/90 rounded-lg p-2 text-white">
                <div className="text-xs space-y-1">
                    {mission?.enemies.filter(e => e.isAlive).map(e => (
                        <div key={e.id} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                                e.aiState === 'idle' ? 'bg-gray-500' :
                                e.aiState === 'patrol' ? 'bg-red-500' :
                                e.aiState === 'alert' ? 'bg-amber-500 animate-pulse' :
                                e.aiState === 'investigate' ? 'bg-yellow-500 animate-pulse' :
                                e.aiState === 'chase' ? 'bg-orange-500 animate-pulse' :
                                e.aiState === 'trapped' ? 'bg-red-700 animate-pulse' :
                                e.aiState === 'stunned' ? 'bg-purple-500' :
                                e.aiState === 'confused' ? 'bg-pink-500' :
                                e.aiState === 'frozen' ? 'bg-cyan-500' : 'bg-gray-500'
                            }`} />
                            <span className="text-slate-300 text-xs">{e.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {(missionState === KageroMissionState.MISSION_COMPLETE || missionState === KageroMissionState.KAGERO_MISSION_COMPLETE) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-60">
                    <div className="bg-slate-900 rounded-xl p-8 text-center border-2 border-amber-500 shadow-2xl">
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
                                <div className="text-3xl font-bold text-purple-400">{mission?.placedTraps.length}</div>
                                <div className="text-xs text-slate-500">Trampas</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setMissionState(KageroMissionState.RETURN_TO_HEX)}
                            className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-lg transition-all"
                        >
                            Volver al Mapa
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
