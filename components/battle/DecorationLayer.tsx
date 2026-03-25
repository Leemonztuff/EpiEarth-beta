// @ts-nocheck
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { BattleCell, TerrainType } from '../../types';

interface DecorationLayerProps {
    mapData: BattleCell[];
    dimension?: string;
    terrain?: string;
}

const DECORATIONS = {
    FOREST: [
        { type: 'tree', color: '#2d5a27', height: [1.5, 2.5], chance: 0.08 },
        { type: 'bush', color: '#3d6a37', height: [0.3, 0.6], chance: 0.12 },
        { type: 'rock', color: '#5a5a5a', height: [0.4, 0.8], chance: 0.06 },
    ],
    DESERT: [
        { type: 'cactus', color: '#2d5a27', height: [0.8, 1.5], chance: 0.07 },
        { type: 'rock', color: '#8b7355', height: [0.3, 0.7], chance: 0.1 },
        { type: 'skull', color: '#d4c4a8', height: [0.2, 0.4], chance: 0.03 },
    ],
    SNOW: [
        { type: 'ice', color: '#a8d8ea', height: [0.5, 1.2], chance: 0.08 },
        { type: 'rock', color: '#7a8a9a', height: [0.3, 0.6], chance: 0.1 },
        { type: 'snowpile', color: '#e8f0f8', height: [0.2, 0.4], chance: 0.12 },
    ],
    DUNGEON: [
        { type: 'pillar', color: '#4a4a4a', height: [1.5, 3], chance: 0.04 },
        { type: 'rubble', color: '#3a3a3a', height: [0.2, 0.5], chance: 0.1 },
        { type: 'skull', color: '#d4c4a8', height: [0.1, 0.3], chance: 0.05 },
    ],
    SWAMP: [
        { type: 'mushroom', color: '#6a4a6a', height: [0.3, 0.6], chance: 0.1 },
        { type: 'pond', color: '#2a4a3a', height: [0.1, 0.2], chance: 0.08 },
        { type: 'vine', color: '#3a5a2a', height: [0.5, 1], chance: 0.08 },
    ],
    DEFAULT: [
        { type: 'grass', color: '#3a5a2a', height: [0.2, 0.4], chance: 0.15 },
        { type: 'rock', color: '#6a6a6a', height: [0.3, 0.6], chance: 0.08 },
        { type: 'flower', color: '#8a4a6a', height: [0.1, 0.3], chance: 0.05 },
    ]
};

const BIOME_COLORS = {
    FOREST: { ground: '#2d4a2d', accent: '#4a7a4a', emissive: '#1a4a1a' },
    DESERT: { ground: '#8b7355', accent: '#a08060', emissive: '#6a5040' },
    SNOW: { ground: '#d0e0e8', accent: '#e8f0f8', emissive: '#a8c8d8' },
    DUNGEON: { ground: '#3a3a3a', accent: '#5a5a5a', emissive: '#2a1a1a' },
    SWAMP: { ground: '#2a3a2a', accent: '#3a5a3a', emissive: '#1a2a1a' },
    DEFAULT: { ground: '#4a5a4a', accent: '#6a7a6a', emissive: '#2a3a2a' }
};

export const DecorationLayer: React.FC<DecorationLayerProps> = ({ mapData, dimension = 'MORTAL', terrain = 'DEFAULT' }) => {
    const decorations = useMemo(() => {
        if (!mapData || mapData.length === 0) return [];
        
        const decs: any[] = [];
        const biomeKey = terrain as keyof typeof DECORATIONS;
        const biomeDecorations = DECORATIONS[biomeKey] || DECORATIONS.DEFAULT;
        
        mapData.forEach((cell, idx) => {
            if (!cell || cell.height < 2) {
                biomeDecorations.forEach((dec) => {
                    if (Math.random() < dec.chance) {
                        decs.push({
                            position: [cell.x, cell.height + cell.offsetY + dec.height[0], cell.z],
                            scale: [0.5 + Math.random() * 0.5, dec.height[0] + Math.random() * (dec.height[1] - dec.height[0]), 0.5 + Math.random() * 0.5],
                            color: dec.color,
                            type: dec.type,
                            idx
                        });
                    }
                });
            }
        });
        
        return decs;
    }, [mapData, terrain]);

    if (decorations.length === 0) return null;

    return (
        <group>
            {decorations.map((dec, i) => (
                <mesh key={i} position={dec.position} scale={dec.scale}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial 
                        color={dec.color} 
                        roughness={0.9}
                        metalness={0.1}
                    />
                </mesh>
            ))}
        </group>
    );
};

// Magical particles floating around the battle
export const BattleParticles: React.FC<{ dimension?: string; terrain?: string }> = ({ dimension = 'MORTAL', terrain = 'DEFAULT' }) => {
    const particlesRef = useRef<THREE.Points>(null);
    const count = 100;
    
    const isMagic = dimension === 'ETERNUM';
    const isShadow = dimension === 'UPSIDE_DOWN';
    
    const particles = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        
        const baseColor = isMagic ? [0.8, 0.3, 1] : isShadow ? [0.3, 0.1, 0.5] : [0.3, 0.6, 0.3];
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 1] = Math.random() * 8 + 1;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
            
            colors[i * 3] = baseColor[0] + (Math.random() - 0.5) * 0.3;
            colors[i * 3 + 1] = baseColor[1] + (Math.random() - 0.5) * 0.3;
            colors[i * 3 + 2] = baseColor[2] + (Math.random() - 0.5) * 0.3;
            
            sizes[i] = Math.random() * 0.15 + 0.05;
        }
        
        return { positions, colors, sizes };
    }, [isMagic, isShadow]);
    
    useFrame((state) => {
        if (particlesRef.current) {
            particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
            const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < count; i++) {
                positions[i * 3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.002;
            }
            particlesRef.current.geometry.attributes.position.needsUpdate = true;
        }
    });
    
    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={particles.positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={count}
                    array={particles.colors}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                vertexColors
                transparent
                opacity={0.6}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

// Ground glow effects
export const BattleGlow: React.FC<{ terrain?: string }> = ({ terrain = 'DEFAULT' }) => {
    const glowRef = useRef<THREE.Mesh>(null);
    
    const colors = BIOME_COLORS[terrain as keyof typeof BIOME_COLORS] || BIOME_COLORS.DEFAULT;
    
    useFrame((state) => {
        if (glowRef.current) {
            const material = glowRef.current.material as THREE.MeshBasicMaterial;
            material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
        }
    });
    
    return (
        <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.02, 8]}>
            <planeGeometry args={[24, 24]} />
            <meshBasicMaterial 
                color={colors.emissive}
                transparent
                opacity={0.15}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
};

// Edge fog/mist for atmosphere
export const BattleMist: React.FC = () => {
    const mistRef = useRef<THREE.Mesh>(null);
    
    useFrame((state) => {
        if (mistRef.current) {
            mistRef.current.rotation.z = state.clock.elapsedTime * 0.02;
        }
    });
    
    return (
        <group>
            {[0, 1, 2, 3].map((i) => (
                <mesh 
                    key={i} 
                    ref={i === 0 ? mistRef : undefined}
                    position={[
                        i < 2 ? (i === 0 ? -3 : 19) : 8,
                        0.1,
                        i >= 2 ? (i === 2 ? -3 : 19) : 8
                    ]}
                    rotation={[-Math.PI / 2, 0, (i * Math.PI) / 2]}
                >
                    <planeGeometry args={[24, 3]} />
                    <meshBasicMaterial 
                        color="#4a5a6a"
                        transparent
                        opacity={0.3}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
        </group>
    );
};
