'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/** The five atmospheric gradient tokens from globals.css, as linear RGB. */
const ORB_COLORS = [
  '#a7e5d3', // mint
  '#f4c5a8', // peach
  '#c8b8e0', // lavender
  '#a8c8e8', // sky
  '#e8b8c4', // rose
] as const;

interface OrbDefinition {
  color: string;
  basePosition: [number, number, number];
  radius: number;
  driftSpeed: number;
  driftPhase: number;
  driftRadius: number;
  /** Extra opacity multiplier for the soft core. Halo orbs get a low value. */
  intensity: number;
}

export interface OrbFieldProps {
  /** When true, orbs render at their resting pose with no per-frame motion. */
  static?: boolean;
  /** Number of orbs in the field. Defaults to 5 (one per gradient token). */
  count?: number;
  /**
   * Scroll progress in [0, 1] used to drive the camera Z. 0 = resting,
   * 1 = fully pushed back. `OrbField` reads this via `useEffect` and
   * applies it inside `useFrame` so the motion stays one rAF deep.
   */
  scrollProgress?: number;
}

function buildOrbs(count: number): OrbDefinition[] {
  const orbs: OrbDefinition[] = [];
  for (let i = 0; i < count; i += 1) {
    const color = ORB_COLORS[i % ORB_COLORS.length];
    const angle = (i / count) * Math.PI * 2;
    const spread = 3.4;
    orbs.push({
      color,
      basePosition: [
        Math.cos(angle) * spread * (0.6 + (i % 3) * 0.22),
        Math.sin(angle * 1.3) * 1.6,
        -1.5 - (i % 3) * 0.9,
      ],
      radius: 1.15 + (i % 3) * 0.35,
      driftSpeed: 0.08 + (i % 4) * 0.015,
      driftPhase: angle,
      driftRadius: 0.5 + (i % 3) * 0.18,
      intensity: 1,
    });
  }
  return orbs;
}

/**
 * A single soft, volumetric-feeling orb. Achieved with two overlapping
 * transparent spheres (a dim, larger "glow" shell and a slightly brighter
 * core) rendered with additive blending so overlaps bloom rather than
 * muddy — the closest CSS-blur equivalent that still lives in 3D space and
 * responds to camera parallax.
 */
function Orb({
  def,
  index,
  animate,
  pointer,
}: {
  def: OrbDefinition;
  index: number;
  animate: boolean;
  pointer: React.RefObject<[number, number]>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(def.color), [def.color]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const t = animate ? state.clock.elapsedTime : 0;
    const [px, py] = pointer.current;

    const driftX =
      Math.cos(t * def.driftSpeed + def.driftPhase) * def.driftRadius;
    const driftY =
      Math.sin(t * def.driftSpeed * 1.4 + def.driftPhase) * def.driftRadius * 0.7;
    const driftZ = Math.sin(t * def.driftSpeed * 0.6 + def.driftPhase) * 0.3;

    // Subtle mouse parallax: nearer orbs (larger index bias) shift a touch
    // more, giving a shallow depth-of-field feel without any real DOF pass.
    const parallaxStrength = 0.18 + (index % 3) * 0.06;

    group.position.set(
      def.basePosition[0] + driftX + px * parallaxStrength,
      def.basePosition[1] + driftY + py * parallaxStrength,
      def.basePosition[2] + driftZ,
    );

    if (animate) {
      const pulse = 1 + Math.sin(t * def.driftSpeed * 2 + def.driftPhase) * 0.04;
      group.scale.setScalar(pulse * def.intensity);
    }
  });

  return (
    <group ref={groupRef} position={def.basePosition}>
      {/* Outer glow shell — large, very transparent, additive */}
      <mesh>
        <sphereGeometry args={[def.radius * 1.6, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.14 * def.intensity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Mid shell */}
      <mesh>
        <sphereGeometry args={[def.radius * 1.1, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.22 * def.intensity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Soft core — slightly brighter, still transparent so it never reads
          as a solid, saturated ball */}
      <mesh>
        <sphereGeometry args={[def.radius * 0.62, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3 * def.intensity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * The signature hero atmosphere: soft pastel volumetric orbs drifting in
 * slow, independent loops with gentle mouse parallax. Deliberately avoids
 * anything that reads as a "particle system" — few large soft forms, slow
 * motion, additive-transparent shells standing in for frosted-glass
 * diffusion rather than crisp geometry.
 *
 * Two visual upgrades versus the v1:
 *  1. A single, larger, dimmer "halo" orb sits behind the regular 5. It
 *     uses the lavender token (the brand's most neutral pastel) and
 *     drifts at ~30% speed. Reads as atmospheric perspective.
 *  2. Camera Z is driven by `scrollProgress` so the field subtly recedes
 *     as the user scrolls past the hero — depth illusion.
 *
 * When `static` is true (reduced-motion or a paused/off-screen canvas),
 * orbs render at their resting pose and `useFrame` becomes a no-op beyond
 * pointer response, so this same tree can serve both the animated and
 * static-frame paths that `Scene.tsx` chooses between.
 */
export function OrbField({
  static: isStatic = false,
  count = 5,
  scrollProgress = 0,
}: OrbFieldProps) {
  const orbs = useMemo(() => buildOrbs(count), [count]);
  const pointer = useRef<[number, number]>([0, 0]);
  const { camera } = useThree();
  const baseZ = useRef(camera.position.z);

  // Cache the resting camera Z the first time we render so the scroll
  // animation is relative to wherever the camera was placed by `Scene`.
  useEffect(() => {
    baseZ.current = camera.position.z;
  }, [camera]);

  useFrame((state) => {
    if (isStatic) return;
    // `state.pointer` is already normalised to [-1, 1] by R3F. Damp it into
    // a ref so pointer movement never triggers a React re-render.
    pointer.current[0] += (state.pointer.x - pointer.current[0]) * 0.04;
    pointer.current[1] += (state.pointer.y - pointer.current[1]) * 0.04;

    // Drive the camera Z from scroll progress. As the user scrolls past
    // the hero, the field recedes by ~1.6 units — gentle, but enough to
    // sell depth.
    const targetZ = baseZ.current + scrollProgress * 1.6;
    camera.position.z += (targetZ - camera.position.z) * 0.06;
  });

  // Halo orb: positioned deep behind the main field, larger, dimmer.
  const halo: OrbDefinition = {
    color: ORB_COLORS[2], // lavender
    basePosition: [0, 0, -4.5],
    radius: 3.6,
    driftSpeed: 0.025,
    driftPhase: 0,
    driftRadius: 0.6,
    intensity: 0.45,
  };

  return (
    <group>
      <Orb def={halo} index={99} animate={!isStatic} pointer={pointer} />
      {orbs.map((def, i) => (
        <Orb key={i} def={def} index={i} animate={!isStatic} pointer={pointer} />
      ))}
    </group>
  );
}

export default OrbField;
