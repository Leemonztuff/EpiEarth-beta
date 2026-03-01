
// @ts-nocheck
import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
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
                tex.magFilter = tex.minFilter = THREE.NearestFilter;
            }
            return tex;
        } catch (e) {
            return AssetManager.getTexture(undefined); 
        }
    }, [textureUrl]);

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return;
        
        blocks.forEach((block, i) => {
            if (!block || i >= count) return;
            // Posicionamos el bloque considerando su altura destructible
            const yCenter = (block.offsetY || 0) + (block.height || 1) / 2;
            _tempObj.position.set(block.x || 0, yCenter, block.z || 0);
            _tempObj.scale.set(1.0, block.height || 0.1, 1.0); 
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);
            
            const healthRatio = (block.hp || 1) / (block.maxHp || 1);
            _tempColor.set(block.color || '#ffffff').multiplyScalar(0.6 + (healthRatio * 0.6));
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
            <meshStandardMaterial map={texture} roughness={1} metalness={0} vertexColors={true} />
        </instancedMesh>
    );
});

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
        </group>
    );
});
