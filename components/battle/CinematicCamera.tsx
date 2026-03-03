// @ts-nocheck
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BATTLE_MAP_SIZE } from '../../constants';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

enum CameraMode {
    IDLE = 'IDLE',
    FOLLOW_ACTOR = 'FOLLOW_ACTOR',
    SELECT_MOVE = 'SELECT_MOVE',
    SELECT_TARGET = 'SELECT_TARGET',
    ACTION = 'ACTION',
    SPELL_EFFECT = 'SPELL_EFFECT',
    INSPECT = 'INSPECT'
}

interface CameraState {
    mode: CameraMode;
    targetFocus: THREE.Vector3;
    targetZoom: number;
    transitionSpeed: number;
}

export const CinematicCamera = () => {
    const { camera, controls } = useThree();
    
    const cameraState = useRef<CameraState>({
        mode: CameraMode.IDLE,
        targetFocus: new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2),
        targetZoom: 65,
        transitionSpeed: 3
    });
    
    const currentFocus = useRef(new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2));
    const currentZoom = useRef(65);
    const shakeOffset = useRef(new THREE.Vector3());
    const shakeIntensity = useRef(0);
    
    const ZOOM_DEFAULT = 65;
    const ZOOM_FAR = 50;
    const ZOOM_NEAR = 75;
    const ZOOM_ACTION = 60;
    
    useEffect(() => {
        if (camera && camera.isOrthographicCamera) {
            camera.zoom = ZOOM_DEFAULT;
            camera.updateProjectionMatrix();
        }
    }, [camera]);

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 2 : -2;
            cameraState.current.targetZoom = clamp(
                cameraState.current.targetZoom + delta, 
                ZOOM_FAR, 
                ZOOM_NEAR
            );
        };
        
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    const determineFocusPoint = (store: any) => {
        const { 
            battleEntities, turnOrder, currentTurnIndex,
            isUnitMenuOpen, isActionAnimating, selectedTile, 
            activeSpellEffect, selectedAction, validMoves, validTargets,
            inspectedEntity
        } = store;
        
        const actorId = turnOrder?.[currentTurnIndex];
        const actor = battleEntities?.find(e => e.id === actorId);
        
        let focusPoint = new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2);
        let zoom = ZOOM_DEFAULT;
        let mode = CameraMode.IDLE;
        let transitionSpeed = 3;
        
        if (inspectedEntity?.position) {
            focusPoint.set(inspectedEntity.position.x, 0.5, inspectedEntity.position.y);
            zoom = ZOOM_NEAR;
            mode = CameraMode.INSPECT;
            transitionSpeed = 4;
        }
        else if (activeSpellEffect) {
            const start = new THREE.Vector3(activeSpellEffect.startPos[0], 0, activeSpellEffect.startPos[2]);
            const end = new THREE.Vector3(activeSpellEffect.endPos[0], 0, activeSpellEffect.endPos[2]);
            focusPoint.lerpVectors(start, end, 0.5);
            focusPoint.y = 0.5;
            zoom = ZOOM_DEFAULT;
            mode = CameraMode.SPELL_EFFECT;
            transitionSpeed = 6;
        }
        else if (isActionAnimating && actor?.position) {
            focusPoint.set(actor.position.x, 0.5, actor.position.y);
            zoom = ZOOM_ACTION;
            mode = CameraMode.ACTION;
            transitionSpeed = 8;
        }
        else if (selectedAction === 'MOVE' && validMoves && validMoves.length > 0) {
            const avgX = validMoves.reduce((sum, m) => sum + m.x, 0) / validMoves.length;
            const avgY = validMoves.reduce((sum, m) => sum + m.y, 0) / validMoves.length;
            focusPoint.set(avgX, 0.3, avgY);
            zoom = ZOOM_FAR;
            mode = CameraMode.SELECT_MOVE;
            transitionSpeed = 4;
        }
        else if (selectedAction === 'ATTACK' && validTargets && validTargets.length > 0) {
            const avgX = validTargets.reduce((sum, t) => sum + t.x, 0) / validTargets.length;
            const avgY = validTargets.reduce((sum, t) => sum + t.y, 0) / validTargets.length;
            focusPoint.set(avgX, 0.3, avgY);
            if (actor?.position) {
                focusPoint.lerpVectors(
                    new THREE.Vector3(actor.position.x, 0, actor.position.y),
                    focusPoint,
                    0.3
                );
            }
            zoom = ZOOM_ACTION;
            mode = CameraMode.SELECT_TARGET;
            transitionSpeed = 4;
        }
        else if (selectedTile) {
            focusPoint.set(selectedTile.x, 0.3, selectedTile.y);
            zoom = ZOOM_DEFAULT;
            transitionSpeed = 5;
        }
        else if (actor?.position) {
            focusPoint.set(actor.position.x, 0.3, actor.position.y);
            zoom = ZOOM_DEFAULT;
            mode = CameraMode.FOLLOW_ACTOR;
            transitionSpeed = 3;
        }
        
        return { focusPoint, zoom, mode, transitionSpeed, actor };
    };

    useFrame((state, delta) => {
        if (!controls || !camera || !camera.isOrthographicCamera) return;

        const store = useGameStore.getState();
        const { isScreenShaking } = store;
        
        const dt = Math.min(delta, 0.1);
        
        const { focusPoint, zoom, mode, transitionSpeed, actor } = determineFocusPoint(store);
        
        cameraState.current.mode = mode;
        cameraState.current.targetFocus.copy(focusPoint);
        cameraState.current.targetZoom = zoom;
        cameraState.current.transitionSpeed = transitionSpeed;
        
        const focusLerpFactor = 1 - Math.exp(-transitionSpeed * dt);
        
        currentFocus.current.x = lerp(currentFocus.current.x, focusPoint.x, focusLerpFactor);
        currentFocus.current.y = lerp(currentFocus.current.y, focusPoint.y, focusLerpFactor);
        currentFocus.current.z = lerp(currentFocus.current.z, focusPoint.z, focusLerpFactor);
        
        const zoomLerpFactor = 1 - Math.exp(-4 * dt);
        currentZoom.current = lerp(currentZoom.current, zoom, zoomLerpFactor);
        
        if (Math.abs(camera.zoom - currentZoom.current) > 0.1) {
            camera.zoom = currentZoom.current;
            camera.updateProjectionMatrix();
        }
        
        if (isScreenShaking && shakeIntensity.current <= 0) {
            shakeIntensity.current = 0.3;
        }
        
        if (shakeIntensity.current > 0) {
            shakeOffset.current.set(
                (Math.random() - 0.5) * shakeIntensity.current,
                (Math.random() - 0.5) * shakeIntensity.current,
                (Math.random() - 0.5) * shakeIntensity.current * 0.3
            );
            shakeIntensity.current -= dt * 2;
        } else {
            shakeOffset.current.set(0, 0, 0);
        }
        
        const finalTarget = currentFocus.current.clone().add(shakeOffset.current);
        
        controls.target.lerp(finalTarget, focusLerpFactor);
        
        const boundPadding = 1;
        controls.target.x = clamp(controls.target.x, -boundPadding, BATTLE_MAP_SIZE + boundPadding);
        controls.target.z = clamp(controls.target.z, -boundPadding, BATTLE_MAP_SIZE + boundPadding);
        
        controls.update();
    });

    return null;
};
