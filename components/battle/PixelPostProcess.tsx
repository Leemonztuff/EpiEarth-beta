// @ts-nocheck
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';

const PIXEL_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const PIXEL_FRAGMENT_SHADER = `
precision mediump float;

uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 resolution;
uniform float pixelSize;
uniform float time;
uniform float colorDepth;
uniform float ditherIntensity;
uniform float outlineThickness;
uniform vec3 outlineColor;
uniform float enableOutline;
uniform float enableDither;
uniform float enablePalette;
uniform float near;
uniform float far;

varying vec2 vUv;

float getDepth(vec2 uv) {
    float depth = texture2D(tDepth, uv).r;
    float viewZ = (near * far) / ((far - near) * depth - far);
    return viewZ;
}

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

float bayer2x2(vec2 p) {
    int x = int(mod(p.x, 2.0));
    int y = int(mod(p.y, 2.0));
    int index = x + y * 2;
    float bayer[4] = float[](
        0.0, 3.0,
        2.0, 1.0
    );
    return bayer[index] / 4.0;
}

vec3 quantizeColor(vec3 color, float levels) {
    return floor(color * levels + 0.5) / levels;
}

vec3 quantizeColorDither(vec3 color, vec2 pixelPos, float levels) {
    float dither = bayer4x4(pixelPos) * ditherIntensity;
    return floor((color + dither) * levels) / levels;
}

vec3 applyPalette(vec3 color) {
    vec3 palette[8];
    palette[0] = vec3(0.0, 0.0, 0.0);
    palette[1] = vec3(0.25, 0.25, 0.25);
    palette[2] = vec3(0.5, 0.5, 0.5);
    palette[3] = vec3(0.5, 0.35, 0.35);
    palette[4] = vec3(0.7, 0.55, 0.45);
    palette[5] = vec3(0.85, 0.75, 0.65);
    palette[6] = vec3(0.35, 0.5, 0.35);
    palette[7] = vec3(1.0, 0.95, 0.85);
    
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
    vec2 uv = pixel / resolution;
    
    vec3 color = texture2D(tDiffuse, uv).rgb;
    float depth = getDepth(vUv);
    
    if(enableDither > 0.5) {
        color = quantizeColorDither(color, pixel / pixelSize, colorDepth);
    } else {
        color = quantizeColor(color, colorDepth);
    }
    
    if(enablePalette > 0.5) {
        color = applyPalette(color);
    }
    
    if(enableOutline > 0.5) {
        float outline = 0.0;
        float depthCenter = getDepth(vUv);
        
        vec2 offsets[8];
        offsets[0] = vec2(-outlineThickness, 0.0);
        offsets[1] = vec2(outlineThickness, 0.0);
        offsets[2] = vec2(0.0, -outlineThickness);
        offsets[3] = vec2(0.0, outlineThickness);
        offsets[4] = vec2(-outlineThickness, -outlineThickness);
        offsets[5] = vec2(outlineThickness, -outlineThickness);
        offsets[6] = vec2(-outlineThickness, outlineThickness);
        offsets[7] = vec2(outlineThickness, outlineThickness);
        
        for(int i = 0; i < 8; i++) {
            vec2 sampleUv = vUv + offsets[i] / resolution;
            float sampleDepth = getDepth(sampleUv);
            float depthDiff = abs(depthCenter - sampleDepth);
            if(depthDiff > 0.5) {
                outline = 1.0;
                break;
            }
        }
        
        float colorOutline = 0.0;
        vec3 colorCenter = texture2D(tDiffuse, vUv).rgb;
        for(int i = 0; i < 4; i++) {
            vec2 sampleUv = vUv + offsets[i] * 2.0 / resolution;
            vec3 sampleColor = texture2D(tDiffuse, sampleUv).rgb;
            float colorDiff = distance(colorCenter, sampleColor);
            if(colorDiff > 0.3) {
                colorOutline = 1.0;
                break;
            }
        }
        
        if(outline > 0.5 || colorOutline > 0.5) {
            color = mix(color, outlineColor, 0.8);
        }
    }
    
    gl_FragColor = vec4(color, 1.0);
}
`;

interface PixelPostProcessProps {
    pixelSize?: number;
    colorDepth?: number;
    ditherIntensity?: number;
    outlineThickness?: number;
    outlineColor?: string;
    enableOutline?: boolean;
    enableDither?: boolean;
    enablePalette?: boolean;
}

export const PixelPostProcess: React.FC<PixelPostProcessProps> = ({
    pixelSize = 4,
    colorDepth = 16,
    ditherIntensity = 0.5,
    outlineThickness = 1.5,
    outlineColor = '#000000',
    enableOutline = true,
    enableDither = true,
    enablePalette = false
}) => {
    const { gl, scene, camera, size } = useThree();
    
    const renderTarget = useRef<THREE.WebGLRenderTarget>();
    const depthRenderTarget = useRef<THREE.WebGLRenderTarget>();
    const postScene = useRef(new THREE.Scene());
    const postCamera = useRef(new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
    const quad = useRef<THREE.Mesh>();
    const material = useRef<THREE.ShaderMaterial>();
    
    const outlineColorVec = useMemo(() => new THREE.Color(outlineColor), [outlineColor]);
    
    useEffect(() => {
        const rtOptions = {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            stencilBuffer: false,
            depthBuffer: true
        };
        
        renderTarget.current = new THREE.WebGLRenderTarget(
            size.width / pixelSize,
            size.height / pixelSize,
            rtOptions
        );
        
        depthRenderTarget.current = new THREE.WebGLRenderTarget(
            size.width / pixelSize,
            size.height / pixelSize,
            {
                ...rtOptions,
                depthTexture: new THREE.DepthTexture()
            }
        );
        
        const pixelMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                tDepth: { value: null },
                resolution: { value: new THREE.Vector2(size.width, size.height) },
                pixelSize: { value: pixelSize },
                time: { value: 0 },
                colorDepth: { value: colorDepth },
                ditherIntensity: { value: ditherIntensity },
                outlineThickness: { value: outlineThickness },
                outlineColor: { value: outlineColorVec },
                enableOutline: { value: enableOutline ? 1.0 : 0.0 },
                enableDither: { value: enableDither ? 1.0 : 0.0 },
                enablePalette: { value: enablePalette ? 1.0 : 0.0 },
                near: { value: camera.near },
                far: { value: camera.far }
            },
            vertexShader: PIXEL_VERTEX_SHADER,
            fragmentShader: PIXEL_FRAGMENT_SHADER
        });
        
        material.current = pixelMaterial;
        
        const quadGeometry = new THREE.PlaneGeometry(2, 2);
        quad.current = new THREE.Mesh(quadGeometry, pixelMaterial);
        postScene.current.add(quad.current);
        
        return () => {
            renderTarget.current?.dispose();
            depthRenderTarget.current?.dispose();
        };
    }, [pixelSize, size, camera]);
    
    useEffect(() => {
        if (material.current) {
            material.current.uniforms.resolution.value.set(size.width, size.height);
            material.current.uniforms.pixelSize.value = pixelSize;
            material.current.uniforms.colorDepth.value = colorDepth;
            material.current.uniforms.ditherIntensity.value = ditherIntensity;
            material.current.uniforms.outlineThickness.value = outlineThickness;
            material.current.uniforms.outlineColor.value = outlineColorVec;
            material.current.uniforms.enableOutline.value = enableOutline ? 1.0 : 0.0;
            material.current.uniforms.enableDither.value = enableDither ? 1.0 : 0.0;
            material.current.uniforms.enablePalette.value = enablePalette ? 1.0 : 0.0;
        }
        
        if (renderTarget.current && depthRenderTarget.current) {
            renderTarget.current.setSize(size.width / pixelSize, size.height / pixelSize);
            depthRenderTarget.current.setSize(size.width / pixelSize, size.height / pixelSize);
        }
    }, [size, pixelSize, colorDepth, ditherIntensity, outlineThickness, outlineColorVec, enableOutline, enableDither, enablePalette]);
    
    useFrame((state) => {
        if (!renderTarget.current || !depthRenderTarget.current || !material.current) return;
        
        const time = state.clock.elapsedTime;
        material.current.uniforms.time.value = time;
        
        const originalRenderTarget = gl.getRenderTarget();
        
        depthRenderTarget.current.depthTexture.format = THREE.DepthFormat;
        depthRenderTarget.current.depthTexture.type = THREE.UnsignedShortType;
        
        gl.setRenderTarget(depthRenderTarget.current);
        gl.render(scene, camera);
        
        material.current.uniforms.tDiffuse.value = depthRenderTarget.current.texture;
        material.current.uniforms.tDepth.value = depthRenderTarget.current.depthTexture;
        material.current.uniforms.near.value = camera.near;
        material.current.uniforms.far.value = camera.far;
        
        gl.setRenderTarget(null);
        gl.render(postScene.current, postCamera.current);
        
        gl.setRenderTarget(originalRenderTarget);
    }, 1);
    
    return null;
};
