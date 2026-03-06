
import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree as useR3FThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BattleAction, CameraEffect, ParticleEffect } from '../types';

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

interface BattleMessage {
    text: string;
    type: 'normal' | 'damage' | 'heal' | 'critical' | 'miss';
}

const ParticleSystem: React.FC<{ effects: ParticleEffect[] }> = ({ effects }) => (
    <>
        {effects.map((effect, i) => (
            <Particle key={i} effect={effect} />
        ))}
    </>
);

const Particle: React.FC<{ effect: ParticleEffect }> = ({ effect }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [life, setLife] = useState(1);
    
    const colors: Record<string, string> = {
        fire: '#ff4500', ice: '#00ffff', lightning: '#ffff00',
        smoke: '#888888', blood: '#ff0000', sparkle: '#ffd700', explosion: '#ff6600'
    };
    
    useEffect(() => {
        const timer = setTimeout(() => setLife(0), effect.duration * 1000);
        return () => clearTimeout(timer);
    }, [effect.duration]);
    
    if (life <= 0) return null;
    
    return (
        <mesh ref={meshRef} position={[effect.position.x, effect.position.y, 0]} scale={life * 0.3}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={colors[effect.type] || '#ffffff'} transparent opacity={life} />
        </mesh>
    );
};

const BattleBackground: React.FC<{ effect: CameraEffect; shake: number }> = ({ effect, shake }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame(({ clock }) => {
        if (groupRef.current) {
            let offsetX = 0;
            if (effect === 'PARALLAX_LEFT') offsetX = Math.sin(clock.getElapsedTime() * 2) * 0.5;
            if (effect === 'PARALLAX_RIGHT') offsetX = -Math.sin(clock.getElapsedTime() * 2) * 0.5;
            groupRef.current.position.x = offsetX + (Math.random() - 0.5) * shake * 0.1;
        }
    });
    
    return (
        <group ref={groupRef}>
            <mesh position={[0, 5, -20]}>
                <planeGeometry args={[100, 50]} />
                <meshBasicMaterial color="#1e1e2e" />
            </mesh>
            <mesh position={[-15, 3, -10]} rotation={[0, 0.3, 0]}>
                <planeGeometry args={[10, 8]} />
                <meshBasicMaterial color="#2d2d44" />
            </mesh>
            <mesh position={[15, 2, -8]} rotation={[0, -0.2, 0]}>
                <planeGeometry args={[8, 6]} />
                <meshBasicMaterial color="#3d3d5c" />
            </mesh>
            <mesh position={[0, 0, -5]}>
                <planeGeometry args={[30, 1]} />
                <meshBasicMaterial color="#4a4a6a" />
            </mesh>
        </group>
    );
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
    const [particles] = useState<ParticleEffect[]>([]);
    const [shake] = useState(0);
    const playerHpPercent = (playerHp / playerMaxHp) * 100;
    const enemyHpPercent = (enemyHp / enemyMaxHp) * 100;
    const [playerImgError, setPlayerImgError] = useState(false);
    const [enemyImgError, setEnemyImgError] = useState(false);
    
    const lastMessage = battleLog[battleLog.length - 1];
    
    return (
        <div className="w-full h-full relative bg-black overflow-hidden">
            <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 10, 5]} intensity={0.8} />
                <BattleBackground effect="NONE" shake={shake} />
                <ParticleSystem effects={particles} />
                
                <group position={[-3, 0, 0]}>
                    {playerSpriteUrl && !playerImgError ? (
                        <mesh position={[0, 1.2, 0]}>
                            <planeGeometry args={[2, 2.5]} />
                            <meshBasicMaterial transparent>
                                <canvasTexture 
                                    attach="map" 
                                    image={(() => {
                                        const img = new Image();
                                        img.src = playerSpriteUrl;
                                        img.onerror = () => setPlayerImgError(true);
                                        return img;
                                    })()} 
                                />
                            </meshBasicMaterial>
                        </mesh>
                    ) : (
                        <mesh position={[0, 1.5, 0]} castShadow>
                            <boxGeometry args={[1.2, 2, 0.5]} />
                            <meshStandardMaterial color="#3b82f6" />
                        </mesh>
                    )}
                    <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[1.5, 2]} />
                        <meshBasicMaterial color="#1e3a5f" />
                    </mesh>
                </group>
                
                <group position={[3, 0, 0]}>
                    {enemySpriteUrl && !enemyImgError ? (
                        <mesh position={[0, 1.2, 0]}>
                            <planeGeometry args={[2, 2.5]} />
                            <meshBasicMaterial transparent>
                                <canvasTexture 
                                    attach="map" 
                                    image={(() => {
                                        const img = new Image();
                                        img.src = enemySpriteUrl;
                                        img.onerror = () => setEnemyImgError(true);
                                        return img;
                                    })()} 
                                />
                            </meshBasicMaterial>
                        </mesh>
                    ) : (
                        <mesh position={[0, 1.5, 0]} castShadow>
                            <boxGeometry args={[1.2, 2, 0.5]} />
                            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
                        </mesh>
                    )}
                    <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[1.5, 2]} />
                        <meshBasicMaterial color="#5f1e1e" />
                    </mesh>
                </group>
            </Canvas>
            
            <div className="absolute inset-0 pointer-events-none flex flex-col">
                <div className="flex justify-between p-6">
                    <div className="w-64">
                        <div className="bg-slate-900/90 border-2 border-slate-700 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-white font-bold">{playerName}</span>
                                <span className="text-amber-500 font-mono">{playerHp}/{playerMaxHp}</span>
                            </div>
                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                                <div 
                                    className={`h-full transition-all duration-500 ${
                                        playerHpPercent > 50 ? 'bg-emerald-500' : 
                                        playerHpPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${playerHpPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-64">
                        <div className="bg-slate-900/90 border-2 border-slate-700 rounded-xl p-4 text-right">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-amber-500 font-mono">{enemyHp}/{enemyMaxHp}</span>
                                <span className="text-white font-bold">{enemyName}</span>
                            </div>
                            <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                                <div 
                                    className={`h-full transition-all duration-500 ml-auto ${
                                        enemyHpPercent > 50 ? 'bg-emerald-500' : 
                                        enemyHpPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${enemyHpPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 flex items-center justify-center">
                    {lastMessage && (
                        <div className={`text-2xl font-black uppercase tracking-wider animate-pulse ${
                            lastMessage.includes('vencido') || lastMessage.includes('Victoria') ? 'text-emerald-500' :
                            lastMessage.includes('derrotado') || lastMessage.includes('HP') && lastMessage.includes('-') ? 'text-red-500' :
                            lastMessage.includes('CRÍTICO') ? 'text-amber-500' : 'text-white'
                        }`}>
                            {lastMessage}
                        </div>
                    )}
                </div>
                
                {turn === 'PLAYER' ? (
                    <div className="pointer-events-auto p-6">
                        <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl p-6 max-w-2xl mx-auto">
                            <div className="grid grid-cols-4 gap-3">
                                <button 
                                    onClick={() => onAction(BattleAction.ATTACK)}
                                    className="bg-red-600 hover:bg-red-500 text-white font-black uppercase py-4 rounded-xl transition-all hover:scale-105 active:scale-95 border-b-4 border-red-800"
                                >
                                    ⚔️ Atacar
                                </button>
                                <button 
                                    onClick={() => onAction(BattleAction.SKILL, 'skill')}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase py-4 rounded-xl transition-all hover:scale-105 active:scale-95 border-b-4 border-blue-800"
                                >
                                    ✨ Habilidad
                                </button>
                                <button 
                                    onClick={() => onAction(BattleAction.ITEM)}
                                    className="bg-green-600 hover:bg-green-500 text-white font-black uppercase py-4 rounded-xl transition-all hover:scale-105 active:scale-95 border-b-4 border-green-800"
                                >
                                    🎒 Objeto
                                </button>
                                <button 
                                    onClick={onFlee}
                                    className="bg-slate-600 hover:bg-slate-500 text-white font-black uppercase py-4 rounded-xl transition-all hover:scale-105 active:scale-95 border-b-4 border-slate-800"
                                >
                                    🏃 Huir
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="pointer-events-auto p-6 flex justify-center">
                        <div className="bg-slate-900/90 border-2 border-red-500/50 rounded-xl px-8 py-4">
                            <span className="text-red-400 font-bold animate-pulse">Turno del enemigo...</span>
                        </div>
                    </div>
                )}
            </div>
            
            {shake > 0 && (
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{ animation: `shake 0.1s ease-in-out infinite` }}
                />
            )}
            
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translate(0, 0); }
                    25% { transform: translate(-5px, 3px); }
                    50% { transform: translate(5px, -3px); }
                    75% { transform: translate(-3px, 5px); }
                }
            `}</style>
        </div>
    );
};

export default VersusBattleScene;
