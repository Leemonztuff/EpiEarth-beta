import React, { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

interface TrapMarkerProps {
    position: [number, number, number];
    trapType: string;
    isArmed: boolean;
}

const TRAP_TEXTURES: Record<string, string> = {
    SPIKE: '/assets/minecraft/cobblestone.png',
    FIRE: '/assets/minecraft/lava_still.png',
    ICE: '/assets/minecraft/blue_concrete.png',
    POISON: '/assets/minecraft/mycelium_top.png',
    EXPLOSIVE: '/assets/minecraft/bricks.png',
    STUN: '/assets/minecraft/oak_planks.png',
    TELEPORT: '/assets/minecraft/blue_concrete.png',
    DECOY: '/assets/minecraft/brown_mushroom.png',
    TRAP_DOOR: '/assets/minecraft/mossy_cobblestone.png',
    ALARM: '/assets/minecraft/black_concrete.png',
};

const FALLBACK_TEXTURE = '/assets/minecraft/bricks.png';

export const TrapMarker: React.FC<TrapMarkerProps> = ({ position, trapType, isArmed }) => {
    const groupRef = useRef<THREE.Group>(null);
    const haloRef = useRef<THREE.Mesh>(null);
    const textureUrl = TRAP_TEXTURES[trapType] || FALLBACK_TEXTURE;
    const texture = useLoader(THREE.TextureLoader, textureUrl);

    const material = useMemo(() => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        return texture;
    }, [texture]);

    useFrame(({ clock }) => {
        if (!groupRef.current || !haloRef.current || !isArmed) {
            return;
        }

        const t = clock.getElapsedTime();
        groupRef.current.position.y = position[1] + 0.12 + Math.sin(t * 3) * 0.04;
        groupRef.current.rotation.y = t * 0.6;

        const pulse = 1 + Math.sin(t * 4) * 0.12;
        haloRef.current.scale.setScalar(pulse);
    });

    if (!isArmed) {
        return null;
    }

    return (
        <group ref={groupRef} position={position}>
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.78, 0.78]} />
                <meshStandardMaterial map={material} transparent alphaTest={0.05} />
            </mesh>
            <mesh ref={haloRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.45, 0.62, 24]} />
                <meshBasicMaterial color="#fbbf24" transparent opacity={0.25} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
};

export default TrapMarker;
