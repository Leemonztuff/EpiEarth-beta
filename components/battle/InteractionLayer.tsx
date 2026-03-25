
// @ts-nocheck
import React, { useLayoutEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import { BattleAction } from '../../types';

const PLANE_GEO = new THREE.PlaneGeometry(1, 1);
const _tempObj = new THREE.Object3D();

const InstanceOverlay = ({ points, color, heightMap, opacity = 0.5 }: any) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = points?.length || 0;

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return;
        points.forEach((p, i) => {
            const height = heightMap.get(`${p.x},${p.y}`) || 1;
            _tempObj.position.set(p.x, height + 0.05, p.y);
            _tempObj.rotation.set(-Math.PI / 2, 0, 0);
            _tempObj.scale.set(0.95, 0.95, 1);
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [points, heightMap, count]);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.material.opacity = opacity + Math.sin(state.clock.elapsedTime * 6) * 0.1;
        }
    });

    if (count === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[PLANE_GEO, undefined, count]}>
            <meshBasicMaterial color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </instancedMesh>
    );
};

export const InteractionLayer = ({ mapData, validMoves, validTargets }: any) => {
    const selectedTile = useGameStore(s => s.selectedTile);
    const selectedAction = useGameStore(s => s.selectedAction);

    // OPTIMIZACIÓN: Mapa de alturas O(1)
    const heightMap = useMemo(() => {
        const m = new Map();
        if (mapData) mapData.forEach(c => m.set(`${c.x},${c.z}`, c.height + c.offsetY));
        return m;
    }, [mapData]);

    const cursorY = selectedTile ? (heightMap.get(`${selectedTile.x},${selectedTile.z}`) || 1) + 0.06 : 1;

    return (
        <group>
            {selectedAction === BattleAction.MOVE && (
                <InstanceOverlay points={validMoves} color="#0ea5e9" heightMap={heightMap} />
            )}

            {selectedAction === BattleAction.ATTACK && (
                <InstanceOverlay points={validTargets} color="#ef4444" heightMap={heightMap} />
            )}

            {selectedTile && (
                <mesh position={[selectedTile.x, cursorY, selectedTile.z]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.48, 0.52, 32]} />
                    <meshBasicMaterial color="white" transparent opacity={0.8} />
                </mesh>
            )}
        </group>
    );
};
