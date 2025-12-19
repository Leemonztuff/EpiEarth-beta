
// @ts-nocheck
import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BATTLE_MAP_SIZE } from '../../constants';

export const CinematicCamera = () => {
    const { camera, controls } = useThree();
    const targetVec = useRef(new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2));
    const currentZoom = useRef(40);
    
    useFrame((state, delta) => {
        if (!controls || !camera) return;

        const store = useGameStore.getState();
        const { battleEntities, turnOrder, currentTurnIndex, isUnitMenuOpen, isActionAnimating } = store;

        if (!turnOrder || turnOrder.length === 0) return;

        const activeId = turnOrder[currentTurnIndex];
        const actor = battleEntities.find(e => e.id === activeId);

        let idealPos = new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2);
        
        if (actor && actor.position) {
            idealPos.set(actor.position.x, 0, actor.position.y);
        }

        // Lerp del target de los controles (paneo)
        // Si el menú está abierto o hay animación, lerpeamos mucho más rápido (8.0 vs 2.0)
        const lerpFactor = (isUnitMenuOpen || isActionAnimating) ? 8.0 : 2.5;
        targetVec.current.lerp(idealPos, delta * lerpFactor);
        
        controls.target.copy(targetVec.current);
        
        // Manejo dinámico del ZOOM (Solo para OrthographicCamera)
        if (camera.isOrthographicCamera) {
            const targetZoom = isUnitMenuOpen ? 65 : 40;
            currentZoom.current = THREE.MathUtils.lerp(currentZoom.current, targetZoom, delta * 4);
            camera.zoom = currentZoom.current;
            camera.updateProjectionMatrix();
        }

        controls.update();
    });

    return null;
};
