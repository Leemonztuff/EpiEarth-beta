
import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TerrainType } from '../../types';

export const FogController = React.memo(({ isShadowRealm, terrain }: { isShadowRealm: boolean, terrain: TerrainType }) => {
    const { scene } = useThree();
    
    useEffect(() => {
        if (terrain === TerrainType.LAVA) {
            // Lava Arena: Tono cálido, visibilidad media-alta
            scene.fog = new THREE.Fog('#2a1510', 25, 90); 
            scene.background = new THREE.Color('#2a1510');
        } else if (isShadowRealm) {
            // Shadow Realm: Violeta oscuro, visibilidad clara en el centro
            scene.fog = new THREE.Fog('#1a1525', 20, 80); 
            scene.background = new THREE.Color('#1a1525');
        } else {
            // Normal World: Máxima nitidez táctica
            scene.fog = new THREE.Fog('#1a2530', 40, 120);
            scene.background = new THREE.Color('#1a2530');
        }
    }, [isShadowRealm, terrain, scene]);
    
    return null;
});
