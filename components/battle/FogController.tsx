
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TerrainType } from '../../types';

export const FogController = React.memo(({ isShadowRealm, terrain }: { isShadowRealm: boolean, terrain: TerrainType }) => {
    const { scene } = useThree();
    
    useEffect(() => {
        if (terrain === TerrainType.LAVA) {
            // Lava Arena: Tono cálido, visibilidad media-alta
            scene.fog = new THREE.Fog('#1a0505', 20, 80); 
            scene.background = new THREE.Color('#1a0505');
        } else if (isShadowRealm) {
            // Shadow Realm: Violeta oscuro, visibilidad clara en el centro
            scene.fog = new THREE.Fog('#020617', 15, 70); 
            scene.background = new THREE.Color('#020617');
        } else {
            // Normal World: Máxima nitidez táctica
            scene.fog = new THREE.Fog('#0f172a', 30, 100);
            scene.background = new THREE.Color('#0f172a');
        }
    }, [isShadowRealm, terrain, scene]);
    
    return null;
});
