// @ts-nocheck
import React, { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TerrainType } from '../../types';

const FOG_CONFIGS = {
    GRASS: { color: '#1a2a1a', density: 0.015 },
    FOREST: { color: '#0d1f0d', density: 0.02 },
    MOUNTAIN: { color: '#2a2a2a', density: 0.012 },
    DESERT: { color: '#3a2a1a', density: 0.01 },
    SNOW: { color: '#5a6a7a', density: 0.018 },
    DUNGEON: { color: '#0a0a0a', density: 0.025 },
    CAVE: { color: '#050505', density: 0.035 },
    SWAMP: { color: '#0a150a', density: 0.022 },
    WATER: { color: '#050a15', density: 0.018 },
    LAVA: { color: '#2a0a05', density: 0.025 },
    SHADOW: { color: '#1a0a2a', density: 0.028 },
    ETERNUM: { color: '#1a0a2a', density: 0.02 },
    DEFAULT: { color: '#1a2530', density: 0.015 }
};

export const FogController = React.memo(({ isShadowRealm, terrain, dimension }: { isShadowRealm?: boolean, terrain?: TerrainType, dimension?: string }) => {
    const { scene } = useThree();
    
    const config = useMemo(() => {
        if (isShadowRealm || dimension === 'UPSIDE_DOWN') return FOG_CONFIGS.SHADOW;
        if (dimension === 'ETERNUM') return FOG_CONFIGS.ETERNUM;
        
        const terrainKey = terrain?.toUpperCase() || 'DEFAULT';
        return FOG_CONFIGS[terrainKey as keyof typeof FOG_CONFIGS] || FOG_CONFIGS.DEFAULT;
    }, [isShadowRealm, terrain, dimension]);

    useEffect(() => {
        scene.fog = new THREE.FogExp2(config.color, config.density);
        scene.background = new THREE.Color(config.color);
    }, [config, scene]);
    
    return null;
});
