
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
    onContextMenu: (entity: Entity, event: React.MouseEvent) => void;
    isActing: boolean;
    actionType: 'ATTACK' | 'IDLE';
}

export const EntityRenderer = React.memo(({ 
    entity, 
    mapData, 
    isCurrentTurn, 
    onTileClick, 
    onInspect, 
    onContextMenu,
    isActing, 
    actionType 
}: EntityRendererProps) => {
    // Protección total contra entidades malformadas
    if (!entity || !entity.position || !entity.stats) return null;

    // Calcular Y basado en la altura de la celda (Voxels)
    const yPos = useMemo(() => {
        if (!mapData || !entity.position) return 0;
        const cell = mapData.find((c: BattleCell) => c.x === entity.position.x && c.z === entity.position.y);
        // Si el bloque tiene altura 3, la superficie está en Y=3.
        return cell ? (cell.offsetY + cell.height) : 0;
    }, [mapData, entity.position.x, entity.position.y]);

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
            onContextMenu={(e: any) => onContextMenu(entity, e)}
            isActing={isActing} 
            actionType={actionType} 
            entityType={entity.type}
            entity={entity}
            activeStatusEffects={stats.activeStatusEffects || []}
        />
    );
});
