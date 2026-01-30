import React, { useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useControls, button, folder } from 'leva';
import { sdSphere, sdCapsule, opSmoothUnion, noise3D } from '../utils/sdfUtils';

// --- Fire Palette ---
const C_BLACK = new THREE.Color('#050101');  // Charcoal / Void
const C_DARK_RED = new THREE.Color('#420000'); // Deep Red base
const C_RED = new THREE.Color('#ff1a00');    // Main fire red
const C_ORANGE = new THREE.Color('#ff8800'); // Bright Orange
const C_YELLOW = new THREE.Color('#ffdd00'); // Yellow
const C_WHITE = new THREE.Color('#ffffff');  // Core White

const tempColor = new THREE.Color();

// --- Presets Data ---
const PRESETS = {
  Standard: {
    resolution: 40,
    cubeBaseSize: 0.9,
    sphereRadius: 1.2,
    capsuleHeight: 2.5,
    capsuleRadius: 0.6,
    blend: 0.8,
    threshold: 0,
    noiseScale: 0.5,
    noiseSpeed: 0.5,
    noiseStrength: 0.3,
    emissiveIntensity: 2.0,
    heatHeightInfluence: 0.6,
    heatDepthInfluence: 0.5,
  },
  Inferno: {
    resolution: 48,
    cubeBaseSize: 1.0,
    sphereRadius: 1.5,
    capsuleHeight: 4.5,
    capsuleRadius: 1.0,
    blend: 1.2,
    threshold: -0.2,
    noiseScale: 0.4,
    noiseSpeed: 1.2,
    noiseStrength: 0.6,
    emissiveIntensity: 3.0,
    heatHeightInfluence: 0.8,
    heatDepthInfluence: 0.8,
  },
  Candle: {
    resolution: 50,
    cubeBaseSize: 0.8,
    sphereRadius: 0.6,
    capsuleHeight: 1.2,
    capsuleRadius: 0.4,
    blend: 0.6,
    threshold: 0.1,
    noiseScale: 1.5,
    noiseSpeed: 0.2,
    noiseStrength: 0.1,
    emissiveIntensity: 1.2,
    heatHeightInfluence: 1.0,
    heatDepthInfluence: 0.3,
  },
  Plasma: {
    resolution: 36,
    cubeBaseSize: 1.2,
    sphereRadius: 1.8,
    capsuleHeight: 0.5,
    capsuleRadius: 1.5,
    blend: 0.2,
    threshold: -0.5,
    noiseScale: 2.0,
    noiseSpeed: 0.3,
    noiseStrength: 0.5,
    emissiveIntensity: 5.0,
    heatHeightInfluence: 0.2,
    heatDepthInfluence: 1.5,
  },
  Spirit: {
    resolution: 42,
    cubeBaseSize: 0.7,
    sphereRadius: 0.8,
    capsuleHeight: 3.5,
    capsuleRadius: 0.5,
    blend: 1.0,
    threshold: 0.1,
    noiseScale: 0.8,
    noiseSpeed: 1.5,
    noiseStrength: 0.4,
    emissiveIntensity: 1.5,
    heatHeightInfluence: 1.2,
    heatDepthInfluence: 0.2,
  },
  Glitch: {
    resolution: 44,
    cubeBaseSize: 1.1,
    sphereRadius: 1.2,
    capsuleHeight: 2.0,
    capsuleRadius: 1.0,
    blend: 0.1,
    threshold: -0.1,
    noiseScale: 2.0,
    noiseSpeed: 0.1,
    noiseStrength: 0.3,
    emissiveIntensity: 2.5,
    heatHeightInfluence: 0.5,
    heatDepthInfluence: 0.5,
  },
  Sun: {
    resolution: 40,
    cubeBaseSize: 1.0,
    sphereRadius: 2.2,
    capsuleHeight: 0.1,
    capsuleRadius: 0.1,
    blend: 0.5,
    threshold: -0.5,
    noiseScale: 0.2,
    noiseSpeed: 0.2,
    noiseStrength: 0.1,
    emissiveIntensity: 8.0,
    heatHeightInfluence: 0.0,
    heatDepthInfluence: 2.0,
  },
  Embers: {
    resolution: 50,
    cubeBaseSize: 0.6,
    sphereRadius: 1.0,
    capsuleHeight: 3.0,
    capsuleRadius: 0.8,
    blend: 0.5,
    threshold: -0.4,
    noiseScale: 1.0,
    noiseSpeed: 0.8,
    noiseStrength: 1.0,
    emissiveIntensity: 4.0,
    heatHeightInfluence: 1.5,
    heatDepthInfluence: 0.8,
  }
};

const VoxelFlame: React.FC = () => {
  // --- UI Controls ---
  // We use the functional API of useControls to get the 'set' function
  const [values, set] = useControls('Voxel Engine', () => ({
    Presets: folder({
      'Standard Fire': button(() => set(PRESETS.Standard)),
      'Raging Inferno': button(() => set(PRESETS.Inferno)),
      'Candle Light': button(() => set(PRESETS.Candle)),
      'Plasma Blob': button(() => set(PRESETS.Plasma)),
      'Spirit Wisp': button(() => set(PRESETS.Spirit)),
      'Digital Glitch': button(() => set(PRESETS.Glitch)),
      'Dying Sun': button(() => set(PRESETS.Sun)),
      'Wild Embers': button(() => set(PRESETS.Embers)),
    }, { collapsed: false }),
    
    resolution: { value: 40, min: 10, max: 80, step: 2, label: 'Grid Resolution' },
    cubeBaseSize: { value: 0.9, min: 0.1, max: 1.5, step: 0.1, label: 'Cube Scale' },
    sphereRadius: { value: 1.2, min: 0.1, max: 3.0, step: 0.1, label: 'Sphere Radius' },
    capsuleHeight: { value: 2.5, min: 0.1, max: 6.0, step: 0.1, label: 'Capsule Height' },
    capsuleRadius: { value: 0.6, min: 0.1, max: 2.0, step: 0.1, label: 'Capsule Radius' },
    blend: { value: 0.8, min: 0.01, max: 2.0, step: 0.01, label: 'Smooth Blend' },
    threshold: { value: 0, min: -2, max: 1, step: 0.01, label: 'Cut Threshold' },
    animate: { value: true, label: 'Animate Noise' },
    noiseScale: { value: 0.5, min: 0.1, max: 2.0, step: 0.1, label: 'Noise Freq' },
    noiseSpeed: { value: 0.5, min: 0.1, max: 2.0, step: 0.1, label: 'Noise Speed' },
    noiseStrength: { value: 0.3, min: 0.0, max: 1.0, step: 0.05, label: 'Noise Amp' },
    emissiveIntensity: { value: 2.0, min: 0.0, max: 10.0, step: 0.1, label: 'Glow Intensity' },
    heatHeightInfluence: { value: 0.6, min: 0.0, max: 2.0, step: 0.1, label: 'Heat: Height' },
    heatDepthInfluence: { value: 0.5, min: 0.0, max: 2.0, step: 0.1, label: 'Heat: Core' },
  }));

  const {
    resolution,
    sphereRadius,
    capsuleHeight,
    capsuleRadius,
    blend,
    threshold,
    animate,
    noiseScale,
    noiseSpeed,
    noiseStrength,
    cubeBaseSize,
    emissiveIntensity,
    heatHeightInfluence,
    heatDepthInfluence
  } = values;

  // InstancedMesh Reference
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Reusable vector for calculations
  const p = useMemo(() => new THREE.Vector3(), []);

  // Grid bounds
  const bounds = 8;

  // Shader customization to drive emissive strength by instance color
  // This makes the white/yellow parts glow, but the black/red parts stay dark
  const onBeforeCompile = useCallback((shader: THREE.Shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      // Multiply the global emissive intensity by the voxel's color (vColor).
      // vColor comes from the instanceColor attribute.
      // This ensures 'hot' (bright) voxels glow, while 'cold' (dark) voxels do not.
      #ifdef USE_INSTANCING_COLOR
        totalEmissiveRadiance *= vColor.rgb;
      #endif
      `
    );
  }, []);
  
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = animate ? state.clock.getElapsedTime() : 0;
    const step = bounds / resolution;
    const halfRes = resolution / 2;
    
    let instanceId = 0;

    // Center the grid loop around 0
    for (let x = 0; x < resolution; x++) {
      for (let y = 0; y < resolution; y++) {
        for (let z = 0; z < resolution; z++) {
          
          const posX = (x - halfRes) * step;
          const posY = (y - halfRes) * step;
          const posZ = (z - halfRes) * step;

          p.set(posX, posY, posZ);

          // 1. Calculate Base SDF Shape
          const dSphere = sdSphere(p, sphereRadius);
          
          const pCapsule = p.clone();
          pCapsule.y -= capsuleHeight * 0.4; 
          const dCapsule = sdCapsule(pCapsule, capsuleHeight, capsuleRadius);

          let dist = opSmoothUnion(dSphere, dCapsule, blend);

          // 2. Add Noise
          if (noiseStrength > 0) {
            const n = noise3D(
                posX * noiseScale, 
                posY * noiseScale - time * noiseSpeed, 
                posZ * noiseScale + time * noiseSpeed * 0.5
            );
            dist += n * noiseStrength;
          }

          // 3. Threshold Check
          if (dist < threshold) {
            dummy.position.set(posX, posY, posZ);
            
            // 4. Calculate Scale based on depth (proximity to core)
            // depth is how far 'inside' the shape we are
            const depth = threshold - dist; 
            
            let scaleFactor = THREE.MathUtils.clamp(depth * 1.5, 0, 1);
            scaleFactor = Math.pow(scaleFactor, 0.5); 
            const finalScale = scaleFactor * step * cubeBaseSize;

            dummy.scale.set(finalScale, finalScale, finalScale);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(instanceId, dummy.matrix);
            
            // 5. Advanced Color Logic
            // We mix Height (Y) and Depth (dist) to determine "Heat".
            // - Height: Higher up is brighter (classic matchstick flame look)
            // - Depth: Deeper inside is hotter (core self-illumination)
            
            const minH = -2.0;
            const maxH = 3.0;
            const heightNorm = THREE.MathUtils.mapLinear(posY, minH, maxH, 0, 1);
            const heightFactor = THREE.MathUtils.clamp(heightNorm, 0, 1);
            
            // Depth factor: 0.0 at surface, 1.0 deep inside
            const depthFactor = THREE.MathUtils.clamp(depth * 1.0, 0, 1);

            // "Heat" determines position on the color gradient.
            // A mix of height and depth. 
            // Base contributes less to heat (darker), Top contributes more.
            // Core contributes heavily to heat.
            const heat = THREE.MathUtils.clamp(heightFactor * heatHeightInfluence + depthFactor * heatDepthInfluence, 0, 1.2);

            // Piecewise Gradient Mapping
            if (heat < 0.2) {
              tempColor.copy(C_BLACK).lerp(C_DARK_RED, heat / 0.2);
            } else if (heat < 0.4) {
              tempColor.copy(C_DARK_RED).lerp(C_RED, (heat - 0.2) / 0.2);
            } else if (heat < 0.6) {
              tempColor.copy(C_RED).lerp(C_ORANGE, (heat - 0.4) / 0.2);
            } else if (heat < 0.85) {
              tempColor.copy(C_ORANGE).lerp(C_YELLOW, (heat - 0.6) / 0.25);
            } else {
              // Core heat
              tempColor.copy(C_YELLOW).lerp(C_WHITE, Math.min((heat - 0.85) / 0.35, 1));
            }

            meshRef.current.setColorAt(instanceId, tempColor);
            instanceId++;
          }
        }
      }
    }

    meshRef.current.count = instanceId;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, resolution * resolution * resolution]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      {/* 
        MeshStandardMaterial with Custom Emissive Logic 
        - color: white (so instance color tints it fully)
        - emissive: orange (base glow color)
        - emissiveIntensity: controls max brightness
        - onBeforeCompile: injects the logic to multiply emissive by the instance color
      */}
      <meshStandardMaterial 
        color="#ffffff" 
        emissive="#ff5500"
        emissiveIntensity={emissiveIntensity}
        roughness={0.8} 
        metalness={0.1}
        onBeforeCompile={onBeforeCompile}
      />
    </instancedMesh>
  );
};

export default VoxelFlame;