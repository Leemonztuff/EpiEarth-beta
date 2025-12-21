
// @ts-nocheck
import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BATTLE_MAP_SIZE } from '../../constants';

export const CinematicCamera = () => {
    const { camera, controls } = useThree();
    
    // Referencias persistentes para suavizado (Damping)
    const targetVec = useRef(new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2));
    const currentZoom = useRef(65);
    const shakeVec = useRef(new THREE.Vector3());
    
    useFrame((state, delta) => {
        if (!controls || !camera) return;

        const store = useGameStore.getState();
        const { 
            battleEntities, turnOrder, currentTurnIndex, 
            isUnitMenuOpen, isActionAnimating, isScreenShaking,
            selectedTile
        } = store;

        // 1. DETERMINAR PUNTO DE ENFOQUE (Lógica de prioridad)
        // Por defecto, el centro del mapa
        let focusPos = new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0.5, BATTLE_MAP_SIZE / 2);
        
        const actorId = turnOrder[currentTurnIndex];
        const actor = battleEntities.find(e => e.id === actorId);

        if (isActionAnimating || isUnitMenuOpen) {
            // Enfoque en el personaje activo (a la altura del torso)
            if (actor?.position) {
                focusPos.set(actor.position.x, 1.2, actor.position.y);
            }
        } else if (selectedTile) {
            // Seguir el cursor táctico del jugador
            focusPos.set(selectedTile.x, 0.5, selectedTile.y);
        }

        // 2. APLICAR AMORTIGUACIÓN (Damping)
        // 8 = muy rápido/reactivo, 4 = suave/cinemático
        const smoothingSpeed = isActionAnimating ? 8 : 4;
        
        targetVec.current.x = THREE.MathUtils.damp(targetVec.current.x, focusPos.x, smoothingSpeed, delta);
        targetVec.current.y = THREE.MathUtils.damp(targetVec.current.y, focusPos.y, smoothingSpeed, delta);
        targetVec.current.z = THREE.MathUtils.damp(targetVec.current.z, focusPos.z, smoothingSpeed, delta);

        // Actualizamos el objetivo de los controles de Three.js
        controls.target.copy(targetVec.current);
        
        // 3. EFECTO DE IMPACTO (Screen Shake)
        if (isScreenShaking) {
            const intensity = 0.25;
            shakeVec.current.set(
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity
            );
            camera.position.add(shakeVec.current);
        }

        // 4. ZOOM CONTEXTUAL DINÁMICO
        if (camera.isOrthographicCamera) {
            // Zoom in (90) cuando hay acción, zoom out (65) para ver el tablero
            const targetZoom = (isUnitMenuOpen || isActionAnimating) ? 95 : 65;
            currentZoom.current = THREE.MathUtils.damp(currentZoom.current, targetZoom, 3, delta);
            camera.zoom = currentZoom.current;
            camera.updateProjectionMatrix();
        }

        // Obligatorio para que el damping de OrbitControls funcione
        controls.update();
    });

    return null;
};
