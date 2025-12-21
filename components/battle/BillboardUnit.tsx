
// @ts-nocheck
import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { StatusEffectType } from '../../types';
import { AssetManager } from '../../services/AssetManager';
import { useGameStore } from '../../store/gameStore';

const StatusBadge = ({ type }: { type: StatusEffectType }) => {
    const icons = { [StatusEffectType.POISON]: '🤢', [StatusEffectType.BURN]: '🔥', [StatusEffectType.HASTE]: '⚡', [StatusEffectType.SLOW]: '❄️' };
    return <span className="text-[8px] bg-black/80 rounded px-1">{icons[type] || '✨'}</span>;
};

// Componente interno para cargar la textura con seguridad extrema
const SafeSprite = ({ url, isHit }: { url: string, isHit: boolean }) => {
    const [tex, setTex] = useState<THREE.Texture | null>(null);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let active = true;
        const loader = new THREE.TextureLoader();
        const finalUrl = AssetManager.getSafeSprite(url);

        loader.load(
            finalUrl,
            (loadedTex) => {
                if (!active) return;
                loadedTex.magFilter = THREE.NearestFilter;
                loadedTex.minFilter = THREE.NearestFilter;
                setTex(loadedTex);
            },
            undefined,
            () => {
                if (!active) return;
                console.warn("Failed to load battle sprite, using fallback:", finalUrl);
                setHasError(true);
                // Cargar el sprite de seguridad si el original falla
                loader.load(AssetManager.getSafeSprite(AssetManager.FALLBACK_SPRITE), (fbTex) => {
                    if (active) setTex(fbTex);
                });
            }
        );
        return () => { active = false; };
    }, [url]);

    if (!tex) return null;

    return (
        <spriteMaterial 
            map={tex} 
            transparent 
            alphaTest={0.5} 
            color={isHit ? '#ff4444' : 'white'} 
            depthWrite={true}
        />
    );
};

export const BillboardUnit = React.memo(({ 
    position, color, isCurrentTurn, hp, maxHp, 
    onUnitClick, isActing, actionType, 
    entityType, spriteUrl, entity
}: any) => {
  const groupRef = useRef<THREE.Group>(null);
  const [shouldShake, setShouldShake] = useState(false);
  const lastHp = useRef(hp);
  
  const { isUnitMenuOpen, setUnitMenuOpen, selectAction, hasMoved, hasActed, executeWait } = useGameStore();

  useEffect(() => {
    if (hp < lastHp.current) {
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 300);
    }
    lastHp.current = hp;
  }, [hp]);

  useFrame((state) => {
      if (groupRef.current) {
          const t = state.clock.elapsedTime;
          const bob = Math.sin(t * 3) * 0.04;
          groupRef.current.position.set(position[0], position[1] + bob, position[2]);
          if (shouldShake) groupRef.current.position.x += (Math.random() - 0.5) * 0.15;
      }
  });

  const hpPercent = Math.max(0, hp / (maxHp || 1));
  const activeEffects = entity?.stats?.activeStatusEffects || [];

  return (
    <group 
        ref={groupRef} 
        onClick={(e) => { 
            e.stopPropagation(); 
            if (isCurrentTurn && entityType === 'PLAYER') setUnitMenuOpen(!isUnitMenuOpen);
            else if (onUnitClick) onUnitClick(position[0], position[2]);
        }}
    >
        {isCurrentTurn && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[0.55, 0.65, 32]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
            </mesh>
        )}
        
        <sprite scale={[2.0, 2.0, 1]} position={[0, 1.0, 0]}>
            <SafeSprite url={spriteUrl} isHit={shouldShake} />
        </sprite>

        <Html position={[0, 2.3, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="flex flex-col items-center gap-1 select-none">
                <div className="flex gap-0.5 mb-0.5">
                    {activeEffects.map((eff, i) => <StatusBadge key={i} type={eff.type} />)}
                </div>
                <div className="w-14 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/20 shadow-xl">
                    <div className={`h-full transition-all duration-500 ${hpPercent > 0.5 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${hpPercent * 100}%` }} />
                </div>
                <div className="text-[7px] font-black text-white/50 uppercase tracking-tighter drop-shadow-md">{entity?.name}</div>
            </div>
        </Html>

        {isCurrentTurn && isUnitMenuOpen && (
            <Html position={[0, 1.0, 0]} center>
                <div className="flex flex-wrap gap-2 w-48 justify-center animate-in zoom-in-75 duration-200">
                    <button onClick={(e) => { e.stopPropagation(); selectAction('MOVE'); }} disabled={hasMoved} className={`w-12 h-12 rounded-full border-2 bg-slate-900 flex items-center justify-center text-xl ${hasMoved ? 'opacity-20' : 'border-blue-500 shadow-lg hover:bg-blue-600'}`}>👣</button>
                    <button onClick={(e) => { e.stopPropagation(); selectAction('ATTACK'); }} disabled={hasActed} className={`w-12 h-12 rounded-full border-2 bg-slate-900 flex items-center justify-center text-xl ${hasActed ? 'opacity-20' : 'border-red-500 shadow-lg hover:bg-red-600'}`}>⚔️</button>
                    <button onClick={(e) => { e.stopPropagation(); executeWait(); }} className="w-12 h-12 rounded-full border-2 border-amber-500 bg-slate-900 flex items-center justify-center text-xl text-white hover:bg-amber-600">🛡️</button>
                </div>
            </Html>
        )}
    </group>
  );
});
