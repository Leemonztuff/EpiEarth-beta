
// @ts-nocheck
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BATTLE_MAP_SIZE } from '../../constants';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const CinematicCamera = () => {
    const { camera, controls } = useThree();
    
    const targetPos = useRef(new THREE.Vector3(8, 0, 8));
    const currentFocus = useRef(new THREE.Vector3(8, 0, 8));
    const basePosition = useRef(new THREE.Vector3(50, 50, 50));
    const shakeOffset = useRef(new THREE.Vector3());
    const shakeDecay = useRef(0);
    const zoomTarget = useRef(65);
    const currentZoom = useRef(65);
    
    const isInitialized = useRef(false);

    useEffect(() => {
        if (camera && camera.isOrthographicCamera) {
            camera.zoom = 65;
            camera.updateProjectionMatrix();
            basePosition.current.set(50, 50, 50);
            isInitialized.current = true;
        }
    }, [camera]);

    useFrame((state, delta) => {
        if (!controls || !camera || !camera.isOrthographicCamera) return;

        const store = useGameStore.getState();
        const { 
            battleEntities, turnOrder, currentTurnIndex, 
            isUnitMenuOpen, isActionAnimating, isScreenShaking,
            selectedTile, activeSpellEffect
        } = store;

        const dt = Math.min(delta, 0.1);

        // === 1. DETERMINAR PUNTO DE FOCO ===
        let desiredFocus = new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2);
        
        const actorId = turnOrder[currentTurnIndex];
        const actor = battleEntities?.find(e => e.id === actorId);

        if (activeSpellEffect) {
            // Enfoque entre start y end del efecto
            const start = new THREE.Vector3(activeSpellEffect.startPos[0], 0, activeSpellEffect.startPos[2]);
            const end = new THREE.Vector3(activeSpellEffect.endPos[0], 0, activeSpellEffect.endPos[2]);
            desiredFocus.lerpVectors(start, end, 0.5);
            desiredFocus.y = 0.5;
        } else if (isActionAnimating && actor?.position) {
            // Enfocar entidad actuando
            desiredFocus.set(actor.position.x, 0.5, actor.position.y);
        } else if (isUnitMenuOpen && actor?.position) {
            // Menú abierto - mantener enfoque en actor
            desiredFocus.set(actor.position.x, 0.5, actor.position.y);
        } else if (selectedTile) {
            // Tile seleccionado
            desiredFocus.set(selectedTile.x, 0.3, selectedTile.y);
        } else if (actor?.position) {
            // Turno actual - seguir actor
            desiredFocus.set(actor.position.x, 0.3, actor.position.y);
        }

        // === 2. SUAVIZADO DEL FOCO (LERP) ===
        // Velocidad depends del estado: rápido durante acciones, lento en exploración
        const focusSpeed = activeSpellEffect ? 8 : (isActionAnimating ? 6 : 3);
        const lerpFactor = 1 - Math.exp(-focusSpeed * dt);
        
        currentFocus.current.x = lerp(currentFocus.current.x, desiredFocus.x, lerpFactor);
        currentFocus.current.y = lerp(currentFocus.current.y, desiredFocus.y, lerpFactor);
        currentFocus.current.z = lerp(currentFocus.current.z, desiredFocus.z, lerpFactor);

        // Actualizar target de OrbitControls
        targetPos.current.copy(currentFocus.current);
        controls.target.lerp(targetPos.current, lerpFactor);

        // === 3. ZOOM DINÁMICO ===
        let targetZoom = 65;
        
        if (activeSpellEffect) {
            targetZoom = 50; // Zoom in para ver el efecto
        } else if (isActionAnimating || isUnitMenuOpen) {
            targetZoom = 55; // Zoom moderado cuando hay acción
        } else if (battleEntities && battleEntities.length > 8) {
            targetZoom = 75; // Zoom out si hay muchas entidades
        } else {
            targetZoom = 65; // Default
        }

        // Limitar zoom a valores seguros
        zoomTarget.current = clamp(targetZoom, 40, 100);
        
        // Suavizado del zoom
        const zoomLerp = 1 - Math.exp(-4 * dt);
        currentZoom.current = lerp(currentZoom.current, zoomTarget.current, zoomLerp);
        
        if (Math.abs(camera.zoom - currentZoom.current) > 0.1) {
            camera.zoom = currentZoom.current;
            camera.updateProjectionMatrix();
        }

        // === 4. SCREEN SHAKE ===
        if (isScreenShaking && shakeDecay.current <= 0) {
            shakeDecay.current = 0.3; // Duración del shake
        }

        if (shakeDecay.current > 0) {
            const intensity = 0.3 * (shakeDecay.current / 0.3);
            shakeOffset.current.set(
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity * 0.5
            );
            shakeDecay.current -= dt;
        } else {
            shakeOffset.current.set(0, 0, 0);
        }

        // Aplicar shake a la posición de la cámara (no deriva)
        const finalTarget = controls.target.clone().add(shakeOffset.current);
        controls.target.copy(finalTarget);

        // === 5. LIMITES DE CÁMARA ===
        // Mantener cámara dentro del mapa
        const mapHalf = BATTLE_MAP_SIZE / 2 + 2;
        controls.target.x = clamp(controls.target.x, -2, BATTLE_MAP_SIZE + 2);
        controls.target.z = clamp(controls.target.z, -2, BATTLE_MAP_SIZE + 2);

        controls.update();
    });

    return null;
};
