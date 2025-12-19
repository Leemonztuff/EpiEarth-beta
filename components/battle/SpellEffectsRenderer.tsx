
// @ts-nocheck
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Trail, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { SpellEffectData } from '../../types';

export const SpellEffectsRenderer = React.memo(({ activeSpellEffect }: { activeSpellEffect: SpellEffectData | null }) => {
    const meshRef = useRef<THREE.Group>(null);
    const progressRef = useRef(0);
    
    useFrame((state, delta) => {
        if (!activeSpellEffect || !meshRef.current) {
            progressRef.current = 0;
            return;
        }

        const speed = 1.0 / (activeSpellEffect.duration / 1000); 
        progressRef.current = Math.min(1, progressRef.current + delta * speed);

        const start = new THREE.Vector3(...activeSpellEffect.startPos);
        const end = new THREE.Vector3(...activeSpellEffect.endPos);

        if (activeSpellEffect.type === 'PROJECTILE') {
            meshRef.current.position.lerpVectors(start, end, progressRef.current);
            meshRef.current.position.y += Math.sin(progressRef.current * Math.PI) * 1.5;
        } else {
            meshRef.current.position.copy(end);
        }
    });

    if (!activeSpellEffect) return null;
    
    const color = activeSpellEffect.color || '#ffffff';

    return (
        <group>
            {activeSpellEffect.type === 'PROJECTILE' && (
                <group ref={meshRef}>
                    {/* Reliable basic geometry instead of complex sprites */}
                    <mesh>
                        <sphereGeometry args={[0.25, 8, 8]} />
                        <meshBasicMaterial color={color} />
                    </mesh>
                    <Trail width={0.4} length={4} color={new THREE.Color(color)} attenuation={(t) => t * t}>
                        <mesh visible={false}><sphereGeometry args={[0.1]} /><meshBasicMaterial /></mesh>
                    </Trail>
                    <pointLight color={color} intensity={2} distance={5} />
                </group>
            )}

            {(activeSpellEffect.type === 'BURST' || (activeSpellEffect.type === 'PROJECTILE' && progressRef.current > 0.9)) && (
                <group position={new THREE.Vector3(...activeSpellEffect.endPos)}>
                    <Sparkles count={30} scale={2} size={4} speed={1} opacity={1 - progressRef.current} color={color} />
                    <pointLight color={color} intensity={3} distance={4} />
                </group>
            )}
        </group>
    );
});
