
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
            selectedTile, activeSpellEffect
        } = store;

        // 1. DETERMINAR PUNTO DE ENFOQUE
        let focusPos = new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0.5, BATTLE_MAP_SIZE / 2);
        
        const actorId = turnOrder[currentTurnIndex];
        const actor = battleEntities.find(e => e.id === actorId);

        if (activeSpellEffect) {
            // "ACTION CAM": Enfocar el punto medio entre atacante y objetivo durante el efecto
            const start = new THREE.Vector3(...activeSpellEffect.startPos);
            const end = new THREE.Vector3(...activeSpellEffect.endPos);
            focusPos.lerpVectors(start, end, 0.5);
            focusPos.y += 1.0;
        } else if (isActionAnimating || isUnitMenuOpen) {
            if (actor?.position) {
                focusPos.set(actor.position.x, 1.2, actor.position.y);
            }
        } else if (selectedTile) {
            focusPos.set(selectedTile.x, 0.5, selectedTile.y);
        }

        // 2. APLICAR AMORTIGUACIÓN DINÁMICA
        // Si hay una acción, la cámara es más agresiva (12), si es calma es lenta (4)
        const smoothingSpeed = activeSpellEffect ? 12 : (isActionAnimating ? 8 : 5);
        
        targetVec.current.x = THREE.MathUtils.damp(targetVec.current.x, focusPos.x, smoothingSpeed, delta);
        targetVec.current.y = THREE.MathUtils.damp(targetVec.current.y, focusPos.y, smoothingSpeed, delta);
        targetVec.current.z = THREE.MathUtils.damp(targetVec.current.z, focusPos.z, smoothingSpeed, delta);

        controls.target.copy(targetVec.current);
        
        // 3. SCREEN SHAKE (EFECTO SÍSMICO)
        if (isScreenShaking) {
            const intensity = activeSpellEffect ? 0.4 : 0.2;
            shakeVec.current.set(
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity
            );
            camera.position.add(shakeVec.current);
        }

        // 4. ZOOM DINÁMICO (Efecto Lente)
        if (camera.isOrthographicCamera) {
            let targetZoom = 65;
            if (activeSpellEffect) targetZoom = 110; // Zoom máximo en el golpe
            else if (isUnitMenuOpen || isActionAnimating) targetZoom = 95;
            
            currentZoom.current = THREE.MathUtils.damp(currentZoom.current, targetZoom, 4, delta);
            camera.zoom = currentZoom.current;
            camera.updateProjectionMatrix();
        }

        controls.update();
    });

    return null;
};
