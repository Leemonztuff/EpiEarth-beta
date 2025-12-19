
import React from 'react';
import { BillboardUnit } from './BillboardUnit';

export const EntityRenderer = React.memo(({ entity, mapData, isCurrentTurn, isActivePlayer, onTileClick, onInspect, hasActed, hasMoved, isActing, actionType }: any) => {
    if (!entity || !entity.position) return null;

    const cell = mapData?.find((c: any) => c.x === entity.position.x && c.z === entity.position.y);
    const yPos = cell ? (cell.offsetY + cell.height) : 1.0;

    return (
        <BillboardUnit 
            position={[entity.position.x, yPos, entity.position.y]} 
            color={entity.visual?.color || '#fff'} 
            spriteUrl={entity.visual?.spriteUrl} 
            isCurrentTurn={isCurrentTurn} 
            isActivePlayer={isActivePlayer}
            hp={entity.stats?.hp || 1} 
            maxHp={entity.stats?.maxHp || 1}
            onUnitClick={onTileClick}
            onUnitRightClick={() => onInspect(entity.id)}
            hasActed={hasActed}
            hasMoved={hasMoved}
            isActing={isActing}
            actionType={actionType}
            characterClass={entity.stats?.class}
            activeStatusEffects={entity.stats?.activeStatusEffects}
            name={entity.name}
            level={entity.stats?.level}
            entityType={entity.type}
        />
    );
});
