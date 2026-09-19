'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Text } from '@react-three/drei';
import { useRef, useMemo, type ReactNode } from 'react';
import { useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Group } from 'three';

/* ============================================================
   Inline 3D moments — small standalone r3f scenes that slot into
   a page at specific story beats. Each one is opt-in: you choose
   which moment you want by passing `kind`.
   ============================================================ */

interface Inline3DProps {
  kind: 'comment-cluster' | 'neural-net' | 'floating-tokens';
  /** Whether to react to scroll inside the canvas. */
  scrollDriven?: boolean;
  /** Optional extra className on the wrapper. */
  className?: string;
  /** Optional scene background override. */
  background?: 'transparent' | 'soft';
}

/* ---------- Comment cluster ----------------------------------- */
/* A swirling cloud of pastel "comment" chips — the literal visual
   metaphor of a YouTube comment section becoming readable. */

function CommentChip({
  position,
  color,
  scale = 1,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
}) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3 + position[0]) * 0.12;
    ref.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.25 + position[1]) * 0.08;
  });
  return (
    <group position={position} scale={scale} ref={ref}>
      <mesh castShadow>
        <boxGeometry args={[1.6, 0.6, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <boxGeometry args={[1.4, 0.45, 0.04]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} metalness={0} transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

function CommentClusterScene() {
  const groupRef = useRef<Group>(null);
  const reduceMotion = useReducedMotion() ?? false;

  useFrame((state) => {
    if (!groupRef.current || reduceMotion) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.06;
  });

  const chips = useMemo(
    () => [
      { pos: [-2.4, 1.0, -0.5] as [number, number, number], color: '#a7e5d3' },
      { pos: [-1.2, 1.8, 0.4] as [number, number, number], color: '#c8b8e0' },
      { pos: [0.0, 1.4, -0.3] as [number, number, number], color: '#f4c5a8' },
      { pos: [1.4, 1.6, 0.5] as [number, number, number], color: '#a8c8e8' },
      { pos: [2.5, 1.0, -0.2] as [number, number, number], color: '#e8b8c4' },
      { pos: [-2.0, 0.0, 0.3] as [number, number, number], color: '#a7e5d3' },
      { pos: [-0.6, -0.1, 0.5] as [number, number, number], color: '#c8b8e0' },
      { pos: [0.8, 0.0, -0.4] as [number, number, number], color: '#f4c5a8' },
      { pos: [2.1, 0.1, 0.2] as [number, number, number], color: '#a8c8e8' },
      { pos: [-1.6, -1.4, -0.3] as [number, number, number], color: '#e8b8c4' },
      { pos: [-0.2, -1.7, 0.5] as [number, number, number], color: '#a7e5d3' },
      { pos: [1.0, -1.5, -0.2] as [number, number, number], color: '#c8b8e0' },
      { pos: [2.2, -1.3, 0.4] as [number, number, number], color: '#f4c5a8' },
    ],
    []
  );

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} castShadow />
      <directionalLight position={[-3, -2, 2]} intensity={0.4} color="#c8b8e0" />
      {chips.map((c, i) => (
        <Float
          key={i}
          speed={1 + (i % 3) * 0.3}
          rotationIntensity={0.15}
          floatIntensity={0.4}
        >
          <CommentChip position={c.pos} color={c.color} scale={1 + (i % 2) * 0.15} />
        </Float>
      ))}
    </group>
  );
}

/* ---------- Neural net --------------------------------------- */
/* A small graph of connected nodes — the "model under the hood" idea. */

function NeuralNode({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.18, 24, 24]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} emissive={color} emissiveIntensity={0.18} />
    </mesh>
  );
}

function NeuralLink({
  start,
  end,
}: {
  start: [number, number, number];
  end: [number, number, number];
}) {
  const ref = useRef<Group>(null);
  // Position the link midpoint between the two nodes
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  // Cylinder is oriented along Y; we rotate to align with the link vector.
  const rotX = Math.atan2(Math.sqrt(dx * dx + dz * dz), dy) - Math.PI / 2;
  const rotZ = Math.atan2(dx, dz);
  return (
    <mesh position={mid} rotation={[rotX, 0, rotZ]} ref={ref as never}>
      <cylinderGeometry args={[0.012, 0.012, length, 8]} />
      <meshBasicMaterial color="#a8a29e" transparent opacity={0.45} />
    </mesh>
  );
}

function NeuralNetScene() {
  const layers: { count: number; x: number; color: string }[] = [
    { count: 3, x: -1.6, color: '#a8c8e8' },
    { count: 5, x: -0.8, color: '#c8b8e0' },
    { count: 4, x: 0, color: '#a7e5d3' },
    { count: 5, x: 0.8, color: '#f4c5a8' },
    { count: 3, x: 1.6, color: '#e8b8c4' },
  ];
  // Compute node positions for all layers
  const positions = useMemo(() => {
    return layers.map((layer) => {
      const gap = layer.count > 1 ? 1.6 / (layer.count - 1) : 0;
      const start = -0.8;
      return Array.from({ length: layer.count }).map((_, i) => ({
        position: [layer.x, start + i * gap, 0] as [number, number, number],
        color: layer.color,
      }));
    });
  }, []);
  // Compute all links (every node in layer N → every node in layer N+1)
  const links = useMemo(() => {
    const out: { start: [number, number, number]; end: [number, number, number] }[] = [];
    for (let l = 0; l < positions.length - 1; l += 1) {
      for (const a of positions[l]) {
        for (const b of positions[l + 1]) {
          out.push({ start: a.position, end: b.position });
        }
      }
    }
    return out;
  }, [positions]);

  return (
    <group>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 2, 3]} intensity={1.0} color="#ffffff" />
      <pointLight position={[-3, -1, 2]} intensity={0.5} color="#c8b8e0" />
      {links.map((l, i) => (
        <NeuralLink key={`l-${i}`} start={l.start} end={l.end} />
      ))}
      {positions.flat().map((n, i) => (
        <Float key={`n-${i}`} speed={1.4} rotationIntensity={0.2} floatIntensity={0.3}>
          <NeuralNode position={n.position} color={n.color} />
        </Float>
      ))}
    </group>
  );
}

/* ---------- Floating tokens --------------------------------- */
/* Pastel orb cluster representing "5 categories" — used in the
   five-states section. */

function FloatingTokensScene() {
  const tokens = useMemo(
    () => [
      { pos: [-1.5, 0.8, 0] as [number, number, number], color: '#a7e5d3', label: 'Safe' },
      { pos: [-0.7, -0.7, 0.3] as [number, number, number], color: '#c8b8e0', label: 'Insult' },
      { pos: [0.2, 0.9, -0.2] as [number, number, number], color: '#f4c5a8', label: 'Obscene' },
      { pos: [1.0, -0.5, 0.4] as [number, number, number], color: '#a8c8e8', label: 'Threat' },
      { pos: [1.7, 0.7, -0.1] as [number, number, number], color: '#e8b8c4', label: 'Dangerous' },
    ],
    []
  );
  return (
    <group>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      {tokens.map((t, i) => (
        <Float key={i} speed={1.2 + i * 0.15} rotationIntensity={0.25} floatIntensity={0.55}>
          <group position={t.pos}>
            <mesh>
              <sphereGeometry args={[0.55, 32, 32]} />
              <MeshDistortMaterial color={t.color} roughness={0.3} metalness={0.1} distort={0.35} speed={1.4} />
            </mesh>
            <Text
              position={[0, 0, 0.7]}
              fontSize={0.2}
              color="#0c0a09"
              anchorX="center"
              anchorY="middle"
            >
              {t.label}
            </Text>
          </group>
        </Float>
      ))}
    </group>
  );
}

/* ---------- Wrapper / selector ------------------------------ */

export function Inline3D({ kind, scrollDriven, className, background = 'transparent' }: Inline3DProps) {
  return (
    <div className={className} style={{ pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: background === 'soft' ? '#fafafa' : 'transparent' }}
      >
        {kind === 'comment-cluster' && <CommentClusterScene />}
        {kind === 'neural-net' && <NeuralNetScene />}
        {kind === 'floating-tokens' && <FloatingTokensScene />}
      </Canvas>
    </div>
  );
}

export default Inline3D;
