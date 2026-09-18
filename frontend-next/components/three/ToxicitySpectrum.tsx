'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LABEL_META, LABEL_ORDER } from '@/lib/labels';
import type { ToxicityLabel } from '@/lib/types';

export interface ToxicitySpectrumDatum {
  label: ToxicityLabel;
  value: number;
}

export interface ToxicitySpectrumProps {
  distribution: ToxicitySpectrumDatum[];
  /** Resting/no-motion render — reduced motion or a static fallback frame. */
  static?: boolean;
}

const RING_RADIUS = 2.1;
const MIN_TUBE = 0.05;
const MAX_TUBE = 0.34;
const BASE_Y_GAP = 0.62;

interface RingDatum {
  label: ToxicityLabel;
  ink: string;
  pastel: string;
  fraction: number;
  tube: number;
  orbitSpeed: number;
  orbitPhase: number;
  yOffset: number;
}

/**
 * Builds one ring per canonical label, ordered safest-to-severest (matching
 * `LABEL_ORDER`), stacked slightly along Y so they read as an orbiting
 * "spectrum" stack rather than a flat pie. Ring thickness encodes share of
 * the distribution; an all-zero or empty distribution still produces a
 * full set of hairline-thin rings so the sculpture never disappears.
 */
function buildRings(distribution: ToxicitySpectrumDatum[]): RingDatum[] {
  const byLabel = new Map<ToxicityLabel, number>();
  let total = 0;
  for (const d of distribution) {
    const value = Math.max(0, d.value);
    byLabel.set(d.label, (byLabel.get(d.label) ?? 0) + value);
    total += value;
  }

  return LABEL_ORDER.map((label, index) => {
    const raw = byLabel.get(label) ?? 0;
    const fraction = total > 0 ? raw / total : 0;
    const tube = total > 0 ? MIN_TUBE + fraction * (MAX_TUBE - MIN_TUBE) : MIN_TUBE;
    const meta = LABEL_META[label];
    const mid = (LABEL_ORDER.length - 1) / 2;

    return {
      label,
      ink: meta.ink,
      pastel: meta.pastel,
      fraction,
      tube,
      orbitSpeed: 0.08 + index * 0.02,
      orbitPhase: (index / LABEL_ORDER.length) * Math.PI * 2,
      yOffset: (index - mid) * BASE_Y_GAP,
    };
  });
}

function Ring({ ring, animate }: { ring: RingDatum; animate: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(ring.pastel), [ring.pastel]);
  const inkColor = useMemo(() => new THREE.Color(ring.ink), [ring.ink]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!animate) {
      mesh.rotation.x = Math.PI / 2.6;
      mesh.rotation.z = ring.orbitPhase;
      mesh.position.y = ring.yOffset;
      return;
    }
    const t = state.clock.elapsedTime;
    mesh.rotation.x = Math.PI / 2.6 + Math.sin(t * ring.orbitSpeed * 0.5) * 0.05;
    mesh.rotation.z = t * ring.orbitSpeed + ring.orbitPhase;
    mesh.position.y = ring.yOffset + Math.sin(t * ring.orbitSpeed + ring.orbitPhase) * 0.08;
  });

  // Radius shrinks slightly for higher-severity labels so the stack reads
  // as a gentle funnel, echoing "narrowing toward harm" without any harsh
  // iconography.
  const radius = RING_RADIUS - ring.yOffset * 0.18;

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[Math.max(radius, 0.6), Math.max(ring.tube, MIN_TUBE), 20, 96]} />
      <meshPhysicalMaterial
        color={color}
        emissive={inkColor}
        emissiveIntensity={0.18}
        roughness={0.35}
        metalness={0}
        clearcoat={0.6}
        clearcoatRoughness={0.4}
        transmission={0.15}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

/**
 * Elegant sculptural read of the five-label distribution: a stack of
 * slowly counter-orbiting soft rings, one per canonical label, pastel-
 * tinted per `LABEL_META`. Ring thickness encodes share of total; when
 * `distribution` is empty or sums to zero, every ring falls back to a
 * uniform hairline thickness so the sculpture stays present rather than
 * vanishing to nothing.
 */
export function ToxicitySpectrum({ distribution, static: isStatic = false }: ToxicitySpectrumProps) {
  const rings = useMemo(() => buildRings(distribution), [distribution]);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group || isStatic) return;
    group.rotation.y = state.clock.elapsedTime * 0.05;
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring) => (
        <Ring key={ring.label} ring={ring} animate={!isStatic} />
      ))}
    </group>
  );
}

export default ToxicitySpectrum;
