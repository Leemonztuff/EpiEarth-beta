
// @ts-nocheck
import React, { useRef, useLayoutEffect, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line, Billboard, Text, Html } from '@react-three/drei';
import { useGameStore } from '../../store/gameStore';
import { BattleCell, BattleAction, CharacterClass, EquipmentSlot } from '../../types';
import { findBattlePath } from '../../services/pathfinding';
import { getAttackRange, calculateHitChance, getAoETiles, isFlanking, getDamageRange } from '../../services/dndRules';

const _tempObj = new THREE.Object3D();
const PLANE_GEO = new THREE.PlaneGeometry(1, 1);

const InstancedGridOverlay = React.memo(({ points, color, mapData, type, opacity = 0.3 }: any) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = points ? points.length : 0;
    
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0 || !mapData) return;
        let validCount = 0;
        for (let i = 0; i < count; i++) {
            const p = points[i];
            if (!p) continue;
            const cell = mapData.find((c: BattleCell) => c.x === p.x && c.z === p.y);
            const y = cell ? cell.offsetY + cell.height : 0.5; 
            _tempObj.position.set(p.x, y + 0.01, p.y);
            _tempObj.rotation.set(-Math.PI / 2, 0, 0);
            const scale = type === 'aoe' ? 0.98 : (type === 'move' ? 0.9 : 0.8);
            _tempObj.scale.set(scale, scale, 1);
            if (type === 'target') _tempObj.rotateZ(Math.PI / 4);
            _tempObj.updateMatrix();
            meshRef.current!.setMatrixAt(i, _tempObj.matrix);
            validCount++;
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [points, mapData, count, type]);

    useFrame((state) => {
        if (meshRef.current) {
            const t = state.clock.elapsedTime;
            const pulse = opacity + Math.sin(t * (type === 'target' ? 5 : 2)) * 0.1;
            meshRef.current.material.opacity = pulse;
            meshRef.current.material.needsUpdate = true;
        }
    });

    if (count === 0) return null;
    return (
        <instancedMesh ref={meshRef} args={[PLANE_GEO, undefined, count]} frustumCulled={false} raycast={() => null}>
            <meshBasicMaterial color={color} transparent depthWrite={false} side={THREE.DoubleSide} />
        </instancedMesh>
    );
});

const TargetTooltip = ({ target, attacker, action, dimension }: any) => {
    const hitChance = useMemo(() => calculateHitChance(attacker, target, dimension), [attacker, target, dimension]);
    const dmgRange = useMemo(() => getDamageRange(attacker), [attacker]);
    
    // Detectar si hay desventaja por penumbra
    const dist = Math.max(Math.abs(attacker.position.x - target.position.x), Math.abs(attacker.position.y - target.position.y));
    const isObscured = dimension === 'UPSIDE_DOWN' && dist > 3;

    return (
        <Html position={[target.position.x, 2.5, target.position.y]} center zIndexRange={[100, 0]}>
            <div className="bg-black/80 backdrop-blur-md border-2 border-red-500 rounded-lg p-2 flex flex-col items-center shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-in zoom-in-95 duration-150 min-w-[80px]">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter">Hit Chance</span>
                    <span className={`text-sm font-black text-white ${isObscured ? 'text-purple-400 animate-pulse' : ''}`}>{hitChance}%</span>
                </div>
                {isObscured && (
                    <div className="text-[7px] font-black text-purple-400 uppercase tracking-widest mb-1">Dim Visibility Disadvantage</div>
                )}
                <div className="flex items-center gap-2 border-t border-red-900/50 pt-1 w-full justify-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Est. Dmg</span>
                    <span className="text-xs font-bold text-amber-400">{dmgRange}</span>
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-black/80 border-r-2 border-b-2 border-red-500 rotate-45 z-[-1]" />
            </div>
        </Html>
    );
};

export const InteractionLayer = ({ mapData, validMoves, validTargets, currentRange, movementRange }: any) => {
    const { selectedTile, selectedAction, selectedSpell, selectedSkill, battleEntities, turnOrder, currentTurnIndex, dimension } = useGameStore();
    const [pathPoints, setPathPoints] = useState<THREE.Vector3[]>([]);
    const [aoePoints, setAoePoints] = useState<{x:number, y:number}[]>([]);
    
    const activeEntity = battleEntities.find(e => e.id === turnOrder[currentTurnIndex]);
    const hoveredEntity = useMemo(() => {
        if (!selectedTile) return null;
        return battleEntities.find(e => e.position!.x === selectedTile.x && e.position!.y === selectedTile.z && e.stats.hp > 0);
    }, [selectedTile, battleEntities]);

    const isHoveringValidTarget = useMemo(() => {
        if (!selectedTile || !validTargets) return false;
        return validTargets.some(t => t.x === selectedTile.x && t.y === selectedTile.z);
    }, [selectedTile, validTargets]);

    useEffect(() => {
        if (!selectedTile || !activeEntity || activeEntity.type !== 'PLAYER') {
            setPathPoints([]); setAoePoints([]); return;
        }
        const targetX = selectedTile.x; const targetZ = selectedTile.z;
        const startX = activeEntity.position!.x; const startZ = activeEntity.position!.y;

        if (selectedAction === BattleAction.MOVE && validMoves.some(m => m.x === targetX && m.y === targetZ)) {
            const path = findBattlePath({ x: startX, y: startZ }, { x: targetX, y: targetZ }, mapData || []);
            if (path) {
                const points = path.map(p => {
                    const pc = mapData?.find(c => c.x === p.x && c.z === p.z);
                    return new THREE.Vector3(p.x, (pc ? pc.offsetY + pc.height : 0) + 0.1, p.z);
                });
                const startCell = mapData?.find(c => c.x === startX && c.z === startZ);
                const actualStartY = (startCell ? startCell.offsetY + startCell.height : 0.8) + 0.1;
                points.unshift(new THREE.Vector3(startX, actualStartY, startZ));
                setPathPoints(points);
            }
        } else { setPathPoints([]); }

        if ((selectedAction === BattleAction.MAGIC || selectedAction === BattleAction.SKILL)) {
            const skillOrSpell = selectedSpell || selectedSkill;
            if (skillOrSpell && skillOrSpell.aoeRadius) {
                setAoePoints(getAoETiles({ x: startX, y: startZ }, { x: targetX, y: targetZ }, skillOrSpell.aoeType || 'CIRCLE', skillOrSpell.aoeRadius));
            } else { setAoePoints([]); }
        } else { setAoePoints([]); }
    }, [selectedTile, selectedAction, selectedSpell, selectedSkill, activeEntity, mapData, validMoves]);

    return (
        <group>
            {selectedAction === BattleAction.MOVE && validMoves && validMoves.length > 0 && (
                <InstancedGridOverlay points={validMoves} color="#3b82f6" mapData={mapData} type="move" opacity={0.15} />
            )}
            
            {(selectedAction === BattleAction.ATTACK || selectedAction === BattleAction.MAGIC || selectedAction === BattleAction.SKILL) && validTargets && validTargets.length > 0 && (
                <InstancedGridOverlay points={validTargets} color="#ef4444" mapData={mapData} type="target" opacity={0.35} />
            )}
            
            {aoePoints.length > 0 && (
                <InstancedGridOverlay points={aoePoints} color="#dc2626" mapData={mapData} type="aoe" opacity={0.4} />
            )}
            
            {pathPoints.length > 1 && (
                <Line points={pathPoints} color="#60a5fa" lineWidth={4} dashed={true} dashScale={5} dashSize={0.2} gapSize={0.1} />
            )}

            {isHoveringValidTarget && hoveredEntity && activeEntity && (
                <TargetTooltip target={hoveredEntity} attacker={activeEntity} action={selectedAction} dimension={dimension} />
            )}
            
            {selectedTile && (selectedAction === BattleAction.ATTACK || selectedAction === BattleAction.MAGIC || selectedAction === BattleAction.SKILL) && (
                <Billboard position={[selectedTile.x, 0.6, selectedTile.z]}>
                    <mesh rotation={[0, 0, Math.PI / 4]}>
                        <ringGeometry args={[0.4, 0.45, 4]} />
                        <meshBasicMaterial color="#ef4444" transparent opacity={0.8} />
                    </mesh>
                </Billboard>
            )}
        </group>
    );
};
