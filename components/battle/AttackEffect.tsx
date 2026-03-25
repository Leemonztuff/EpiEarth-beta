// @ts-nocheck
import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AttackEffectProps {
    position: [number, number, number];
    isActive: boolean;
    entityType: 'PLAYER' | 'ENEMY';
}

export const AttackEffect: React.FC<AttackEffectProps> = ({ position, isActive, entityType }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [phase, setPhase] = useState(0);
    
    useEffect(() => {
        if (isActive) {
            setPhase(1);
            setTimeout(() => setPhase(2), 100);
            setTimeout(() => setPhase(3), 200);
            setTimeout(() => setPhase(0), 400);
        }
    }, [isActive]);
    
    useFrame(() => {
        if (meshRef.current && phase > 0) {
            const scale = phase === 1 ? 0.5 : (phase === 2 ? 1.5 : 0.8);
            meshRef.current.scale.setScalar(scale * 2);
            meshRef.current.material.opacity = phase === 2 ? 0.8 : 0.4;
        }
    });
    
    if (phase === 0) return null;
    
    const color = entityType === 'PLAYER' ? '#60a5fa' : '#f87171';
    
    return (
        <mesh ref={meshRef} position={[position[0], position[1] + 1, position[2]]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial 
                color={color} 
                transparent 
                opacity={0.6}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
};
