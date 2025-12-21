
// @ts-nocheck
import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BATTLE_MAP_SIZE } from '../../constants';

export const CinematicCamera = () => {
    const { camera, controls } = useThree();
    const targetVec = useRef(new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2));
    const currentZoom = useRef(60);
    
    useFrame((state, delta) => {
        if (!controls || !camera) return;

        const store = useGameStore.getState();
        const { battleEntities, turnOrder, currentTurnIndex, isUnitMenuOpen, isActionAnimating, isScreenShaking } = store;

        // Validar integridad de datos antes de calcular
        if (!turnOrder || turnOrder.length === 0 || !battleEntities || currentTurnIndex < 0) return;

        const actorId = turnOrder[currentTurnIndex];
        const actor = battleEntities.find(e => e.id === actorId);
        
        let idealPos = new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2);
        
        // Solo actualizar idealPos si el actor y su posición son válidos y numéricos
        if (actor && actor.position && typeof actor.position.x === 'number' && typeof actor.position.y === 'number') {
            idealPos.set(actor.position.x, 0, actor.position.y);
        }

        // Lerp defensivo: Prevenir NaN en la cámara que rompe el contexto de Three.js
        if (!isNaN(idealPos.x) && !isNaN(idealPos.z)) {
            targetVec.current.lerp(idealPos, delta * (isActionAnimating ? 10 : 4));
            controls.target.copy(targetVec.current);
        }
        
        if (isScreenShaking) {
            camera.position.x += (Math.random() - 0.5) * 0.4;
            camera.position.y += (Math.random() - 0.5) * 0.4;
        }

        if (camera.isOrthographicCamera) {
            const targetZoom = (isUnitMenuOpen || isActionAnimating) ? 85 : 60;
            currentZoom.current = THREE.MathUtils.lerp(currentZoom.current, targetZoom, delta * 5);
            camera.zoom = currentZoom.current;
            camera.updateProjectionMatrix();
        }

        controls.update();
    });

    return null;
};
