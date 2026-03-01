
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
    onUnitClick, onInspect, isActing, actionType, 
    entityType, spriteUrl, entity, onContextMenu
}: any) => {
  const groupRef = useRef<THREE.Group>(null);
  const [shouldShake, setShouldShake] = useState(false);
  const [attackPhase, setAttackPhase] = useState(0);
  const lastHp = useRef(hp);
  const lastIsActing = useRef(isActing);
  
  const { isUnitMenuOpen, setUnitMenuOpen, selectAction, hasMoved, hasActed, executeWait } = useGameStore();

  useEffect(() => {
    if (hp < lastHp.current) {
        setShouldShake(true);
        setTimeout(() => setShouldShake(false), 300);
    }
    lastHp.current = hp;
  }, [hp]);
  
  useEffect(() => {
    if (isActing && !lastIsActing.current) {
      setAttackPhase(1);
      setTimeout(() => setAttackPhase(2), 150);
      setTimeout(() => setAttackPhase(0), 400);
    }
    lastIsActing.current = isActing;
  }, [isActing]);

  useFrame((state) => {
      if (groupRef.current) {
          const t = state.clock.elapsedTime;
          const bob = Math.sin(t * 3) * 0.04;
          
          let offsetX = 0;
          let offsetY = 0;
          
          if (attackPhase === 1) {
            offsetX = -0.3;
            offsetY = 0.1;
          } else if (attackPhase === 2) {
            offsetX = 0.5;
            offsetY = -0.1;
          }
          
          groupRef.current.position.set(
            position[0] + offsetX, 
            position[1] + bob + offsetY, 
            position[2]
          );
          
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
        onContextMenu={(e) => {
            e.stopPropagation();
            if (onContextMenu) onContextMenu(e);
        }}
    >
        {isCurrentTurn && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[0.55, 0.65, 32]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
            </mesh>
        )}
        
        {attackPhase > 0 && (
            <pointLight
                position={[0, 1, 0]}
                color={entityType === 'PLAYER' ? '#3b82f6' : '#ef4444'}
                intensity={attackPhase === 1 ? 3 : 5}
                distance={5}
                decay={2}
            />
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

        {isCurrentTurn && (
            <Html position={[0, 2.8, 0]} center style={{ pointerEvents: 'none' }}>
                <div className="flex items-center justify-center animate-pulse">
                    <div className="bg-amber-500/90 text-black text-[8px] font-black px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap uppercase tracking-wider">
                        Tocá para actuar
                    </div>
                </div>
            </Html>
        )}
    </group>
  );
});
