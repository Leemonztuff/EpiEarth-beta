
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TrapType } from '../types';

interface TrapMarkerProps {
    position: [number, number, number];
    trapType: string;
    isArmed: boolean;
}

const TRAP_COLORS: Record<string, string> = {
    SPIKE: '#8b5cf6',
    FIRE: '#ef4444',
    ICE: '#06b6d4',
    POISON: '#22c55e',
    EXPLOSIVE: '#f97316',
    STUN: '#eab308',
    TELEPORT: '#a855f7',
    DECOY: '#ec4899',
    TRAP_DOOR: '#475569',
    ALARM: '#dc2626'
};

export const TrapMarker: React.FC<TrapMarkerProps> = ({ position, trapType, isArmed }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    
    const color = TRAP_COLORS[trapType] || '#ffffff';
    
    useFrame(({ clock }) => {
        if (meshRef.current && isArmed) {
            meshRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 3) * 0.05;
            meshRef.current.rotation.y = clock.getElapsedTime() * 0.5;
        }
        if (glowRef.current && isArmed) {
            glowRef.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 4) * 0.1);
        }
    });
    
    if (!isArmed) {
        return null;
    }
    
    return (
        <group position={position}>
            <mesh ref={meshRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.2, 0.35, 6]} />
                <meshStandardMaterial 
                    color={color} 
                    emissive={color} 
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.8}
                />
            </mesh>
            <mesh ref={glowRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.5, 16]} />
                <meshBasicMaterial 
                    color={color} 
                    transparent 
                    opacity={0.2}
                />
            </mesh>
        </group>
    );
};

export default TrapMarker;
