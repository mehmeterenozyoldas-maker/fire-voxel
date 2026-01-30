import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stats } from '@react-three/drei';
import VoxelFlame from './components/VoxelFlame';
import Recorder from './components/Recorder';

function App() {
  return (
    <div className="w-full h-full relative bg-gray-100">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Voxel Flame</h1>
        <p className="text-sm text-gray-600 max-w-xs mt-1">
          Real-time Signed Distance Field (SDF) voxelizer. 
          Use the controls to shape the fire.
        </p>
      </div>

      <Canvas
        shadows
        camera={{ position: [8, 6, 8], fov: 40 }}
        dpr={[1, 2]} // Handle high DPI screens
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }} // preserveDrawingBuffer enables reliable screen capture
      >
        <color attach="background" args={['#e0e0e0']} />
        
        {/* Environment & Lighting */}
        <ambientLight intensity={0.4} />
        
        <directionalLight 
          castShadow 
          position={[5, 10, 5]} 
          intensity={1.5} 
          shadow-mapSize={[2048, 2048]} // Higher res shadows
          shadow-bias={-0.0001} // Reduce shadow acne
          shadow-camera-near={0.1}
          shadow-camera-far={30}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        <Environment preset="city" />

        <Suspense fallback={null}>
          <group position={[0, -2, 0]}> {/* Center the model visually */}
            <VoxelFlame />
          </group>
          {/* Ground Plane for Shadows */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <shadowMaterial transparent opacity={0.2} />
          </mesh>
        </Suspense>

        <Recorder />
        <OrbitControls makeDefault minDistance={5} maxDistance={30} target={[0, 0, 0]} />
        <Stats className="!left-auto !right-0 !top-auto !bottom-0" />
      </Canvas>
      
      <div className="absolute bottom-4 left-4 text-xs text-gray-400">
        Parametric Voxelizer | R3F + InstancedMesh
      </div>
    </div>
  );
}

export default App;