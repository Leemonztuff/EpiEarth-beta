
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree as useR3FThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { BattleAction, CameraEffect, ParticleEffect } from '../types';

interface VersusBattleSceneProps {
    playerSprite: string;
    enemySprite: string;
    playerName: string;
    enemyName: string;
    playerMaxHp: number;
    enemyMaxHp: number;
    onVictory?: () => void;
    onDefeat?: () => void;
    onFlee?: () => void;
}

interface BattleMessage {
    text: string;
    type: 'normal' | 'damage' | 'heal' | 'critical' | 'miss';
}

interface ParticleSystemProps {
    effects: ParticleEffect[];
}

const Particle: React.FC<{ effect: ParticleEffect; onComplete: () => void }> = ({ effect, onComplete }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [life, setLife] = useState(1);
    
    const colors: Record<string, string> = {
        fire: '#ff4500',
        ice: '#00ffff',
        lightning: '#ffff00',
        smoke: '#888888',
        blood: '#ff0000',
        sparkle: '#ffd700',
        explosion: '#ff6600'
    };
    
    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.position.y += delta * 2;
            meshRef.current.position.x += (Math.random() - 0.5) * 0.1;
            meshRef.current.rotation.x += delta * 5;
            meshRef.current.rotation.z += delta * 5;
        }
        setLife(prev => {
            const newLife = prev - delta / effect.duration;
            if (newLife <= 0) {
                onComplete();
            }
            return Math.max(0, newLife);
        });
    });
    
    return (
        <mesh ref={meshRef} position={[effect.position.x, effect.position.y, 0]} scale={life * 0.3}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={colors[effect.type] || '#ffffff'} transparent opacity={life} />
        </mesh>
    );
};

const ParticleSystem: React.FC<ParticleSystemProps> = ({ effects }) => {
    return (
        <>
            {effects.map((effect, i) => (
                <Particle key={i} effect={effect} onComplete={() => {}} />
            ))}
        </>
    );
};

const CameraEffectHandler: React.FC<{ effect: CameraEffect; shake: number }> = ({ effect, shake }) => {
    const { camera } = useR3FThree();
    
    useEffect(() => {
        switch (effect) {
            case 'ZOOM_IN':
                camera.position.z = 5;
                break;
            case 'ZOOM_OUT':
                camera.position.z = 15;
                break;
            case 'SHAKE':
                break;
            case 'SLAM':
                camera.position.y = 3;
                setTimeout(() => { camera.position.y = 5; }, 200);
                break;
            default:
                camera.position.set(0, 5, 10);
        }
    }, [effect, camera]);
    
    useFrame(() => {
        if (shake > 0) {
            camera.position.x = (Math.random() - 0.5) * shake * 0.5;
            camera.position.y = 5 + (Math.random() - 0.5) * shake * 0.3;
        }
    });
    
    return null;
};

const VersusBattleUI: React.FC<{
    playerName: string;
    enemyName: string;
    playerHp: number;
    playerMaxHp: number;
    enemyHp: number;
    enemyMaxHp: number;
    message: BattleMessage | null;
    turn: 'PLAYER' | 'ENEMY';
    onAction: (action: BattleAction, skillId?: string) => void;
    onFlee: () => void;
}> = ({ playerName, enemyName, playerHp, playerMaxHp, enemyHp, enemyMaxHp, message, turn, onAction, onFlee }) => {
    
    const playerHpPercent = (playerHp / playerMaxHp) * 100;
    const enemyHpPercent = (enemyHp / enemyMaxHp) * 100;
    
    return (
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
                {message && (
                    <div className={`text-2xl font-black uppercase tracking-wider animate-pulse ${
                        message.type === 'damage' ? 'text-red-500' :
                        message.type === 'heal' ? 'text-emerald-500' :
                        message.type === 'critical' ? 'text-amber-500' :
                        message.type === 'miss' ? 'text-slate-500' : 'text-white'
                    }`}>
                        {message.text}
                    </div>
                )}
            </div>
            
            {turn === 'PLAYER' && (
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
                                onClick={() => onAction(BattleAction.SKILL)}
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
            )}
            
            {turn === 'ENEMY' && (
                <div className="pointer-events-auto p-6 flex justify-center">
                    <div className="bg-slate-900/90 border-2 border-red-500/50 rounded-xl px-8 py-4">
                        <span className="text-red-400 font-bold animate-pulse">Turno del enemigo...</span>
                    </div>
                </div>
            )}
        </div>
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
    playerSprite,
    enemySprite,
    playerName,
    enemyName,
    playerMaxHp,
    enemyMaxHp,
    onVictory,
    onDefeat,
    onFlee
}) => {
    const [playerHp, setPlayerHp] = useState(playerMaxHp);
    const [enemyHp, setEnemyHp] = useState(enemyMaxHp);
    const [turn, setTurn] = useState<'PLAYER' | 'ENEMY'>('PLAYER');
    const [message, setMessage] = useState<BattleMessage | null>(null);
    const [cameraEffect, setCameraEffect] = useState<CameraEffect>('NONE');
    const [shake, setShake] = useState(0);
    const [particles, setParticles] = useState<ParticleEffect[]>([]);
    const [playerAttackAnim, setPlayerAttackAnim] = useState(false);
    const [enemyAttackAnim, setEnemyAttackAnim] = useState(false);
    
    const attackPlayer = useCallback(() => {
        const damage = Math.floor(Math.random() * 20) + 10;
        setPlayerHp(prev => Math.max(0, prev - damage));
        setMessage({ text: `-${damage}`, type: 'damage' });
        setCameraEffect('SHAKE');
        setShake(5);
        setParticles(prev => [...prev, 
            { type: 'blood', position: { x: -3, y: 2 }, duration: 0.5 },
            { type: 'sparkle', position: { x: -3, y: 2 }, duration: 0.5 }
        ]);
        
        setTimeout(() => setCameraEffect('NONE'), 500);
        setTimeout(() => setShake(0), 500);
        setTimeout(() => setMessage(null), 1500);
        
        if (playerHp - damage <= 0 && onDefeat) {
            setTimeout(onDefeat, 2000);
        }
    }, [playerHp, onDefeat]);
    
    const attackEnemy = useCallback(() => {
        const damage = Math.floor(Math.random() * 25) + 15;
        const isCrit = Math.random() < 0.3;
        const finalDamage = isCrit ? Math.floor(damage * 1.5) : damage;
        
        setEnemyHp(prev => Math.max(0, prev - finalDamage));
        setMessage({ text: isCrit ? `CRÍTICO! -${finalDamage}` : `-${finalDamage}`, type: isCrit ? 'critical' : 'damage' });
        setCameraEffect('SLAM');
        setShake(8);
        setParticles(prev => [...prev, 
            { type: 'explosion', position: { x: 3, y: 2 }, duration: 0.8 },
            { type: 'fire', position: { x: 3, y: 2 }, duration: 0.5 }
        ]);
        
        setTimeout(() => setCameraEffect('NONE'), 500);
        setTimeout(() => setShake(0), 500);
        setTimeout(() => setMessage(null), 1500);
        
        if (enemyHp - finalDamage <= 0 && onVictory) {
            setTimeout(onVictory, 2000);
        }
    }, [enemyHp, onVictory]);
    
    const handlePlayerAction = useCallback((action: BattleAction) => {
        if (turn !== 'PLAYER') return;
        
        if (action === BattleAction.ATTACK) {
            setPlayerAttackAnim(true);
            setMessage({ text: '¡ATACANDO!', type: 'normal' });
            
            setTimeout(() => {
                attackEnemy();
                setPlayerAttackAnim(false);
                setTurn('ENEMY');
            }, 1000);
        } else if (action === BattleAction.FLEE) {
            if (onFlee) onFlee();
        }
    }, [turn, attackEnemy, onFlee]);
    
    useEffect(() => {
        if (turn === 'ENEMY') {
            setTimeout(() => {
                attackPlayer();
                setTurn('PLAYER');
            }, 1500 + Math.random() * 1000);
        }
    }, [turn, attackPlayer]);
    
    return (
        <div className="w-full h-full relative bg-black overflow-hidden">
            <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 10, 5]} intensity={0.8} />
                <BattleBackground effect={cameraEffect} shake={shake} />
                <ParticleSystem effects={particles} />
                <CameraEffectHandler effect={cameraEffect} shake={shake} />
                
                <group position={[-3, 0, 0]}>
                    <mesh 
                        position={[0, 1.5, 0]} 
                        castShadow
                        scale={playerAttackAnim ? 1.2 : 1}
                    >
                        <boxGeometry args={[1.2, 2, 0.5]} />
                        <meshStandardMaterial color="#3b82f6" />
                    </mesh>
                    <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[1.5, 2]} />
                        <meshBasicMaterial color="#1e3a5f" />
                    </mesh>
                </group>
                
                <group position={[3, 0, 0]} scale={enemyAttackAnim ? 1.2 : 1}>
                    <mesh position={[0, 1.5, 0]} castShadow>
                        <boxGeometry args={[1.2, 2, 0.5]} />
                        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
                    </mesh>
                    <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[1.5, 2]} />
                        <meshBasicMaterial color="#5f1e1e" />
                    </mesh>
                </group>
            </Canvas>
            
            <VersusBattleUI
                playerName={playerName}
                enemyName={enemyName}
                playerHp={playerHp}
                playerMaxHp={playerMaxHp}
                enemyHp={enemyHp}
                enemyMaxHp={enemyMaxHp}
                message={message}
                turn={turn}
                onAction={handlePlayerAction}
                onFlee={() => onFlee?.()}
            />
            
            {cameraEffect === 'SHAKE' && shake > 0 && (
                <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        animation: `shake ${0.1}s ease-in-out infinite`,
                    }}
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
