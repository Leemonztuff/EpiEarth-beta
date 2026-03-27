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
import { TRAP_DATA } from '../data/trapsData';
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
    const moveSpeed = 0.12;
    const smoothRotation = useRef(0);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.key.toLowerCase());
        const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.key.toLowerCase());
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useFrame(() => {
        if (!canMove || !meshRef.current) return;

        let dx = 0, dz = 0;
        if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dz -= moveSpeed;
        if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dz += moveSpeed;
        if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft')) dx -= moveSpeed;
        if (keysPressed.current.has('d') || keysPressed.current.has('arrowright')) dx += moveSpeed;

        if (dx !== 0 || dz !== 0) {
            const len = Math.sqrt(dx * dx + dz * dz);
            dx = (dx / len) * moveSpeed;
            dz = (dz / len) * moveSpeed;

            const newX = playerRef.current.position.x + dx;
            const newZ = playerRef.current.position.z + dz;
            
            if (mission) {
                const currentRoom = mission.rooms.find(r => r.id === mission.currentRoomId);
                if (currentRoom) {
                    const bounds = currentRoom.bounds;
                    const margin = 2;
                    if (newX >= bounds.minX * CELL_SIZE + margin && 
                        newX <= bounds.maxX * CELL_SIZE - margin &&
                        newZ >= bounds.minZ * CELL_SIZE + margin && 
                        newZ <= bounds.maxZ * CELL_SIZE - margin) {
                        playerRef.current.position.x = newX;
                        playerRef.current.position.z = newZ;
                    }
                }
            } else {
                playerRef.current.position.x = newX;
                playerRef.current.position.z = newZ;
            }
            
            playerRef.current.rotation = Math.atan2(dx, dz);
        }

        smoothRotation.current += (playerRef.current.rotation - smoothRotation.current) * 0.12;
        meshRef.current.rotation.y = smoothRotation.current;
        meshRef.current.position.copy(playerRef.current.position);

        const offsetDist = 5;
        const camHeight = 7;
        camera.position.set(
            playerRef.current.position.x - Math.sin(smoothRotation.current) * offsetDist,
            camHeight,
            playerRef.current.position.z + Math.cos(smoothRotation.current) * offsetDist
        );
        camera.lookAt(playerRef.current.position.x, playerRef.current.position.y, playerRef.current.position.z);
    });

    return (
        <group ref={meshRef}>
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
                <meshStandardMaterial color="#1a1a2e" roughness={1} />
            </mesh>

            <mesh position={[centerX - width/2, room.wallHeight/2, centerZ]} castShadow receiveShadow>
                <boxGeometry args={[0.3, room.wallHeight, depth]} />
                <meshStandardMaterial color="#2d2d44" roughness={0.9} />
            </mesh>
            <mesh position={[centerX + width/2, room.wallHeight/2, centerZ]} castShadow receiveShadow>
                <boxGeometry args={[0.3, room.wallHeight, depth]} />
                <meshStandardMaterial color="#2d2d44" roughness={0.9} />
            </mesh>
            <mesh position={[centerX, room.wallHeight/2, centerZ - depth/2]} castShadow receiveShadow>
                <boxGeometry args={[width, room.wallHeight, 0.3]} />
                <meshStandardMaterial color="#2d2d44" roughness={0.9} />
            </mesh>
            <mesh position={[centerX, room.wallHeight/2, centerZ + depth/2]} castShadow receiveShadow>
                <boxGeometry args={[width, room.wallHeight, 0.3]} />
                <meshStandardMaterial color="#2d2d44" roughness={0.9} />
            </mesh>

            <mesh position={[centerX, room.wallHeight + 0.1, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[width, depth]} />
                <meshStandardMaterial color="#1a1a2e" roughness={1} />
            </mesh>
        </group>
    );
}

function TrapSlotMesh({ 
    slot, 
    onClick, 
    selected, 
    hasTrap 
}: { 
    slot: TrapSlot, 
    onClick: () => void, 
    selected: boolean,
    hasTrap: boolean 
}) {
    const color = hasTrap ? '#8b5cf6' : selected ? '#22c55e' : '#4ade8044';
    const opacity = hasTrap ? 0.9 : selected ? 0.6 : 0.3;

    return (
        <mesh
            position={[slot.position.x, slot.position.y, slot.position.z]}
            onClick={onClick}
        >
            <boxGeometry args={[1.2, 0.1, 1.2]} />
            <meshStandardMaterial 
                color={color} 
                transparent 
                opacity={opacity}
                emissive={hasTrap ? '#8b5cf6' : selected ? '#22c55e' : '#000000'}
                emissiveIntensity={hasTrap ? 0.3 : selected ? 0.2 : 0}
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
    const stateColor = enemy.aiState === 'patrol' ? '#ef4444' :
                      enemy.aiState === 'investigate' ? '#eab308' :
                      enemy.aiState === 'chase' ? '#f97316' :
                      enemy.aiState === 'stunned' ? '#6b7280' :
                      enemy.aiState === 'confused' ? '#a855f7' : '#ef4444';

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
            <ambientLight intensity={0.2} color="#fef3c7" />
            <directionalLight position={[8, 12, 8]} intensity={0.5} castShadow shadow-mapSize={[2048, 2048]} />
            <pointLight position={[0, 5, 0]} intensity={0.3} color="#fef9c3" />
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
    onSlotClick, 
    onDoorEnter,
    playerRef,
    enemies,
    triggeringTraps 
}: any) {
    const canMove = missionState === KageroMissionState.EXPLORATION || 
                   missionState === KageroMissionState.KAGERO_PLAYER_LURE;
    const showTrapSlots = missionState === KageroMissionState.TACTICAL_SETUP;

    const currentRoom = mission?.rooms.find(r => r.id === mission.currentRoomId);
    const currentRoomDoors = mission?.doors.filter(d => d.fromRoomId === currentRoom?.id) || [];

    return (
        <>
            <Lighting />
            
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
            
            {showTrapSlots && currentRoom?.trapSlots.map(slot => {
                const hasTrap = mission?.placedTraps.some(t => t.slotId === slot.id);
                return (
                    <TrapSlotMesh
                        key={slot.id}
                        slot={slot}
                        onClick={() => onSlotClick(slot)}
                        selected={selectedSlot?.id === slot.id}
                        hasTrap={!!hasTrap}
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

export default function Exploration3DScene() {
    const explorationState = useGameStore(s => s.explorationState);
    const setGameState = useGameStore(s => s.setGameState);
    const addLog = useGameStore(s => s.addLog);
    const clearCurrentEncounter = useGameStore(s => s.clearCurrentEncounter);
    const syncOverworldEnemies = useGameStore(s => s.syncOverworldEnemies);

    const [missionState, setMissionState] = useState<KageroMissionState>(KageroMissionState.LOADING);
    const [mission, setMission] = useState<KageroMission | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<TrapSlot | null>(null);
    const [selectedSurface, setSelectedSurface] = useState<TrapSurface>(TrapSurface.FLOOR);
    const [selectedTrapType, setSelectedTrapType] = useState<TrapType>(TrapType.SPIKE);
    const [triggeringTraps, setTriggeringTraps] = useState<TrapEffectData[]>([]);
    const playerRef = useRef<PlayerState>({
        position: new THREE.Vector3(0, 0.8, 0),
        rotation: 0,
        roomId: '',
    });
    const [currentStep, setCurrentStep] = useState(0);
    const [comboCount, setComboCount] = useState(0);
    const [maxCombo, setMaxCombo] = useState(0);

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
            } else if (e.key === '2') {
                setSelectedSurface(TrapSurface.WALL);
                setSelectedTrapType(TrapType.STUN);
                addLog('PARED - Stun', 'info');
            } else if (e.key === '3') {
                setSelectedSurface(TrapSurface.CEILING);
                setSelectedTrapType(TrapType.EXPLOSIVE);
                addLog('TECHO - Explosivo', 'info');
            }
            
            if (e.key === 'q' || e.key === 'Q') {
                setSelectedTrapType(TrapType.SPIKE);
                addLog('Trampa: Spike', 'info');
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
                    addLog('>>> Modo Tactico: Coloca trampas', 'info');
                } else if (missionState === KageroMissionState.TACTICAL_SETUP) {
                    setMissionState(KageroMissionState.EXPLORATION);
                    addLog('<<< Explorando...', 'info');
                }
            }
            
            if (e.key === 'Escape') {
                if (missionState === KageroMissionState.TACTICAL_SETUP) {
                    setMissionState(KageroMissionState.EXPLORATION);
                    setSelectedSlot(null);
                } else {
                    setMissionState(KageroMissionState.RETURN_TO_HEX);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [missionState, addLog]);

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
                    if (enemy.stunnedTurns > 0) {
                        return { ...enemy, stunnedTurns: enemy.stunnedTurns - 1, aiState: 'stunned' as KageroEnemyAIState };
                    }
                    if (enemy.confusedTurns > 0) {
                        return { ...enemy, confusedTurns: enemy.confusedTurns - 1, aiState: 'confused' as KageroEnemyAIState };
                    }
                    if (enemy.poisonTurns > 0) {
                        const poisonDmg = Math.floor(enemy.maxHp * 0.05);
                        return { ...enemy, hp: Math.max(0, enemy.hp - poisonDmg), poisonTurns: enemy.poisonTurns - 1 };
                    }
                    if (enemy.frozenTurns > 0) {
                        return { ...enemy, frozenTurns: enemy.frozenTurns - 1, aiState: 'frozen' as KageroEnemyAIState };
                    }

                    const distToPlayer = Math.sqrt(
                        Math.pow(enemy.position.x - playerPos.x, 2) + 
                        Math.pow(enemy.position.z - playerPos.z, 2)
                    ) / CELL_SIZE;

                    let newAiState = enemy.aiState;
                    let newPos = { ...enemy.position };
                    let newTargetPos = enemy.targetPosition;
                    let triggerResult: { damage: number; effects: string[]; newCombo: number } | null = null;

                    for (const trap of updatedTraps) {
                        if (trap.currentCooldown > 0) continue;
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
                        
                        const trapEffects: string[] = [];
                        if (triggerResult.damage > 0) {
                            newPos.y = 0.5;
                        }
                        
                        if (triggerResult.effects.includes('Congelado')) {
                            newAiState = 'frozen';
                        } else if (triggerResult.effects.includes('Aturdido')) {
                            newAiState = 'stunned';
                        } else if (triggerResult.effects.includes('Envenenado')) {
                            trapEffects.push('Veneno');
                        }
                        
                        const finalHp = Math.max(0, enemy.hp - triggerResult.damage);
                        
                        addLog(`${enemy.name} activa ${trapEffects.join(', ') || 'trampa'}! -${triggerResult.damage} HP`, 'combat');
                        
                        if (finalHp <= 0) {
                            addLog(`${enemy.name} derrotado! +${enemy.goldReward} oro`, 'combat');
                            return { ...enemy, hp: 0, isAlive: false };
                        }
                        
                        return {
                            ...enemy,
                            hp: finalHp,
                            position: newPos,
                            aiState: newAiState,
                            targetPosition: newTargetPos,
                            stunnedTurns: triggerResult.effects.includes('Aturdido') ? 2 : enemy.stunnedTurns,
                            frozenTurns: triggerResult.effects.includes('Congelado') ? 3 : enemy.frozenTurns,
                            poisonTurns: triggerResult.effects.includes('Envenenado') ? 5 : enemy.poisonTurns,
                        };
                    }

                    if (distToPlayer < enemy.detectionRadius) {
                        newAiState = 'chase';
                        const dx = playerPos.x - enemy.position.x;
                        const dz = playerPos.z - enemy.position.z;
                        const len = Math.sqrt(dx * dx + dz * dz) || 1;
                        newPos = {
                            x: enemy.position.x + (dx / len) * enemy.moveSpeed * 0.5,
                            y: enemy.position.y,
                            z: enemy.position.z + (dz / len) * enemy.moveSpeed * 0.5,
                        };
                    } else if (enemy.aiState === 'chase') {
                        newAiState = 'patrol';
                    }

                    if ((enemy.aiState === 'patrol' || enemy.aiState === 'investigate') && enemy.patrolPath.length > 0) {
                        const target = enemy.patrolPath[enemy.patrolIndex];
                        const targetX = target.x * CELL_SIZE;
                        const targetZ = target.z * CELL_SIZE;
                        const distToTarget = Math.sqrt(
                            Math.pow(enemy.position.x - targetX, 2) + 
                            Math.pow(enemy.position.z - targetZ, 2)
                        );
                        
                        if (distToTarget < CELL_SIZE) {
                            const nextIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
                            newTargetPos = enemy.patrolPath[nextIndex];
                        } else {
                            newTargetPos = target;
                            const tdx = targetX - enemy.position.x;
                            const tdz = targetZ - enemy.position.z;
                            const tlen = Math.sqrt(tdx * tdx + tdz * tdz) || 1;
                            newPos = {
                                x: enemy.position.x + (tdx / tlen) * enemy.moveSpeed * 0.3,
                                y: enemy.position.y,
                                z: enemy.position.z + (tdz / tlen) * enemy.moveSpeed * 0.3,
                            };
                        }
                    }

                    return { ...enemy, position: newPos, aiState: newAiState, targetPosition: newTargetPos };
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
        if (missionState === KageroMissionState.RETURN_TO_HEX) {
            const allDead = mission?.enemies.every(e => !e.isAlive);
            if (allDead) {
                clearCurrentEncounter();
                const goldEarned = mission?.enemies.reduce((sum, e) => sum + (e.isAlive ? 0 : e.goldReward), 0) || 0;
                addLog(`Oro ganado: ${goldEarned}`, 'combat');
            }
            syncOverworldEnemies();
            setGameState(GameState.OVERWORLD);
        }
    }, [missionState, mission, clearCurrentEncounter, syncOverworldEnemies, setGameState, addLog]);

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
        switch (missionState) {
            case KageroMissionState.LOADING: return 'CARGANDO...';
            case KageroMissionState.EXPLORATION: return 'EXPLORANDO';
            case KageroMissionState.TACTICAL_SETUP: return 'MODO TACTICO';
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
        if ([KageroMissionState.TRAP_TRIGGER, KageroMissionState.COMBO_RESOLUTION].includes(missionState)) return 'text-red-500';
        if (missionState === KageroMissionState.TACTICAL_SETUP) return 'text-green-500';
        if (missionState === KageroMissionState.KAGERO_PLAYER_LURE) return 'text-orange-500';
        if (missionState === KageroMissionState.MISSION_COMPLETE) return 'text-amber-500';
        return 'text-blue-400';
    };

    return (
        <div className="fixed inset-0 bg-slate-950 z-50">
            <Canvas shadows camera={{ position: [0, 8, 10], fov: 55 }}>
                <SceneContent
                    mission={mission}
                    missionState={missionState}
                    selectedSlot={selectedSlot}
                    onSlotClick={handleSlotClick}
                    onDoorEnter={handleDoorEnter}
                    playerRef={playerRef}
                    enemies={mission?.enemies || []}
                    triggeringTraps={triggeringTraps}
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
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">1</kbd> Piso</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">2</kbd> Pared</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">3</kbd> Techo</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">WASD</kbd> Mover</div>
                    <div><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">Click</kbd> Colocar</div>
                </div>
            </div>

            {missionState === KageroMissionState.TACTICAL_SETUP && (
                <div className="absolute bottom-4 right-4 bg-slate-900/95 rounded-lg p-4 text-white border border-green-700 shadow-xl max-w-[280px]">
                    <h4 className="text-green-400 font-bold mb-2 text-sm">MODO TACTICO</h4>
                    <div className="text-xs text-slate-400 mb-2">
                        Haz clic en un slot para colocar la trampa seleccionada
                    </div>
                    <div className="border-t border-slate-700 pt-2 mb-2">
                        <div className="text-xs mb-1">
                            Superficie: <span className="text-green-400 font-mono">{selectedSurface.toUpperCase()}</span>
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
                                e.aiState === 'patrol' ? 'bg-red-500' :
                                e.aiState === 'chase' ? 'bg-orange-500 animate-pulse' :
                                e.aiState === 'stunned' ? 'bg-gray-500' : 'bg-yellow-500'
                            }`} />
                            <span className="text-slate-300 text-xs">{e.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {missionState === KageroMissionState.MISSION_COMPLETE && (
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
