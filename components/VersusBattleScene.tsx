
import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Image, Text } from '@react-three/drei';
import * as THREE from 'three';
import { BattleAction, CameraEffect, ParticleEffect } from '../types'; // Assuming types are in ../../types

interface VersusBattleSceneProps {
    playerName: string;
    enemyName: string;
    playerHp: number;
    playerMaxHp: number;
    enemyHp: number;
    enemyMaxHp: number;
    turn: 'PLAYER' | 'ENEMY';
    battleLog: string[];
    playerSpriteUrl?: string;
    enemySpriteUrl?: string;
    onAction: (action: BattleAction, skillId?: string) => void;
    onVictory?: () => void;
    onDefeat?: () => void;
    onFlee?: () => void;
}

const BattleBackground = () => {
    const { camera } = useThree();
    const bgRef = useRef<THREE.Group>(null!);

    useFrame(() => {
        // Parallax effect
        bgRef.current.position.x = -camera.position.x * 0.1;
    });

    return (
        <group ref={bgRef}>
            <Image url="/assets/backgrounds/forest_bg.png" scale={[100, 50]} position={[0, 10, -30]} />
            
            {/* Billboard Trees */}
            {[-40, -30, -20, -10, 0, 10, 20, 30, 40].map(x => (
                 <Billboard key={x} position={[x + (Math.random() - 0.5) * 5, -2, -15 - Math.random() * 10]}>
                    <Image url="/assets/sprites/tree_1.png" scale={15} />
                </Billboard>
            ))}
        </group>
    );
};

const Character = ({ spriteUrl, position, isPlayer }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <group position={position}>
            {spriteUrl && !imgError ? (
                <Billboard>
                    <Image 
                        url={spriteUrl} 
                        scale={[3, 3]}
                        transparent
                    />
                </Billboard>
            ) : (
                <mesh>
                    <boxGeometry args={[1, 2, 1]} />
                    <meshStandardMaterial color={isPlayer ? "#3b82f6" : "#ef4444"} />
                </mesh>
            )}
            <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.5, 32]} />
                <meshBasicMaterial color={isPlayer ? "#1e3a5f" : "#5f1e1e"} transparent opacity={0.7} />
            </mesh>
        </group>
    );
};


const CinematicCamera = () => {
    const { camera } = useThree();
    const cameraGroup = useRef<THREE.Group>(null!);

    useFrame((state) => {
        cameraGroup.current.position.lerp(new THREE.Vector3(0, 5, 12), 0.05);
        camera.lookAt(0, 2, 0);
    });

    return <group ref={cameraGroup} />;
};


export const VersusBattleScene: React.FC<VersusBattleSceneProps> = ({
    playerName,
    enemyName,
    playerHp,
    playerMaxHp,
    enemyHp,
    enemyMaxHp,
    turn,
    battleLog,
    playerSpriteUrl,
    enemySpriteUrl,
    onAction,
    onFlee
}) => {
    const playerHpPercent = (playerHp / playerMaxHp) * 100;
    const enemyHpPercent = (enemyHp / enemyMaxHp) * 100;
    
    const lastMessage = battleLog[battleLog.length - 1];
    
    return (
        <div className="w-full h-full relative bg-black overflow-hidden">
            <Canvas>
                <ambientLight intensity={0.8} />
                <pointLight position={[0, 10, 10]} intensity={0.5} />
                <CinematicCamera />
                <BattleBackground />
                
                <Character spriteUrl={playerSpriteUrl} position={[-4, 0, 0]} isPlayer={true} />
                <Character spriteUrl={enemySpriteUrl} position={[4, 0, 0]} isPlayer={false} />

            </Canvas>
            
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-4 md:p-6">
                {/* Top UI - Health Bars */}
                <div className="flex flex-col sm:flex-row justify-between w-full">
                     <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-2 md:p-4 w-full sm:w-2/5 lg:w-1/3">
                        <div className="flex justify-between items-center mb-1 md:mb-2">
                            <span className="text-white font-bold text-sm sm:text-base">{playerName}</span>
                            <span className="text-amber-400 font-mono text-xs sm:text-sm">{playerHp}/{playerMaxHp}</span>
                        </div>
                        <div className="h-3 md:h-4 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                            <div 
                                className="h-full transition-all duration-500 bg-green-500"
                                style={{ width: `${playerHpPercent}%` }}
                            />
                        </div>
                    </div>
                    
                    <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-2 md:p-4 w-full sm:w-2/5 lg:w-1/3 mt-2 sm:mt-0">
                         <div className="flex justify-between items-center mb-1 md:mb-2">
                            <span className="text-white font-bold text-sm sm:text-base">{enemyName}</span>
                            <span className="text-amber-400 font-mono text-xs sm:text-sm">{enemyHp}/{enemyMaxHp}</span>
                        </div>
                        <div className="h-3 md:h-4 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                            <div 
                                className="h-full transition-all duration-500 bg-red-500"
                                style={{ width: `${enemyHpPercent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Middle UI - Battle Log */}
                <div className="flex-grow flex items-center justify-center">
                    {lastMessage && (
                        <div className="bg-black/50 p-2 rounded-md">
                            <p className="text-white text-lg sm:text-xl md:text-2xl font-black uppercase tracking-wider text-center">
                                {lastMessage}
                            </p>
                        </div>
                    )}
                </div>

                {/* Bottom UI - Action Buttons */}
                {turn === 'PLAYER' ? (
                    <div className="pointer-events-auto pb-2">
                        <div className="bg-slate-900/90 border-2 border-amber-500/50 rounded-xl p-2 sm:p-4 max-w-3xl mx-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <button 
                                    onClick={() => onAction(BattleAction.ATTACK)}
                                    className="bg-red-600 hover:bg-red-500 text-white font-black uppercase py-2 sm:py-3 rounded-lg text-sm sm:text-base"
                                >
                                    ⚔️ Atacar
                                </button>
                                <button 
                                    onClick={() => onAction(BattleAction.SKILL, 'skill')}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase py-2 sm:py-3 rounded-lg text-sm sm:text-base"
                                >
                                    ✨ Habilidad
                                </button>
                                <button 
                                    onClick={() => onAction(BattleAction.ITEM)}
                                    className="bg-green-600 hover:bg-green-500 text-white font-black uppercase py-2 sm:py-3 rounded-lg text-sm sm:text-base"
                                >
                                    🎒 Objeto
                                </button>
                                <button 
                                    onClick={onFlee}
                                    className="bg-slate-600 hover:bg-slate-500 text-white font-black uppercase py-2 sm:py-3 rounded-lg text-sm sm:text-base"
                                >
                                    🏃 Huir
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                     <div className="pb-2 flex justify-center">
                        <div className="bg-slate-900/80 border border-red-500/50 rounded-lg px-4 py-2">
                            <span className="text-red-400 font-bold animate-pulse">Turno del enemigo...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VersusBattleScene;
