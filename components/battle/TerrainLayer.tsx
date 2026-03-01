// @ts-nocheck
import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TerrainType } from '../../types';
import { AssetManager } from '../../services/AssetManager';

const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

const BIOME_THEMES = {
    FOREST: {
        groundColors: ['#2d4a2d', '#3d5a3d', '#1d3a1d', '#2a4a2a'],
        accentColor: '#4a7a4a',
        fogColor: '#1a3a1a',
        particleColor: '#90EE90',
        particleCount: 80
    },
    DESERT: {
        groundColors: ['#8b7355', '#a08060', '#6a5040', '#9a8a70'],
        accentColor: '#d4a574',
        fogColor: '#4a3a2a',
        particleColor: '#f4d03f',
        particleCount: 40
    },
    SNOW: {
        groundColors: ['#d0e0e8', '#e8f0f8', '#b8c8d8', '#c8d8e8'],
        accentColor: '#a8c8d8',
        fogColor: '#8a9aaa',
        particleColor: '#ffffff',
        particleCount: 100
    },
    DUNGEON: {
        groundColors: ['#3a3a3a', '#4a4a4a', '#2a2a2a', '#353535'],
        accentColor: '#5a5a5a',
        fogColor: '#1a1a1a',
        particleColor: '#666666',
        particleCount: 30
    },
    SWAMP: {
        groundColors: ['#2a3a2a', '#3a4a3a', '#1a2a1a', '#2a4a2a'],
        accentColor: '#4a6a4a',
        fogColor: '#1a2a1a',
        particleColor: '#90EE90',
        particleCount: 60
    },
    WATER: {
        groundColors: ['#1e3a5f', '#2a4a6f', '#1a2a4f', '#3a5a7f'],
        accentColor: '#4a8aaf',
        fogColor: '#0a1a2f',
        particleColor: '#4a9acf',
        particleCount: 20
    },
    LAVA: {
        groundColors: ['#4a1a1a', '#5a2a1a', '#3a0a0a', '#6a3a1a'],
        accentColor: '#ff4400',
        fogColor: '#2a0a0a',
        particleColor: '#ff6600',
        particleCount: 50
    },
    DEFAULT: {
        groundColors: ['#4a5a4a', '#5a6a5a', '#3a4a3a', '#4a6a4a'],
        accentColor: '#6a7a6a',
        fogColor: '#2a3a2a',
        particleColor: '#aabbcc',
        particleCount: 50
    }
};

const TexturedTerrainBlock = React.memo(({ blocks, textureUrl, biome, onTileClick, onTileHover }: any) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = blocks?.length || 0;
    
    const theme = BIOME_THEMES[biome] || BIOME_THEMES.DEFAULT;
    
    const texture = useMemo(() => {
        try {
            const tex = AssetManager.getTexture(textureUrl);
            if (tex) {
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.NearestFilter;
            }
            return tex;
        } catch (e) {
            return null; 
        }
    }, [textureUrl]);

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return;
        
        blocks.forEach((block, i) => {
            if (!block || i >= count) return;
            
            const yBase = block.offsetY || 0;
            const height = block.height || 1;
            const yCenter = yBase + height / 2;
            
            _tempObj.position.set(block.x || 0, yCenter, block.z || 0);
            _tempObj.scale.set(0.98, height, 0.98);
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);
            
            const healthRatio = (block.hp || 1) / (block.maxHp || 1);
            const colorIndex = Math.abs((block.x || 0) + (block.z || 0) * 7) % theme.groundColors.length;
            const baseColor = new THREE.Color(theme.groundColors[colorIndex]);
            const darkenFactor = 0.4 + (healthRatio * 0.6);
            _tempColor.copy(baseColor).multiplyScalar(darkenFactor);
            meshRef.current.setColorAt(i, _tempColor);
        });
        
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [blocks, count, theme]);

    if (count === 0) return null;

    return (
        <instancedMesh 
            ref={meshRef} 
            args={[undefined, undefined, count]} 
            onClick={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined && blocks[e.instanceId]) 
                    onTileClick(blocks[e.instanceId].x, blocks[e.instanceId].z);
            }}
            onPointerMove={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined && blocks[e.instanceId])
                    onTileHover(blocks[e.instanceId].x, blocks[e.instanceId].z);
            }}
            castShadow
            receiveShadow
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial 
                map={texture} 
                roughness={0.85}
                metalness={0.1}
                vertexColors={true}
                flatShading={false}
            />
        </instancedMesh>
    );
});

const TerrainEdges: React.FC<{ mapData: any[]; biome: string }> = ({ mapData, biome }) => {
    const edgesRef = useRef<THREE.LineSegments>(null);
    
    const theme = BIOME_THEMES[biome] || BIOME_THEMES.DEFAULT;
    
    const geometry = useMemo(() => {
        if (!mapData || mapData.length === 0) return null;
        
        const positions: number[] = [];
        
        mapData.forEach((block) => {
            if (!block) return;
            const x = block.x || 0;
            const y = (block.offsetY || 0);
            const z = block.z || 0;
            const h = block.height || 1;
            
            const x1 = x - 0.49, x2 = x + 0.49;
            const y1 = y, y2 = y + h;
            const z1 = z - 0.49, z2 = z + 0.49;
            
            const c = theme.accentColor;
            const col = new THREE.Color(c).multiplyScalar(0.3);
            
            positions.push(
                x1, y1, z1, x2, y1, z1,
                x2, y1, z1, x2, y1, z2,
                x2, y1, z2, x1, y1, z2,
                x1, y1, z2, x1, y1, z1,
                
                x1, y2, z1, x2, y2, z1,
                x2, y2, z1, x2, y2, z2,
                x2, y2, z2, x1, y2, z2,
                x1, y2, z2, x1, y2, z1,
                
                x1, y1, z1, x1, y2, z1,
                x2, y1, z1, x2, y2, z1,
                x2, y1, z2, x2, y2, z2,
                x1, y1, z2, x1, y2, z2
            );
        });
        
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return geo;
    }, [mapData, theme]);
    
    if (!geometry) return null;
    
    return (
        <lineSegments ref={edgesRef} geometry={geometry}>
            <lineBasicMaterial color={theme.accentColor} opacity={0.15} transparent />
        </lineSegments>
    );
};

export const TerrainLayer = React.memo(({ mapData, biome = 'DEFAULT', onTileClick, onTileHover }: any) => {
    const groups = useMemo(() => {
        const g: Record<string, any[]> = {};
        if (!mapData) return g;
        mapData.forEach(block => {
            if (!block) return;
            const tex = block.textureUrl || 'stone.png';
            if (!g[tex]) g[tex] = [];
            g[tex].push(block);
        });
        return g;
    }, [mapData]);

    return (
        <group>
            {Object.entries(groups).map(([texUrl, blocks]) => (
                <TexturedTerrainBlock 
                    key={texUrl} 
                    textureUrl={texUrl} 
                    blocks={blocks} 
                    biome={biome}
                    onTileClick={onTileClick} 
                    onTileHover={onTileHover} 
                />
            ))}
            <TerrainEdges mapData={mapData} biome={biome} />
        </group>
    );
});

export { BIOME_THEMES };
