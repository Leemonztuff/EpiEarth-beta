
// @ts-nocheck
import * as THREE from 'three';

// ============== SHADERS PIXEL ART ==============

// Vertex shader básico con vertex lighting
export const pixelVertexShader = `
  uniform vec3 uLightPosition;
  uniform float uLightIntensity;
  uniform float uAmbientIntensity;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vLight;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    
    // Vertex lighting
    vec3 lightDir = normalize(uLightPosition - vWorldPosition);
    vLight = max(dot(vNormal, lightDir), 0.0) * uLightIntensity + uAmbientIntensity;
    
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Fragment shader de iluminación pixelada
export const pixelFragmentShader = `
  precision mediump float;
  precision mediump int;

  uniform vec3 uColor;
  uniform vec3 uLightPosition;
  uniform vec3 uLightColor;
  uniform float uLightIntensity;
  uniform float uAmbientIntensity;
  uniform float uPixelSize;
  uniform bool uEnableDithering;
  uniform float uTime;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  varying float vLight;
  
  // Paleta de color estilo D&D retro
  const vec3 palette[8] = vec3[8](
    vec3(0.0, 0.0, 0.0),        // 0 - Negro
    vec3(0.25, 0.25, 0.25),     // 1 - Gris oscuro
    vec3(0.5, 0.5, 0.5),       // 2 - Gris medio
    vec3(0.75, 0.75, 0.75),    // 3 - Gris claro
    vec3(0.5, 0.3, 0.2),       // 4 - Marrón
    vec3(0.7, 0.5, 0.3),       // 5 - Marrón claro
    vec3(0.3, 0.5, 0.3),       // 6 - Verde oscuro
    vec3(0.9, 0.9, 0.7)        // 7 - Piel/amarillo
  );
  
  // Función de cuantización a paleta
  vec3 closestColor(vec3 c) {
    float best = 999.0;
    vec3 bestColor = palette[0];
    for (int i = 0; i < 8; i++) {
      float d = distance(c, palette[i]);
      if (d < best) {
        best = d;
        bestColor = palette[i];
      }
    }
    return bestColor;
  }
  
  // Bayer matrix 4x4 optimizada
  float bayer4x4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int index = x + y * 4;
    float bayer[16] = float[16](
      0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0,
      12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
      3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0,
      15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
    );
    return bayer[index];
  }
  
  void main() {
    // Pixelación en pantalla para efecto real
    vec2 pixel = floor(gl_FragCoord.xy / uPixelSize) * uPixelSize;
    
    // Usar vertex lighting
    vec3 finalColor = uColor * vLight * uLightColor;
    
    // Dithering sin branching
    float ditherValue = mix(0.0, bayer4x4(pixel), float(uEnableDithering));
    finalColor = floor(finalColor * 8.0 + ditherValue) / 8.0;
    
    // Cuantización a paleta
    finalColor = closestColor(finalColor);
    
    // Fog pixelado
    float dist = length(vWorldPosition - cameraPosition);
    float fog = smoothstep(20.0, 60.0, dist);
    finalColor = mix(finalColor, vec3(0.05, 0.05, 0.08), fog);
    
    // Shadow fake barato
    float shadow = clamp(vNormal.y, 0.2, 1.0);
    finalColor *= shadow;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Shader para sprites con outline
export const spriteOutlineShader = `
  precision mediump float;
  precision mediump int;

  uniform sampler2D uTexture;
  uniform vec2 uTextureSize;
  uniform vec3 uOutlineColor;
  uniform float uOutlineThickness;
  uniform bool uEnableOutline;
  uniform float uTime;
  uniform bool uHighlight;
  uniform vec3 uHighlightColor;
  
  varying vec2 vUv;
  
  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    if (texColor.a < 0.1) {
      discard;
    }
    
    vec3 finalColor = texColor.rgb;
    float alpha = texColor.a;
    
    // Outline con offsets fijos
    if (uEnableOutline) {
      vec2 texelSize = 1.0 / uTextureSize;
      float outlineAlpha = 0.0;
      
      vec2 offsets[8] = vec2[8](
        vec2(-1.0, -1.0), vec2(0.0, -1.0), vec2(1.0, -1.0),
        vec2(-1.0, 0.0),                     vec2(1.0, 0.0),
        vec2(-1.0, 1.0),  vec2(0.0, 1.0),  vec2(1.0, 1.0)
      );
      
      for (int i = 0; i < 8; i++) {
        vec2 offset = offsets[i] * uOutlineThickness * texelSize;
        vec4 neighbor = texture2D(uTexture, vUv + offset);
        
        if (neighbor.a < 0.1) {
          outlineAlpha = max(outlineAlpha, 1.0 - length(offsets[i]) * 0.5);
        }
      }
      
      if (outlineAlpha > 0.0 && alpha < 0.9) {
        finalColor = mix(finalColor, uOutlineColor, outlineAlpha);
        alpha = max(alpha, outlineAlpha);
      }
    }
    
    // Highlight (selección)
    if (uHighlight) {
      float pulse = sin(uTime * 4.0) * 0.3 + 0.7;
      finalColor = mix(finalColor, uHighlightColor, 0.3 * pulse);
    }
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Shader de terreno con textura procedural
export const terrainShader = `
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform float uHeight;
  uniform float uMaxHeight;
  uniform float uTime;
  uniform bool uIsSelected;
  uniform vec3 uSelectionColor;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  // Ruido simple
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  void main() {
    // Mezcla de colores según altura
    float heightFactor = vWorldPosition.y / max(uMaxHeight, 1.0);
    
    vec3 baseColor;
    if (heightFactor < 0.3) {
      baseColor = mix(uColor1, uColor2, heightFactor / 0.3);
    } else if (heightFactor < 0.7) {
      baseColor = mix(uColor2, uColor3, (heightFactor - 0.3) / 0.4);
    } else {
      baseColor = uColor3;
    }
    
    // Agregar variación de ruido
    float n = noise(vWorldPosition.xz * 2.0) * 0.15;
    baseColor += vec3(n * 0.5, n * 0.3, n * 0.1);
    
    // Selección highlight
    if (uIsSelected) {
      float pulse = sin(uTime * 3.0) * 0.2 + 0.8;
      baseColor = mix(baseColor, uSelectionColor, 0.4 * pulse);
    }
    
    // Simple shading
    vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
    float diff = max(dot(vNormal, lightDir), 0.0) * 0.5 + 0.5;
    baseColor *= diff;
    
    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

// Shader de efecto de daño (flash rojo)
export const damageFlashShader = `
  uniform sampler2D uTexture;
  uniform float uDamageFlash;
  uniform float uTime;
  
  varying vec2 vUv;
  
  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Flash rojo
    vec3 flashColor = vec3(1.0, 0.2, 0.2);
    vec3 finalColor = mix(texColor.rgb, flashColor, uDamageFlash * 0.7);
    
    // Shaking
    float shake = uDamageFlash * 0.02;
    finalColor += vec3(shake);
    
    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

// Material builder helper
export const createPixelMaterial = (options: {
  color?: THREE.Color;
  lightPosition?: THREE.Vector3;
  lightColor?: THREE.Color;
  lightIntensity?: number;
  ambientIntensity?: number;
  pixelSize?: number;
  enableDithering?: boolean;
  transparent?: boolean;
  depthWrite?: boolean;
  side?: THREE.Side;
} = {}) => {
  const {
    color = new THREE.Color(0x888888),
    lightPosition = new THREE.Vector3(10, 20, 10),
    lightColor = new THREE.Color(0xffffff),
    lightIntensity = 1.0,
    ambientIntensity = 0.3,
    pixelSize = 0.1,
    enableDithering = false,
    transparent = false,
    depthWrite = true,
    side = THREE.FrontSide
  } = options;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uLightPosition: { value: lightPosition },
      uLightColor: { value: lightColor },
      uLightIntensity: { value: lightIntensity },
      uAmbientIntensity: { value: ambientIntensity },
      uPixelSize: { value: pixelSize },
      uEnableDithering: { value: enableDithering },
      uTime: { value: 0 }
    },
    vertexShader: pixelVertexShader,
    fragmentShader: pixelFragmentShader,
    transparent,
    depthWrite,
    side
  });
};

// Post-processing: Effect Composer para pixel art
export const createPostProcessing = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => {
  // Este es un placeholder - en producción usarías @react-three/postprocessing
  return {
    render: () => renderer.render(scene, camera as THREE.Camera),
    dispose: () => {}
  };
};
