
// @ts-nocheck
import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { STATUS_COLORS } from '../../constants';
import { useGameStore } from '../../store/gameStore';
import { BattleAction, StatusEffectType } from '../../types';
import { TextureErrorBoundary } from './Shared';
import { AssetManager } from '../../services/AssetManager';

const SpriteRenderer = ({ url, isHit, statusEffects }: any) => {
    // Resolver URL usando AssetManager para garantizar que apunta al bucket correcto
    const safeUrl = AssetManager.getSafeSprite(url);
    
    const texture = useLoader(THREE.TextureLoader, safeUrl);
    
    useEffect(() => {
        if (texture) {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.needsUpdate = true;
        }
    }, [texture]);

    const tintColor = useMemo(() => {
        if (isHit) return new THREE.Color('#ff0000');
        if (!statusEffects || statusEffects.length === 0) return new THREE.Color('white');
        const primary = statusEffects[0].type;
        if (primary === StatusEffectType.POISON) return new THREE.Color('#4ade80');
        if (primary === StatusEffectType.BURN) return new THREE.Color('#fb923c');
        if (primary === StatusEffectType.FREEZE) return new THREE.Color('#60a5fa');
        return new THREE.Color('white');
    }, [isHit, statusEffects]);

    return (
        <sprite scale={[1.8, 1.8, 1]}>
            <spriteMaterial map={texture} transparent={true} alphaTest={0.5} color={tintColor} depthWrite={false} />
        </sprite>
    );
};

const RadialMenu = ({ onSelect, remainingActions, hasMoved, canMagic, canSkill, onClose, entity }: any) => {
    const stats = entity?.stats;
    const actions = [
        { id: BattleAction.MOVE, icon: '👣', label: 'Mover', disabled: hasMoved, cost: null },
        { id: BattleAction.ATTACK, icon: '⚔️', label: 'Atacar', disabled: remainingActions <= 0, cost: null },
        { id: BattleAction.MAGIC, icon: '✨', label: 'Magia', disabled: remainingActions <= 0 || !canMagic || stats?.spellSlots.current <= 0, cost: stats?.spellSlots.current, costType: 'MP' },
        { id: BattleAction.SKILL, icon: '🔥', label: 'Técnica', disabled: remainingActions <= 0 || !canSkill || stats?.stamina < 10, cost: stats?.stamina, costType: 'ST' },
        { id: BattleAction.WAIT, icon: '🛡️', label: 'Pasar', disabled: false, cost: null },
    ];

    const radius = 95; 

    return (
        <div className="relative w-0 h-0 flex items-center justify-center animate-in zoom-in-75 duration-300">
            <div className="fixed inset-0 z-[-1]" onClick={(e) => { e.stopPropagation(); onClose(); }} />
            <div className="relative w-64 h-64 flex items-center justify-center">
                <div className="absolute w-20 h-20 rounded-full bg-slate-900/60 backdrop-blur-xl border-2 border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)]" />
                {actions.map((action, i) => {
                    const angle = (i / actions.length) * Math.PI * 2 - Math.PI / 2;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    const isDisabled = action.disabled;

                    return (
                        <button 
                            key={action.id} 
                            onClick={(e) => { e.stopPropagation(); if(!isDisabled) onSelect(action.id); }} 
                            className={`absolute w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center shadow-2xl transition-all duration-300 group ${isDisabled ? 'bg-slate-900/40 border-white/5 opacity-40 scale-75 cursor-not-allowed' : 'bg-slate-900 border-white/20 text-white hover:bg-amber-600 hover:scale-125 hover:border-amber-400 active:scale-95'}`}
                            style={{ transform: `translate(${x}px, ${y}px)` }}
                        >
                            <span className="text-2xl">{action.icon}</span>
                            {action.cost !== null && (
                                <span className={`text-[7px] font-black absolute -top-1 -right-1 px-1 rounded-full border ${action.costType === 'MP' ? 'bg-blue-600 border-blue-400' : 'bg-orange-600 border-orange-400'}`}>
                                    {action.cost}
                                </span>
                            )}
                            <div className="absolute top-16 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black/80 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest pointer-events-none">
                                {action.label}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export const BillboardUnit = React.memo(({ 
    position, color, isCurrentTurn, hp, maxHp, 
    onUnitClick, isActing, actionType, 
    entityType, spriteUrl, entity, activeStatusEffects
}: any) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isHovered, setIsHovered] = useState(false);
  const lastHp = useRef(hp);
  const [shouldShake, setShouldShake] = useState(false);
  
  const { isUnitMenuOpen, setUnitMenuOpen, selectAction, remainingActions, hasMoved, executeWait } = useGameStore();

  useEffect(() => {
    if (hp < lastHp.current) {
        setShouldShake(true);
        const t = setTimeout(() => setShouldShake(false), 400);
        return () => clearTimeout(t);
    }
    lastHp.current = hp;
  }, [hp]);

  useFrame((state) => {
      if (groupRef.current && position && hp > 0) {
          const bob = Math.sin(state.clock.elapsedTime * 2 + (position[0] + position[2])) * 0.05;
          groupRef.current.position.set(position[0], position[1] + bob, position[2]);
          if (isActing && actionType === 'ATTACK') groupRef.current.position.x += Math.sin(state.clock.elapsedTime * 25) * 0.12;
          if (shouldShake) groupRef.current.position.x += (Math.random() - 0.5) * 0.15;
      }
  });

  if (!hp || hp <= 0) return null;
  const hpPercent = Math.max(0, Math.min(1, hp / (maxHp || 1)));

  return (
    <group 
        ref={groupRef} 
        onPointerOver={(e) => { e.stopPropagation(); setIsHovered(true); }}
        onPointerOut={(e) => { e.stopPropagation(); setIsHovered(false); }}
        onClick={(e) => { 
            e.stopPropagation(); 
            if (isCurrentTurn && entityType === 'PLAYER') setUnitMenuOpen(!isUnitMenuOpen);
            else if (onUnitClick) onUnitClick(position[0], position[2]);
        }}
    >
        {isCurrentTurn && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <ringGeometry args={[0.55, 0.65, 32]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
            </mesh>
        )}
        
        <TextureErrorBoundary fallback={<mesh position={[0, 0.75, 0]}><boxGeometry args={[0.6, 1.5, 0.2]} /><meshStandardMaterial color={color || '#ff00ff'} /></mesh>}>
            <Suspense fallback={<mesh position={[0, 0.75, 0]}><boxGeometry args={[0.4, 0.4, 0.4]} /><meshStandardMaterial color="#444" wireframe /></mesh>}>
                <group position={[0, 0.8, 0]}>
                    <SpriteRenderer url={spriteUrl} isHit={shouldShake} statusEffects={activeStatusEffects} />
                </group>
            </Suspense>
        </TextureErrorBoundary>

        {isCurrentTurn && isUnitMenuOpen && (
            <Html position={[0, 1.0, 0]} center zIndexRange={[100, 0]}>
                <RadialMenu entity={entity} onSelect={(id) => id === BattleAction.WAIT ? executeWait() : selectAction(id)} onClose={() => setUnitMenuOpen(false)} remainingActions={remainingActions} hasMoved={hasMoved} canMagic={(entity?.stats?.knownSpells?.length || 0) > 0} canSkill={(entity?.stats?.knownSkills?.length || 0) > 0} />
            </Html>
        )}

        <Html position={[0, 2.3, 0]} center style={{ pointerEvents: 'none' }}>
            <div className={`flex flex-col items-center gap-1 transition-opacity duration-300 ${(isCurrentTurn || isHovered || hpPercent < 1) ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-16 h-1.5 bg-black border border-white/10 rounded-full overflow-hidden shadow-lg">
                    <div className={`h-full transition-all duration-500 ${hpPercent > 0.5 ? 'bg-emerald-500' : hpPercent > 0.25 ? 'bg-amber-500' : 'bg-red-600'}`} style={{ width: `${hpPercent * 100}%` }} />
                </div>
                <div className="flex gap-1 h-3">
                    {activeStatusEffects?.map((s, i) => (
                        <span key={i} className="text-[10px] animate-bounce" style={{ animationDelay: `${i * 100}ms` }}>
                            {s.type === StatusEffectType.POISON ? '🧪' : s.type === StatusEffectType.BURN ? '🔥' : s.type === StatusEffectType.STUN ? '🌀' : ''}
                        </span>
                    ))}
                </div>
            </div>
        </Html>
    </group>
  );
});
