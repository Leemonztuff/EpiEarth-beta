import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
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

const TILE_TEXTURE_URLS = {
    FLOOR: '/assets/minecraft/grass_block_top.png',
    WALL: '/assets/minecraft/cobblestone.png',
    BRUSH: '/assets/minecraft/grass_block_top.png',
    STONE: '/assets/minecraft/mossy_cobblestone.png',
    WATER: '/assets/minecraft/blue_concrete.png',
};

const TrapPlacementHighlight: React.FC<{ position: [number, number, number]; active: boolean }> = ({ position, active }) => {
    if (!active) {
        return null;
    }

    return (
        <mesh position={[position[0], 0.03, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.48, 24]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.55} />
        </mesh>
    );
};

const SpriteBillboard: React.FC<{
    position: [number, number, number];
    spriteUrl?: string;
    fallbackColor: string;
    scale?: [number, number, number];
}> = ({ position, spriteUrl, fallbackColor, scale = [1.4, 1.8, 1] }) => {
    const safeUrl = AssetManager.getSafeSprite(spriteUrl || AssetManager.FALLBACK_SPRITE);
    const texture = useLoader(THREE.TextureLoader, safeUrl);

    useMemo(() => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
    }, [texture]);

    return (
        <sprite position={[position[0], position[1] + 0.9, position[2]]} scale={scale}>
            <spriteMaterial map={texture} transparent alphaTest={0.2} />
        </sprite>
    );
};

const TacticalBoard: React.FC<{
    map: any[][];
    playerPos: { x: number; z: number };
    enemies: any[];
    traps: any[];
    highlightedTiles: { x: number; z: number }[];
    onTilePress: (x: number, z: number) => void;
    playerSpriteUrl?: string;
}> = ({ map, playerPos, enemies, traps, highlightedTiles, onTilePress, playerSpriteUrl }) => {
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

    const highlightSet = useMemo(
        () => new Set(highlightedTiles.map(tile => `${tile.x},${tile.z}`)),
        [highlightedTiles]
    );

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
                                <mesh
                                    position={[pos[0], cell.height / 2, pos[2]]}
                                    onClick={() => onTilePress(x, cell.z)}
                                    onPointerDown={() => onTilePress(x, cell.z)}
                                    castShadow
                                    receiveShadow
                                >
                                    <boxGeometry args={[TILE_SIZE, Math.max(0.8, cell.height), TILE_SIZE]} />
                                    <meshStandardMaterial map={texture} />
                                </mesh>
                                <TrapPlacementHighlight position={pos} active={isHighlight} />
                            </group>
                        );
                    }

                    return (
                        <group key={`cell-${x}-${cell.z}`}>
                            <mesh
                                position={[pos[0], cell.height / 2 - 0.05, pos[2]]}
                                onClick={() => onTilePress(x, cell.z)}
                                onPointerDown={() => onTilePress(x, cell.z)}
                                receiveShadow
                            >
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
                        </group>
                    );
                })
            )}

            <SpriteBillboard position={getWorldPosition(playerPos.x, playerPos.z)} spriteUrl={playerSpriteUrl} fallbackColor="#3b82f6" scale={[1.2, 1.8, 1]} />

            {enemies.map(enemy => (
                enemy.isDefeated ? null : (
                    <SpriteBillboard
                        key={enemy.id}
                        position={getWorldPosition(enemy.x, enemy.z)}
                        spriteUrl={enemy.sprite}
                        fallbackColor="#ef4444"
                        scale={[1.3, 1.7, 1]}
                    />
                )
            ))}

            {traps.map(trap => (
                <TrapMarker
                    key={trap.id}
                    position={[getWorldPosition(trap.x, trap.z)[0], 0.02, getWorldPosition(trap.x, trap.z)[2]]}
                    trapType={trap.type}
                    isArmed={trap.isArmed}
                />
            ))}
        </group>
    );
};

const DirectionPad: React.FC<{ onMove: (dx: number, dz: number) => void }> = ({ onMove }) => (
    <div className="grid grid-cols-3 gap-2 w-[180px] sm:w-[210px]">
        <div />
        <button className="h-14 rounded-2xl bg-slate-900/85 border border-white/10 text-white font-black" onClick={() => onMove(0, -1)}>↑</button>
        <div />
        <button className="h-14 rounded-2xl bg-slate-900/85 border border-white/10 text-white font-black" onClick={() => onMove(-1, 0)}>←</button>
        <button className="h-14 rounded-2xl bg-slate-800/85 border border-amber-500/30 text-amber-300 font-black">STEP</button>
        <button className="h-14 rounded-2xl bg-slate-900/85 border border-white/10 text-white font-black" onClick={() => onMove(1, 0)}>→</button>
        <div />
        <button className="h-14 rounded-2xl bg-slate-900/85 border border-white/10 text-white font-black" onClick={() => onMove(0, 1)}>↓</button>
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
    const initZone = useGameStore(s => s.initZone);
    const movePlayer = useGameStore(s => s.movePlayer);
    const placeTrap = useGameStore(s => s.placeTrap);
    const selectTrapType = useGameStore(s => s.selectTrapType);
    const togglePlacementPause = useGameStore(s => s.togglePlacementPause);
    const exitTrapZone = useGameStore(s => s.exitTrapZone);

    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (gameState === GameState.EXPLORATION_3D && explorationState.map.length === 0) {
            initZone('forest', playerPosHex);
        }
    }, [gameState, explorationState.map.length, initZone, playerPosHex]);

    const player = party[0];
    const trapCount = explorationState.traps.length;
    const aliveEnemies = explorationState.zoneEnemies.filter(enemy => !enemy.isDefeated);
    const selectedTrap = explorationState.selectedTrapType;

    const attemptMove = useCallback((dx: number, dz: number) => {
        const nextX = explorationState.playerMapPos.x + dx;
        const nextZ = explorationState.playerMapPos.z + dz;
        movePlayer(nextX, nextZ);
    }, [explorationState.playerMapPos, movePlayer]);

    const handleTilePress = useCallback((x: number, z: number) => {
        if (selectedTrap) {
            placeTrap(selectedTrap, x, z);
            return;
        }

        const distance = Math.abs(explorationState.playerMapPos.x - x) + Math.abs(explorationState.playerMapPos.z - z);
        if (distance === 1) {
            movePlayer(x, z);
        }
    }, [selectedTrap, placeTrap, explorationState.playerMapPos, movePlayer]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (gameState !== GameState.EXPLORATION_3D) {
                return;
            }

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
                togglePlacementPause();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [attemptMove, gameState, togglePlacementPause]);

    if (gameState !== GameState.EXPLORATION_3D) {
        return null;
    }

    return (
        <div className="w-full h-full relative overflow-hidden bg-[#04070b]">
            <Canvas
                shadows
                camera={{ position: [0, 16, 13], fov: 48 }}
                className="touch-none"
            >
                <color attach="background" args={['#0b1220']} />
                <ambientLight intensity={0.75} />
                <directionalLight position={[10, 18, 8]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
                <fog attach="fog" args={['#0b1220', 12, 28]} />

                <TacticalBoard
                    map={explorationState.map}
                    playerPos={explorationState.playerMapPos}
                    enemies={explorationState.zoneEnemies}
                    traps={explorationState.traps.map(trap => ({
                        id: trap.id,
                        x: trap.position.x,
                        z: trap.position.z,
                        type: trap.type,
                        isArmed: trap.isArmed,
                    }))}
                    highlightedTiles={explorationState.highlightedTiles}
                    onTilePress={handleTilePress}
                    playerSpriteUrl={player?.visual?.spriteUrl}
                />

                {!isMobile && (
                    <OrbitControls
                        enablePan={false}
                        enableZoom
                        minDistance={10}
                        maxDistance={22}
                        minPolarAngle={0.7}
                        maxPolarAngle={1.15}
                        target={[0, 0, 0]}
                    />
                )}
            </Canvas>

            <div className="absolute inset-0 pointer-events-none flex flex-col">
                <div className="pointer-events-auto p-3 sm:p-4">
                    <div className="rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-md p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-[10px] sm:text-xs uppercase tracking-[0.24em] text-amber-300/80">Trap Hunt</div>
                                <h2 className="text-white font-black text-lg sm:text-2xl leading-none">{explorationState.zoneName}</h2>
                                <p className="text-white/65 text-xs sm:text-sm mt-1 max-w-xl">{explorationState.tacticalMessage || 'Mueve un casillero, obliga a perseguir y castiga con trampas.'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => togglePlacementPause()}
                                    className={`px-3 py-2 rounded-2xl text-xs sm:text-sm font-black ${explorationState.tacticalPaused ? 'bg-amber-400 text-black' : 'bg-slate-800 text-white'}`}
                                >
                                    {explorationState.tacticalPaused ? 'Reanudar' : 'Pausa'}
                                </button>
                                <button
                                    onClick={exitTrapZone}
                                    className="px-3 py-2 rounded-2xl bg-blue-600 text-white text-xs sm:text-sm font-black"
                                >
                                    Volver al Hex
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                            <div className="rounded-2xl bg-slate-900/90 p-2">
                                <div className="text-[10px] uppercase text-white/40 font-bold">HP</div>
                                <div className="text-white font-black">{player?.stats.hp ?? 0}/{player?.stats.maxHp ?? 0}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-900/90 p-2">
                                <div className="text-[10px] uppercase text-white/40 font-bold">Fatiga</div>
                                <div className="text-white font-black">{fatigue.toFixed(1)}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-900/90 p-2">
                                <div className="text-[10px] uppercase text-white/40 font-bold">Suministros</div>
                                <div className="text-white font-black">{supplies.toFixed(1)}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-900/90 p-2">
                                <div className="text-[10px] uppercase text-white/40 font-bold">Enemigos</div>
                                <div className="text-white font-black">{aliveEnemies.length}</div>
                            </div>
                            <div className="rounded-2xl bg-slate-900/90 p-2">
                                <div className="text-[10px] uppercase text-white/40 font-bold">Turno</div>
                                <div className="text-white font-black">{explorationState.turnStep}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1" />

                <div className="pointer-events-auto p-3 sm:p-4 grid gap-3 md:grid-cols-[auto,1fr] items-end">
                    <div className="order-2 md:order-1">
                        <DirectionPad onMove={attemptMove} />
                    </div>

                    <div className="order-1 md:order-2 rounded-3xl border border-white/10 bg-slate-950/85 backdrop-blur-md p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-bold">Trap Deck</div>
                                <div className="text-white font-black text-sm sm:text-base">
                                    {trapCount}/{explorationState.maxTraps} colocadas
                                </div>
                            </div>
                            <div className="text-right text-xs text-white/60">
                                {selectedTrap ? `${TRAP_DATA[selectedTrap].name} · alcance ${TRAP_DATA[selectedTrap].range}` : 'Elige una trampa'}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {(Object.keys(TRAP_DATA) as TrapType[]).slice(0, 6).map(type => (
                                <button
                                    key={type}
                                    onClick={() => selectTrapType(selectedTrap === type ? null : type)}
                                    className={`rounded-2xl px-2 py-3 text-left border transition ${
                                        selectedTrap === type
                                            ? 'bg-amber-400 text-black border-amber-300'
                                            : 'bg-slate-900 text-white border-white/10'
                                    }`}
                                >
                                    <div className="text-[10px] uppercase font-black">{type}</div>
                                    <div className={`text-xs mt-1 ${selectedTrap === type ? 'text-black/75' : 'text-white/60'}`}>
                                        Alc. {TRAP_DATA[type].range}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

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
                targetPos={selectedTrap ? null : undefined}
            />
        </div>
    );
};

export default Exploration3DScene;
