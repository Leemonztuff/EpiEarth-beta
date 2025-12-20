
// @ts-nocheck
import React, { useMemo } from 'react';
import { BillboardUnit } from './BillboardUnit';
import { Entity, BattleCell } from '../../types';

interface EntityRendererProps {
    entity: Entity;
    mapData: BattleCell[];
    isCurrentTurn: boolean;
    onTileClick: (x: number, z: number) => void;
    onInspect: (id: string) => void;
    isActing: boolean;
    actionType: 'ATTACK' | 'IDLE';
}

export const EntityRenderer = React.memo(({ 
    entity, 
    mapData, 
    isCurrentTurn, 
    onTileClick, 
    onInspect, 
    isActing, 
    actionType 
}: EntityRendererProps) => {
    if (!entity || !entity.position || !entity.stats) return null;

    // Calculate Y position based on terrain height/offset
    const yPos = useMemo(() => {
        const cell = mapData?.find((c: BattleCell) => c.x === entity.position.x && c.z === entity.position.y);
        return cell ? (cell.offsetY + cell.height) : 1.0;
    }, [mapData, entity.position.x, entity.position.y]);

    // Robust visual data
    const visual = entity.visual || { color: '#ffffff', spriteUrl: '' };
    const stats = entity.stats;

    return (
        <BillboardUnit 
            position={[entity.position.x, yPos, entity.position.y]} 
            color={visual.color || (entity.type === 'ENEMY' ? '#ef4444' : '#3b82f6')} 
            spriteUrl={visual.spriteUrl} 
            isCurrentTurn={isCurrentTurn} 
            hp={stats.hp} 
            maxHp={stats.maxHp}
            onUnitClick={onTileClick}
            onInspect={() => onInspect(entity.id)} 
            isActing={isActing} 
            actionType={actionType} 
            entityType={entity.type}
            entity={entity}
            activeStatusEffects={stats.activeStatusEffects || []}
        />
    );
});
