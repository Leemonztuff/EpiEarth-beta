
// @ts-nocheck
import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { TileEffectType, TerrainType } from '../../types';
import { AssetManager } from '../../services/AssetManager';

const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

/**
 * Standard material for terrain blocks using bridged textures.
 */
const TexturedTerrainBlock = React.memo(({ blocks, textureUrl, onTileClick, onTileHover }: any) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = blocks.length;

    // Use Bridged Texture (Guaranteed to be ready because of Preloader)
    const texture = useMemo(() => AssetManager.getTexture(textureUrl), [textureUrl]);

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return;
        
        blocks.forEach((block, i) => {
            const y = (block.offsetY || 0) + (block.height || 1) / 2;
            _tempObj.position.set(block.x || 0, y, block.z || 0);
            _tempObj.scale.set(1.0, block.height || 1, 1.0); // Full size for better overlap
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);
            
            let color = block.color || '#ffffff';
            if (block.effect) {
                if (block.effect.type === TileEffectType.FIRE) color = '#ff8888';
                if (block.effect.type === TileEffectType.POISON_CLOUD) color = '#88ff88';
            }
            _tempColor.set(color);
            meshRef.current.setColorAt(i, _tempColor);
        });
        
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [blocks, count, texture]);

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
            <meshStandardMaterial map={texture} roughness={1} metalness={0} vertexColors={true} />
        </instancedMesh>
    );
});

export const TerrainLayer = React.memo(({ mapData, isShadowRealm, onTileClick, onTileHover }: any) => {
    const groups = useMemo(() => {
        const g: Record<string, any[]> = {};
        if (!mapData) return g;
        mapData.forEach(block => {
            const tex = block.textureUrl || 'terrain/flat/grass.png';
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
        </group>
    );
});
