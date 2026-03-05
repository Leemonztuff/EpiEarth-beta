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
    return bayer[index] / 16.0;
}

vec3 quantizeColor(vec3 color, float levels, float dither, vec2 pixel) {
    float d = bayer4x4(pixel) * dither;
    return floor((color + d) * levels + 0.5) / levels;
}

vec3 applyPalette(vec3 color) {
    vec3 palette[8];
    palette[0] = vec3(0.05, 0.05, 0.1);
    palette[1] = vec3(0.2, 0.2, 0.3);
    palette[2] = vec3(0.4, 0.4, 0.5);
    palette[3] = vec3(0.35, 0.25, 0.25);
    palette[4] = vec3(0.55, 0.4, 0.35);
    palette[5] = vec3(0.7, 0.6, 0.5);
    palette[6] = vec3(0.25, 0.4, 0.25);
    palette[7] = vec3(0.95, 0.9, 0.8);
    
    float bestDist = 999.0;
    vec3 bestColor = color;
    
    for(int i = 0; i < 8; i++) {
        float dist = distance(color, palette[i]);
        if(dist < bestDist) {
            bestDist = dist;
            bestColor = palette[i];
        }
    }
    
    return bestColor;
}

void main() {
    vec2 pixel = floor(gl_FragCoord.xy / pixelSize) * pixelSize;
    vec2 pixelCoord = pixel / pixelSize;
    
    vec2 uv = pixel / resolution;
    vec3 color = texture2D(tDiffuse, uv).rgb;
    
    color = quantizeColor(color, colorDepth, ditherIntensity, pixelCoord);
    
    if(enablePalette > 0.5) {
        color = applyPalette(color);
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;

export const PixelPostProcess = ({ 
    enabled = true,
    pixelSize = 3, 
    colorDepth = 16, 
    ditherIntensity = 0.4,
    enablePalette = false 
}: { 
    enabled?: boolean;
    pixelSize?: number;
    colorDepth?: number;
    ditherIntensity?: number;
    enablePalette?: boolean;
}) => {
    const { gl, size, scene, camera } = useThree();
    const composerRef = useRef<any>(null);
    
    const renderTarget = useMemo(() => {
        return new THREE.WebGLRenderTarget(
            Math.floor(size.width / pixelSize),
            Math.floor(size.height / pixelSize),
            {
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                format: THREE.RGBAFormat,
                stencilBuffer: false,
                depthBuffer: true
            }
        );
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
                ditherIntensity: { value: ditherIntensity },
                enablePalette: { value: enablePalette ? 1.0 : 0.0 },
                time: { value: 0 }
            },
            vertexShader,
            fragmentShader
        });
    }, []);
    
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
        material.uniforms.ditherIntensity.value = ditherIntensity;
        material.uniforms.enablePalette.value = enablePalette ? 1.0 : 0.0;
        material.uniforms.resolution.value.set(size.width, size.height);
        
        renderTarget.setSize(
            Math.floor(size.width / pixelSize),
            Math.floor(size.height / pixelSize)
        );
    }, [pixelSize, colorDepth, ditherIntensity, enablePalette, size, material, renderTarget]);
    
    useFrame((state) => {
        if (!enabled) return;
        
        material.uniforms.time.value = state.clock.elapsedTime;
        
        const currentTarget = gl.getRenderTarget();
        
        gl.setRenderTarget(renderTarget);
        gl.render(scene, camera);
        
        gl.setRenderTarget(currentTarget);
        
        material.uniforms.tDiffuse.value = renderTarget.texture;
        
        gl.render(postScene, postCamera);
    }, 1);
    
    return null;
};
