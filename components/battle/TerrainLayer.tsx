
// @ts-nocheck
import React, { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';

const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

export const TerrainLayer = React.memo(({ mapData, isShadowRealm, onTileClick, onTileHover }: any) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = (mapData && Array.isArray(mapData)) ? mapData.length : 0;

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return;
        
        mapData.forEach((block, i) => {
            if (!block) return;
            const y = (block.offsetY || 0) + (block.height || 1) / 2;
            _tempObj.position.set(block.x || 0, y, block.z || 0);
            _tempObj.scale.set(0.95, block.height || 1, 0.95);
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);
            
            _tempColor.set(block.color || '#444');
            if (((block.x || 0) + (block.z || 0)) % 2 === 0) _tempColor.multiplyScalar(0.8);
            meshRef.current.setColorAt(i, _tempColor);
        });
        
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [mapData, count]);

    return (
        <instancedMesh 
            ref={meshRef} 
            args={[undefined, undefined, count]} 
            onClick={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined && mapData[e.instanceId]) 
                    onTileClick(mapData[e.instanceId].x, mapData[e.instanceId].z);
            }}
            onPointerMove={(e) => {
                e.stopPropagation();
                if (e.instanceId !== undefined && mapData[e.instanceId])
                    onTileHover(mapData[e.instanceId].x, mapData[e.instanceId].z);
            }}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial roughness={1} metalness={0} />
        </instancedMesh>
    );
});
