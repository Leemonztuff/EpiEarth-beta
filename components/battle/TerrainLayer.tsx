
// @ts-nocheck
import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TileEffectType } from '../../types';
import { AssetManager } from '../../services/AssetManager';

const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

const TexturedTerrainBlock = React.memo(({ blocks, textureUrl, onTileClick, onTileHover }: any) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = blocks?.length || 0;

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
            const yCenter = (block.offsetY || 0) + (block.height || 1) / 2;
            _tempObj.position.set(block.x || 0, yCenter, block.z || 0);
            _tempObj.scale.set(1.0, block.height || 0.1, 1.0); 
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);
            
            const healthRatio = (block.hp || 1) / (block.maxHp || 1);
            const baseColor = new THREE.Color(block.color || '#ffffff');
            const darkenFactor = 0.5 + (healthRatio * 0.5);
            _tempColor.copy(baseColor).multiplyScalar(darkenFactor);
            meshRef.current.setColorAt(i, _tempColor);
        });
        
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [blocks, count]);

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

// Edge lines for block definition
const TerrainEdges: React.FC<{ mapData: any[] }> = ({ mapData }) => {
    const edgesRef = useRef<THREE.LineSegments>(null);
    
    const geometry = useMemo(() => {
        if (!mapData || mapData.length === 0) return null;
        
        const positions: number[] = [];
        
        mapData.forEach((block) => {
            if (!block) return;
            const x = block.x || 0;
            const y = (block.offsetY || 0);
            const z = block.z || 0;
            const h = block.height || 1;
            
            const x1 = x - 0.5, x2 = x + 0.5;
            const y1 = y, y2 = y + h;
            const z1 = z - 0.5, z2 = z + 0.5;
            
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
    }, [mapData]);
    
    if (!geometry) return null;
    
    return (
        <lineSegments ref={edgesRef} geometry={geometry}>
            <lineBasicMaterial color="#ffffff" opacity={0.08} transparent />
        </lineSegments>
    );
};

export const TerrainLayer = React.memo(({ mapData, onTileClick, onTileHover }: any) => {
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
                    onTileClick={onTileClick} 
                    onTileHover={onTileHover} 
                />
            ))}
            <TerrainEdges mapData={mapData} />
        </group>
    );
});
