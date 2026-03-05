// @ts-nocheck
import React, { useEffect, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float pixelSize;
uniform float colorDepth;
uniform float ditherIntensity;
uniform float enablePalette;
uniform float time;

varying vec2 vUv;

// Bayer matrix para dithering
float bayer4x4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int index = x + y * 4;
    float bayer[16] = float[](
        0.0, 8.0, 2.0, 10.0,
        12.0, 4.0, 14.0, 6.0,
        3.0, 11.0, 1.0, 9.0,
        15.0, 7.0, 13.0, 5.0
    );
    return (bayer[index] / 16.0) - 0.5;
}

void main() {
    // Crear coordenadas de píxel nítidas - sin interpolación
    vec2 pixelCoord = floor(gl_FragCoord.xy / pixelSize);
    
    // Convertir de vuelta a espacio de pantalla para el muestreo
    vec2 samplePos = (pixelCoord + 0.5) * pixelSize;
    vec2 uv = samplePos / resolution;
    
    // Asegurar que estamos dentro de bounds
    uv = clamp(uv, 0.0, 1.0);
    
    // Muestrear el color
    vec3 color = texture2D(tDiffuse, uv).rgb;
    
    // Cuantizar el color a niveles limitados
    float levels = max(colorDepth, 2.0);
    color = floor(color * levels) / levels;
    
    // Aplicar dithering para suavizar gradientes
    if(ditherIntensity > 0.01) {
        float dither = bayer4x4(pixelCoord) * ditherIntensity;
        color = clamp(color + dither * (1.0 / levels), 0.0, 1.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;

export const PixelPostProcess = ({ 
    enabled = true,
    pixelSize = 8, 
    colorDepth = 5, 
    ditherIntensity = 0.8,
    enablePalette = false,
    outlineThickness = 1.2,
    outlineColor = '#1a1a2e',
    enableOutline = true,
    enableDither = true
}: { 
    enabled?: boolean;
    pixelSize?: number;
    colorDepth?: number;
    ditherIntensity?: number;
    enablePalette?: boolean;
    outlineThickness?: number;
    outlineColor?: string;
    enableOutline?: boolean;
    enableDither?: boolean;
}) => {
    const { gl, size, scene, camera } = useThree();
    const composerRef = useRef<any>(null);
    
    const renderTarget = useMemo(() => {
        const target = new THREE.WebGLRenderTarget(
            Math.floor(size.width / pixelSize),
            Math.floor(size.height / pixelSize),
            {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                stencilBuffer: false,
                depthBuffer: true,
                type: THREE.UnsignedByteType
            }
        );
        target.texture.generateMipmaps = false;
        return target;
    }, [size.width, size.height, pixelSize]);
    
    const postScene = useMemo(() => new THREE.Scene(), []);
    const postCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
    
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                resolution: { value: new THREE.Vector2(size.width, size.height) },
                pixelSize: { value: pixelSize },
                colorDepth: { value: colorDepth },
                ditherIntensity: { value: enableDither ? ditherIntensity : 0 },
                enablePalette: { value: enablePalette ? 1.0 : 0.0 },
                time: { value: 0 }
            },
            vertexShader,
            fragmentShader,
            side: THREE.DoubleSide
        });
    }, [size.width, size.height, pixelSize, colorDepth, ditherIntensity, enablePalette, enableDither]);
    
    const quad = useMemo(() => {
        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }, [material]);
    
    useEffect(() => {
        postScene.add(quad);
        return () => {
            postScene.remove(quad);
            renderTarget.dispose();
            material.dispose();
        };
    }, []);
    
    useEffect(() => {
        material.uniforms.pixelSize.value = pixelSize;
        material.uniforms.colorDepth.value = colorDepth;
        material.uniforms.ditherIntensity.value = enableDither ? ditherIntensity : 0;
        material.uniforms.enablePalette.value = enablePalette ? 1.0 : 0.0;
        material.uniforms.resolution.value.set(size.width, size.height);
        
        renderTarget.setSize(
            Math.floor(size.width / pixelSize),
            Math.floor(size.height / pixelSize)
        );
    }, [pixelSize, colorDepth, ditherIntensity, enablePalette, enableDither, size, material, renderTarget]);
    
    useFrame((state) => {
        if (!enabled) return;
        
        material.uniforms.time.value = state.clock.elapsedTime;
        material.uniforms.tDiffuse.value = renderTarget.texture;
        
        const currentTarget = gl.getRenderTarget();
        const currentClearColor = gl.getClearColor();
        const currentClearAlpha = gl.getClearAlpha();
        
        // Renderizar escena a renderTarget
        gl.setRenderTarget(renderTarget);
        gl.clear();
        gl.render(scene, camera);
        
        // Restaurar estado y renderizar post-processing al canvas
        gl.setRenderTarget(currentTarget);
        gl.render(postScene, postCamera);
    }, 1);
    
    return null;
};
