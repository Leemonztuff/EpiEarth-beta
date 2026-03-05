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
    INSPECT = 'INSPECT',
    AUTO_FOCUS = 'AUTO_FOCUS'
}

interface CameraState {
    mode: CameraMode;
    targetFocus: THREE.Vector3;
    targetZoom: number;
    transitionSpeed: number;
    isLocked: boolean;
}

export const CinematicCamera = () => {
    const { camera, controls } = useThree();
    
    const cameraState = useRef<CameraState>({
        mode: CameraMode.IDLE,
        targetFocus: new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2),
        targetZoom: 65,
        transitionSpeed: 3,
        isLocked: false
    });
    
    const currentFocus = useRef(new THREE.Vector3(BATTLE_MAP_SIZE / 2, 0, BATTLE_MAP_SIZE / 2));
    const currentZoom = useRef(65);
    const shakeOffset = useRef(new THREE.Vector3());
    const shakeIntensity = useRef(0);
    const isUserInteracting = useRef(false);
    const interactionTimeout = useRef<NodeJS.Timeout | null>(null);
    
    const ZOOM_DEFAULT = 65;
    const ZOOM_FAR = 45;
    const ZOOM_NEAR = 80;
    const ZOOM_ACTION = 55;
    const ZOOM_INSPECT = 90;
    
    useEffect(() => {
        if (camera && camera.isOrthographicCamera) {
            camera.zoom = ZOOM_DEFAULT;
            camera.updateProjectionMatrix();
        }
    }, [camera]);

    useEffect(() => {
        const handleInteractionStart = () => {
            isUserInteracting.current = true;
            cameraState.current.isLocked = false;
            if (interactionTimeout.current) {
                clearTimeout(interactionTimeout.current);
            }
        };
        
        const handleInteractionEnd = () => {
            interactionTimeout.current = setTimeout(() => {
                isUserInteracting.current = false;
            }, 2000);
        };
        
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            isUserInteracting.current = true;
            
            const delta = e.deltaY > 0 ? 3 : -3;
            cameraState.current.targetZoom = clamp(
                cameraState.current.targetZoom + delta, 
                ZOOM_FAR, 
                ZOOM_NEAR
            );
            
            if (interactionTimeout.current) {
                clearTimeout(interactionTimeout.current);
            }
            interactionTimeout.current = setTimeout(() => {
                isUserInteracting.current = false;
            }, 1500);
        };
        
        window.addEventListener('pointerdown', handleInteractionStart);
        window.addEventListener('pointerup', handleInteractionEnd);
        window.addEventListener('wheel', handleWheel, { passive: false });
        
        return () => {
            window.removeEventListener('pointerdown', handleInteractionStart);
            window.removeEventListener('pointerup', handleInteractionEnd);
            window.removeEventListener('wheel', handleWheel);
            if (interactionTimeout.current) {
                clearTimeout(interactionTimeout.current);
            }
        };
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
        let transitionSpeed = 2;
        let isLocked = false;
        
        if (inspectedEntity?.position) {
            focusPoint.set(inspectedEntity.position.x, 0.5, inspectedEntity.position.y);
            zoom = ZOOM_INSPECT;
            mode = CameraMode.INSPECT;
            transitionSpeed = 5;
            isLocked = true;
        }
        else if (activeSpellEffect) {
            const start = new THREE.Vector3(activeSpellEffect.startPos[0], 0, activeSpellEffect.startPos[2]);
            const end = new THREE.Vector3(activeSpellEffect.endPos[0], 0, activeSpellEffect.endPos[2]);
            focusPoint.lerpVectors(start, end, 0.5);
            focusPoint.y = 0.5;
            zoom = ZOOM_DEFAULT;
            mode = CameraMode.SPELL_EFFECT;
            transitionSpeed = 8;
            isLocked = true;
        }
        else if (isActionAnimating && actor?.position) {
            focusPoint.set(actor.position.x, 0.5, actor.position.y);
            zoom = ZOOM_ACTION;
            mode = CameraMode.ACTION;
            transitionSpeed = 10;
            isLocked = true;
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
                    0.25
                );
            }
            zoom = ZOOM_ACTION;
            mode = CameraMode.SELECT_TARGET;
            transitionSpeed = 4;
        }
        else if (selectedTile) {
            focusPoint.set(selectedTile.x, 0.3, selectedTile.y);
            zoom = ZOOM_DEFAULT;
            transitionSpeed = 6;
        }
        else if (actor?.position) {
            focusPoint.set(actor.position.x, 0.3, actor.position.y);
            zoom = ZOOM_DEFAULT;
            mode = CameraMode.FOLLOW_ACTOR;
            transitionSpeed = 2.5;
        }
        
        const shouldLock = isLocked || mode === CameraMode.ACTION || mode === CameraMode.SPELL_EFFECT || mode === CameraMode.INSPECT;
        
        return { focusPoint, zoom, mode, transitionSpeed, actor, shouldLock };
    };

    useFrame((state, delta) => {
        if (!controls || !camera || !camera.isOrthographicCamera) return;

        const store = useGameStore.getState();
        const { isScreenShaking } = store;
        
        const dt = Math.min(delta, 0.1);
        
        const { focusPoint, zoom, mode, transitionSpeed, actor, shouldLock } = determineFocusPoint(store);
        
        cameraState.current.mode = mode;
        cameraState.current.targetFocus.copy(focusPoint);
        cameraState.current.targetZoom = zoom;
        cameraState.current.transitionSpeed = transitionSpeed;
        
        if (shouldLock && !isUserInteracting.current) {
            cameraState.current.isLocked = true;
        }
        
        const focusLerpFactor = 1 - Math.exp(-transitionSpeed * dt);
        const zoomLerpFactor = 1 - Math.exp(-5 * dt);
        
        currentFocus.current.x = lerp(currentFocus.current.x, focusPoint.x, focusLerpFactor);
        currentFocus.current.y = lerp(currentFocus.current.y, focusPoint.y, focusLerpFactor);
        currentFocus.current.z = lerp(currentFocus.current.z, focusPoint.z, focusLerpFactor);
        
        currentZoom.current = lerp(currentZoom.current, zoom, zoomLerpFactor);
        
        if (Math.abs(camera.zoom - currentZoom.current) > 0.1) {
            camera.zoom = currentZoom.current;
            camera.updateProjectionMatrix();
        }
        
        if (isScreenShaking && shakeIntensity.current <= 0) {
            shakeIntensity.current = 0.25;
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
        
        if (cameraState.current.isLocked || shouldLock) {
            controls.target.lerp(finalTarget, focusLerpFactor * 1.5);
        } else {
            const userInfluence = isUserInteracting.current ? 0.3 : 0.7;
            controls.target.lerp(finalTarget, focusLerpFactor * (1 - userInfluence));
        }
        
        const boundPadding = 2;
        controls.target.x = clamp(controls.target.x, -boundPadding, BATTLE_MAP_SIZE + boundPadding);
        controls.target.z = clamp(controls.target.z, -boundPadding, BATTLE_MAP_SIZE + boundPadding);
        
        controls.update();
    });

    return null;
};
