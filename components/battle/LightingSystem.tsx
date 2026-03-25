
// @ts-nocheck
import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';

// Configuración de iluminación por biome
const BIOME_LIGHTING = {
  FOREST: {
    ambient: { color: '#4a6b4a', intensity: 0.6 },
    directional: { color: '#fffaf0', intensity: 1.8, position: [15, 25, 10] },
    hemisphere: { skyColor: '#b8d4e3', groundColor: '#3d5c3d', intensity: 0.7 }
  },
  DESERT: {
    ambient: { color: '#5a4a3a', intensity: 0.7 },
    directional: { color: '#fff8e0', intensity: 2.0, position: [20, 30, 5] },
    hemisphere: { skyColor: '#ffe4b5', groundColor: '#d4a574', intensity: 0.6 }
  },
  SNOW: {
    ambient: { color: '#6a7a8a', intensity: 0.5 },
    directional: { color: '#f0f8ff', intensity: 1.5, position: [10, 20, 15] },
    hemisphere: { skyColor: '#d0e0f0', groundColor: '#e8f0f8', intensity: 0.8 }
  },
  DUNGEON: {
    ambient: { color: '#1a1a1a', intensity: 0.4 },
    directional: { color: '#ff8844', intensity: 1.2, position: [8, 15, 8] },
    hemisphere: { skyColor: '#3a2a1a', groundColor: '#2a1a0a', intensity: 0.5 }
  },
  SWAMP: {
    ambient: { color: '#3a4a2a', intensity: 0.5 },
    directional: { color: '#cceeaa', intensity: 1.4, position: [12, 20, 8] },
    hemisphere: { skyColor: '#7a9a6a', groundColor: '#4a6a4a', intensity: 0.6 }
  },
  DEFAULT: {
    ambient: { color: '#4a5a6a', intensity: 0.65 },
    directional: { color: '#ffffff', intensity: 1.8, position: [15, 30, 10] },
    hemisphere: { skyColor: '#a8c8d8', groundColor: '#5a6a5a', intensity: 0.7 }
  }
};

// Clima y efectos de luz
const WEATHER_EFFECTS = {
  NONE: { fogColor: null, fogDensity: 0, lightMod: 1 },
  RAIN: { fogColor: '#2a3a4a', fogDensity: 0.015, lightMod: 0.7 },
  SNOW: { fogColor: '#c0c8d0', fogDensity: 0.01, lightMod: 0.85 },
  FOG: { fogColor: '#a0a8b0', fogDensity: 0.025, lightMod: 0.6 },
  STORM: { fogColor: '#1a1a2a', fogDensity: 0.02, lightMod: 0.5 },
  MAGIC: { fogColor: '#4a1a6a', fogDensity: 0.01, lightMod: 1.2 }
};

interface LightingSystemProps {
  terrain?: string;
  weather?: string;
  dimension?: string;
}

export const LightingSystem: React.FC<LightingSystemProps> = ({ 
  terrain = 'DEFAULT', 
  weather = 'NONE',
  dimension = 'MORTAL'
}) => {
  const { scene } = useThree();
  const lightsRef = useRef<{
    ambient: THREE.AmbientLight;
    directional: THREE.DirectionalLight;
    hemisphere: THREE.HemisphereLight;
    pointLights: THREE.PointLight[];
  }>({
    ambient: null as any,
    directional: null as any,
    hemisphere: null as any,
    pointLights: []
  });

  const isInitialized = useRef(false);

  // Obtener configuración según biome
  const biomeConfig = BIOME_LIGHTING[terrain as keyof typeof BIOME_LIGHTING] || BIOME_LIGHTING.DEFAULT;
  const weatherConfig = WEATHER_EFFECTS[weather as keyof typeof WEATHER_EFFECTS] || WEATHER_EFFECTS.NONE;

  // Efectos según dimensión
  const isShadowRealm = dimension === 'UPSIDE_DOWN';
  const isEternumRealm = dimension === 'ETERNUM';

  useMemo(() => {
    if (isInitialized.current) return;
    if (!scene) return;

    // Limpiar luces existentes
    scene.children
      .filter(c => c.isLight)
      .forEach(c => scene.remove(c));

    // Ambient light
    const ambientColor = isShadowRealm ? '#2a1a3a' : (isEternumRealm ? '#3a2a4a' : biomeConfig.ambient.color);
    const ambientIntensity = isShadowRealm ? 0.35 : (isEternumRealm ? 0.4 : biomeConfig.ambient.intensity);
    
    lightsRef.current.ambient = new THREE.AmbientLight(ambientColor, ambientIntensity);
    scene.add(lightsRef.current.ambient);

    // Hemisphere light para iluminación natural
    const hemiConfig = isShadowRealm 
      ? { skyColor: '#1a0030', groundColor: '#000000' }
      : biomeConfig.hemisphere;
    
    lightsRef.current.hemisphere = new THREE.HemisphereLight(
      hemiConfig.skyColor,
      hemiConfig.groundColor,
      biomeConfig.hemisphere.intensity
    );
    scene.add(lightsRef.current.hemisphere);

    // Directional light (sol/luna)
    const dirConfig = isShadowRealm 
      ? { color: '#2a0040', position: [-10, 15, -10] as [number, number, number] }
      : biomeConfig.directional;
    
    lightsRef.current.directional = new THREE.DirectionalLight(
      dirConfig.color,
      dirConfig.intensity * weatherConfig.lightMod
    );
    lightsRef.current.directional.position.set(...dirConfig.position);
    lightsRef.current.directional.castShadow = true;
    lightsRef.current.directional.shadow.mapSize.width = 1024;
    lightsRef.current.directional.shadow.mapSize.height = 1024;
    lightsRef.current.directional.shadow.camera.near = 0.5;
    lightsRef.current.directional.shadow.camera.far = 50;
    lightsRef.current.directional.shadow.camera.left = -20;
    lightsRef.current.directional.shadow.camera.right = 20;
    lightsRef.current.directional.shadow.camera.top = 20;
    lightsRef.current.directional.shadow.camera.bottom = -20;
    scene.add(lightsRef.current.directional);

    // Luz de Fill (suavizado de sombras)
    const fillLight = new THREE.DirectionalLight('#aabbdd', 0.5);
    fillLight.position.set(-10, 15, -5);
    scene.add(fillLight);

    // Luz de relleno lateral
    const fillLight2 = new THREE.DirectionalLight('#ddccaa', 0.3);
    fillLight2.position.set(10, 8, 10);
    scene.add(fillLight2);

    // Rim light para destacados
    const rimLight = new THREE.DirectionalLight('#ffddaa', 0.35);
    rimLight.position.set(5, 8, -10);
    scene.add(rimLight);

    isInitialized.current = true;
  }, [scene, terrain, weather, dimension]);

  // Animación dinámica de luces
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Efectos de parpadeo para antorchas/luces
    if (lightsRef.current.directional) {
      // Suave variación de luz
      const flicker = Math.sin(time * 2) * 0.02 + Math.sin(time * 5.7) * 0.01;
      const baseIntensity = isShadowRealm ? 0.3 : biomeConfig.directional.intensity;
      
      if (weather === 'STORM') {
        // Tormenta: luz más inestable
        lightsRef.current.directional.intensity = (baseIntensity * weatherConfig.lightMod) + flicker * 3;
      } else {
        lightsRef.current.directional.intensity = baseIntensity * weatherConfig.lightMod + flicker;
      }
    }

    // Color de luz según tiempo (día/noche simulado)
    const timeOfDay = Math.sin(time * 0.1);
    if (lightsRef.current.ambient && !isShadowRealm && !isEternumRealm) {
      const dayIntensity = (timeOfDay + 1) / 2;
      lightsRef.current.ambient.intensity = biomeConfig.ambient.intensity * (0.7 + dayIntensity * 0.3);
    }
  });

  return null;
};

// Componente de sol/luna dinámico
export const CelestialBody: React.FC<{ dimension?: string }> = ({ dimension = 'MORTAL' }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      meshRef.current.position.x = Math.cos(time * 0.1) * 30;
      meshRef.current.position.y = Math.sin(time * 0.1) * 20 + 10;
    }
  });

  const isShadow = dimension === 'UPSIDE_DOWN';
  const isEternum = dimension === 'ETERNUM';

  if (isShadow) {
    return (
      <mesh ref={meshRef} position={[20, 15, -20]}>
        <sphereGeometry args={[3, 16, 16]} />
        <meshBasicMaterial color="#2a0040" />
        <pointLight color="#4a0080" intensity={0.5} distance={30} />
      </mesh>
    );
  }

  if (isEternum) {
    return (
      <mesh ref={meshRef} position={[20, 15, -20]}>
        <sphereGeometry args={[4, 16, 16]} />
        <meshBasicMaterial color="#ff00ff" />
        <pointLight color="#ff00ff" intensity={1} distance={40} />
      </mesh>
    );
  }

  return (
    <mesh ref={meshRef} position={[20, 15, -20]}>
      <sphereGeometry args={[3, 16, 16]} />
      <meshBasicMaterial color="#ffee88" />
      <pointLight color="#ffee88" intensity={0.8} distance={50} />
    </mesh>
  );
};

// Luz de acción (follows active entity)
export const ActionLight: React.FC = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  const { battleEntities, currentTurnIndex, turnOrder, isActionAnimating } = useGameStore();

  useFrame(() => {
    if (!lightRef.current) return;

    if (isActionAnimating && turnOrder && battleEntities) {
      const actorId = turnOrder[currentTurnIndex];
      const actor = battleEntities.find(e => e.id === actorId);
      
      if (actor?.position) {
        // Luz que sigue al actor actuando
        lightRef.current.position.set(actor.position.x + 2, 5, actor.position.y + 2);
        lightRef.current.intensity = 1.5;
      }
    } else {
      lightRef.current.intensity = 0;
    }
  });

  return (
    <pointLight
      ref={lightRef}
      color="#ffffff"
      intensity={0}
      distance={15}
      decay={2}
    />
  );
};

export default LightingSystem;
