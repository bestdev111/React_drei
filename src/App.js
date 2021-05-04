import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, Sky, Sphere} from '@react-three/drei'
import { useRender } from 'react-three-fiber'
import * as THREE from 'three'
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader';
import {Cloud} from '@react-three/drei';
import { withKnobs, number, SET_OPTIONS } from '@storybook/addon-knobs'

function Horse(props) {
  const group = useRef()
  const horse = useLoader(FBXLoader, 'horse.fbx');
  let mixer;
  useEffect(() => {
    if (horse) {
      mixer = new THREE.AnimationMixer( horse );
      const fps = 24;
      const playClipIndex = 2;
      const startFrame = playClipIndex ? horse.animations[0].duration * fps : 0;
      
      const clip = horse.animations[playClipIndex];
      const endFrame = startFrame + Math.floor(clip.duration * fps);
      const subClip = THREE.AnimationUtils.subclip(clip, 'Pure', startFrame, endFrame, 24);
      const action = mixer.clipAction( subClip );
      action.play();
    }
  }, [horse]);

  useFrame((_, delta) => {
    mixer?.update(delta);
  })

  return (
    <group
      ref={group}
      {...props}
      dispose={null}
    >
      <primitive object={horse} />
    </group>
  )
}

const Plane = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow args={[100, 100, 4, 4]} color={0x404873}>
    <planeGeometry attach="geometry" args={[10000, 10000]} />
    <meshPhysicalMaterial attach="material" color="0x404873" />
 </mesh>
)

export default function App() {
  return (
    <Canvas
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true
        gl.shadowMap.type = THREE.PCFSoftShadowMap
      }}>
      <CanvasContent/>
    </Canvas>
  )
}
function Rain() {
  const rainCount = 10000;
  const ref = useRef()
  const { vec, transform, positions, distances } = useMemo(() => {
    const vec = new THREE.Vector3()
    const transform = new THREE.Matrix4()

    // Precompute randomized initial positions
    const positions = [...Array(rainCount)].map((_, i) => {
      const x = THREE.MathUtils.randFloatSpread( 6000);
      const y = THREE.MathUtils.randFloatSpread( 6000 );
      const z = THREE.MathUtils.randFloatSpread( 6000 );
      const position = new THREE.Vector3(x, y, z)
      return position
    })

    // Precompute initial distances with octagonal offset
    const right = new THREE.Vector3(0, 1, 0)
    const distances = positions.map((pos) => {
      return pos.length() + Math.cos(pos.angleTo(right) * 8) * 0.9
    })
    return { vec, transform, positions, distances }
  }, [])
  useFrame(({ clock }) => {
    for (let i = 0; i < rainCount; ++i) {
      var y = positions[i].y;
      y -= Math.random() * 30;
      if(y < 0) y = 400;
      positions[i].y = y;

      const dist = distances[i]

      // Distance affects the wave phase
      const t = clock.elapsedTime - dist / 25

      // Oscillates between -0.4 and +0.4
      const wave = 0.1

      // Scale initial position by our oscillator
      vec.copy(positions[i])

      // Apply the Vector3 to a Matrix4
      transform.setPosition(vec)

      // Update Matrix4 for this instance
      ref.current.setMatrixAt(i, transform)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[null, null, 10000]}>
      <circleBufferGeometry args={[0.2]} />
      <meshBasicMaterial />
    </instancedMesh>
  )
}

function Flash() {
  const [power, setPower] = useState(0);
  const [position, setPosition] = useState([0, 10000, 0]);
  const [color, setColor] = useState([0x062d89]); 
  useEffect(() => {
    setInterval(() => {
      if(Math.random() > 0.99) {
        setPower(30 + Math.random() * 80);
        setColor([0x062d89]);
        
      }
    }, 30);  
  }, []);
  
  useEffect(() => {
    if (power >= 20) {
      setTimeout(() => {
        setPower(0);
        setColor([0xcccccc]);
      }, 30);
    }
  }, [power]);
  
  return <pointLight position={position} power={power} color={0x062d89} vec></pointLight>;
}

// function CloudTemplate() {
//     return ([
//       <Cloud position={[-40, 500, 0]} args={[60, 0.2]} />,
//       <Cloud position={[-20, 1000, 0]} args={[60, 0.2]} />,
//       <Cloud position={[-30, 500, 0]} args={[60, 0.2]} />,
//       <Cloud position={[-40, 500, 0]} args={[60, 0.2]} />,
//       <Cloud position={[-50, 500, 0]} args={[60, 0.2]} />,
//       <Cloud position={[-30, 500, 0]} args={[60, 0.2]} />,
//       <Cloud position={[-20, 500, 0]} args={[60, 0.2]} />,
//       <Cloud position={[-40, 500, 0]} args={[60, 0.2]} />,
//     ])
// }
  
function CanvasContent(prps) {
  const camera = useThree((state) => state.camera)
  // NOT the right way to do it...
  const [inclination, setInclination] = React.useState(0)
  camera.position.set( 500, 300, 100 );
  camera.far = 2000;
  camera.near = 1;
  camera.fov = 45;
  camera.aspec = window.innerWidth / window.innerHeight;
  camera.rotation.z -= 0.03;
  const scene = useRef();
  useFrame(({ gl }) => void ((gl.autoClear = true), gl.render(scene.current, camera)), 20)
  return (<scene ref={scene}>
    <ambientLight intensity={0.4} color={0x003366} />
    <OrbitControls />
    <Suspense fallback={null}>
      <Horse />
      <Flash 
      />
      <Rain />
      <Sky
        distance={1000000000}
        turbidity={number('Turbidity', 8, { range: true, max: 10, step: 0.1 })}
        rayleigh={number('Rayleigh', 10, { range: true, max: 10, step: 0.1 })}
        mieCoefficient={number('mieCoefficient', 0.027, { range: true, max: 0.1, step: 0.001 })}
        mieDirectionalG={number('mieDirectionalG', 0.99, { range: true, max: 1, step: 0.01 })}
        inclination={inclination}
        azimuth={number('Azimuth', 0.1, { range: true, max: 1, step: 0.01 })}
        sunPosition={[number('Pos X', -120), number('Pos Y', -500), number('Pos Z', -120)]}
      />
      <Plane />
    </Suspense>
  </scene>);
}

