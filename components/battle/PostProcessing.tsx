
// @ts-nocheck
import React from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

// Efectos post-processing profesionales para pixel art
export const PostProcessingEffects: React.FC<{
    enableBloom?: boolean;
    enableVignette?: boolean;
    enableChromatic?: boolean;
    intensity?: number;
}> = ({ 
    enableBloom = true, 
    enableVignette = true,
    enableChromatic = false,
    intensity = 1 
}) => {
    return (
        <EffectComposer>
            {enableBloom && (
                <Bloom 
                    intensity={0.5 * intensity}
                    luminanceThreshold={0.6}
                    luminanceSmoothing={0.9}
                    mipmapBlur
                />
            )}
            {enableVignette && (
                <Vignette
                    offset={0.3}
                    darkness={0.6}
                    blendFunction={BlendFunction.NORMAL}
                />
            )}
            {enableChromatic && (
                <ChromaticAberration
                    offset={[0.001 * intensity, 0.001 * intensity]}
                    blendFunction={BlendFunction.NORMAL}
                />
            )}
        </EffectComposer>
    );
};

// Controlador de efectos según el estado del juego
export const DynamicPostProcessing: React.FC<{
    isBattleActive?: boolean;
    isActing?: boolean;
    dimension?: string;
}> = ({ isBattleActive = false, isActing = false, dimension = 'MORTAL' }) => {
    const isShadowRealm = dimension === 'UPSIDE_DOWN';
    const isEternum = dimension === 'ETERNUM';

    // Efectos más intensos durante acciones
    const intensity = isActing ? 1.5 : 1;
    
    // Efectos especiales por dimensión
    const enableChromatic = isShadowRealm || isActing;
    const enableBloom = true;
    
    // En el Shadow Realm, aumentamos el vignette y reducimos bloom
    const darkness = isShadowRealm ? 0.8 : (isEternum ? 0.5 : 0.6);
    const bloomIntensity = isShadowRealm ? 0.3 : (isEternum ? 0.8 : 0.5);

    return (
        <EffectComposer>
            <Bloom 
                intensity={bloomIntensity * intensity}
                luminanceThreshold={isShadowRealm ? 0.4 : 0.6}
                luminanceSmoothing={0.9}
                mipmapBlur
            />
            <Vignette
                offset={0.3}
                darkness={darkness}
                blendFunction={BlendFunction.NORMAL}
            />
            {enableChromatic && (
                <ChromaticAberration
                    offset={[0.002 * intensity, 0.002 * intensity]}
                    blendFunction={BlendFunction.NORMAL}
                />
            )}
        </EffectComposer>
    );
};

export default PostProcessingEffects;
