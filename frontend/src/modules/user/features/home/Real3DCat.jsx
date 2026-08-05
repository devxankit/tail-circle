import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Environment } from '@react-three/drei';

function CatModel() {
  const group = useRef();
  
  // Fetch a public 3D cat model from PMNDRS market so the user doesn't have to upload anything
  const { nodes, materials, animations } = useGLTF('https://vazxmixjzkinpmilleqe.supabase.co/storage/v1/object/public/models/cat/model.gltf');
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Attempt to play the walking animation automatically
    if (actions) {
      // Find an animation clip that sounds like walking or just play the first one
      const walkKey = Object.keys(actions).find(k => k.toLowerCase().includes('walk')) || Object.keys(actions)[0];
      if (walkKey && actions[walkKey]) {
        actions[walkKey].play();
      }
    }
  }, [actions]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      // Pace left and right
      const paceSpeed = 1.0;
      const paceDistance = 1.5;
      const direction = Math.cos(t * paceSpeed);
      
      group.current.position.x = Math.sin(t * paceSpeed) * paceDistance;
      // Rotate 180 degrees depending on pacing direction to face forward
      group.current.rotation.y = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  });

  // Extract the main scene object robustly
  const sceneObject = nodes.Scene || nodes.scene || Object.values(nodes)[0];

  return (
    <group ref={group} dispose={null} position={[0, -1, 0]}>
      <primitive object={sceneObject} scale={1.5} />
    </group>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white/10 rounded-[24px] backdrop-blur-md border border-white/20 p-3 text-center shadow-lg relative z-50">
          <span className="text-2xl mb-1">🐈</span>
          <p className="text-xs text-white font-bold leading-tight">3D Engine Active</p>
          <p className="text-[10px] text-white/80 mt-1">Please drop your photorealistic<br/><b>cat.glb</b><br/> in the `public/` folder.</p>
        </div>
      );
    }
    return this.props.children; 
  }
}

export function Real3DCat() {
  return (
    <div className="w-[180px] h-[180px] absolute -top-[130px] left-0 z-50">
      <ErrorBoundary>
        <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }} alpha={true} className="pointer-events-none">
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
          <Environment preset="city" />
          <Suspense fallback={null}>
            <CatModel />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
