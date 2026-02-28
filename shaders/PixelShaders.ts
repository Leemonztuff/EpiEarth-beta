
// @ts-nocheck
import * as THREE from 'three';

// ============== SHADERS PIXEL ART ==============

// Vertex shader básico
export const pixelVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Fragment shader de iluminación pixelada
export const pixelFragmentShader = `
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
  
  // Función de dithering (patrón de Bayer 4x4)
  float dither4x4(vec2 position) {
    int x = int(mod(position.x, 4.0));
    int y = int(mod(position.y, 4.0));
    int index = x + y * 4;
    float limit = 0.0;
    
    if (index == 0) limit = 0.0625;
    else if (index == 1) limit = 0.5625;
    else if (index == 2) limit = 0.1875;
    else if (index == 3) limit = 0.6875;
    else if (index == 4) limit = 0.8125;
    else if (index == 5) limit = 0.3125;
    else if (index == 6) limit = 0.9375;
    else if (index == 7) limit = 0.4375;
    else if (index == 8) limit = 0.25;
    else if (index == 9) limit = 0.75;
    else if (index == 10) limit = 0.125;
    else if (index == 11) limit = 0.625;
    else if (index == 12) limit = 1.0;
    else if (index == 13) limit = 0.5;
    else if (index == 14) limit = 0.875;
    else limit = 0.375;
    
    return limit;
  }
  
  void main() {
    // Pixelación de coordenadas
    vec2 pixelCoord = floor(vWorldPosition.xy / uPixelSize) * uPixelSize;
    
    // Luz direccional simple
    vec3 lightDir = normalize(uLightPosition - vWorldPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    
    // Aplicar iluminación
    vec3 ambient = uColor * uAmbientIntensity;
    vec3 diffuse = uColor * diff * uLightColor * uLightIntensity;
    
    vec3 finalColor = ambient + diffuse;
    
    // Dithering opcional
    if (uEnableDithering) {
      float ditherValue = dither4x4(pixelCoord);
      finalColor = floor(finalColor * 8.0 + ditherValue) / 8.0;
    }
    
    // Quantización de color (reducir colores)
    finalColor = floor(finalColor * 4.0) / 4.0;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Shader para sprites con outline
export const spriteOutlineShader = `
  uniform sampler2D uTexture;
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
    
    // Outline
    if (uEnableOutline) {
      vec2 texelSize = vec2(1.0) / vec2(textureSize(uTexture, 0));
      float outlineAlpha = 0.0;
      
      for (float x = -1.0; x <= 1.0; x += 1.0) {
        for (float y = -1.0; y <= 1.0; y += 1.0) {
          if (x == 0.0 && y == 0.0) continue;
          
          vec2 offset = vec2(x, y) * uOutlineThickness * texelSize;
          vec4 neighbor = texture2D(uTexture, vUv + offset);
          
          if (neighbor.a < 0.1) {
            outlineAlpha = max(outlineAlpha, 1.0 - length(vec2(x, y)) * 0.5);
          }
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
} = {}) => {
  const {
    color = new THREE.Color(0x888888),
    lightPosition = new THREE.Vector3(10, 20, 10),
    lightColor = new THREE.Color(0xffffff),
    lightIntensity = 1.0,
    ambientIntensity = 0.3,
    pixelSize = 0.1,
    enableDithering = false
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
    fragmentShader: pixelFragmentShader
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
