'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/components/three/useReducedMotion';

export interface CursorDotGridProps {
  /** Grid density — dots per row. Total dots = cols × cols (square grid). */
  density?: number;
  /** Spacing between dot centres in CSS pixels. */
  spacing?: number;
  /** Base dot radius when cursor is far away. */
  baseRadius?: number;
  /** Maximum dot radius at the cursor position. */
  maxRadius?: number;
  /** Radius (in CSS px) of the cursor's influence sphere. */
  cursorRadius?: number;
  /** Idle drift amplitude in px — dots gently sway when no cursor is moving. */
  driftAmplitude?: number;
  /** CSS color for the dots. Defaults to a soft ink. */
  color?: string;
  /** Optional className passthrough. */
  className?: string;
}

/**
 * The signature hero atmosphere: a square grid of dots that swell toward
 * the cursor, like a magnet pulling a field of iron filings. Dots idle-drift
 * with a tiny perlin-like noise so the field is never frozen.
 *
 * Implementation: single `<canvas>` painted at devicePixelRatio. The mouse
 * position is read from `pointermove` on the parent and written into a ref,
 * so we never trigger React renders. Each frame we compute per-dot radius
 * by inverse-distance to the cursor and paint it via `arc` + `fill`.
 *
 * Reduced motion: dots render at their base radius in a static grid, no
 * animation loop runs after the first paint.
 */
export function CursorDotGrid({
  density = 28,
  spacing = 28,
  baseRadius = 0.9,
  maxRadius = 3.6,
  cursorRadius = 140,
  driftAmplitude = 6,
  color = 'rgba(12, 10, 9, 0.55)',
  className,
}: CursorDotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<{ x: number; y: number; active: boolean }>({
    x: -9999,
    y: -9999,
    active: false,
  });
  const rafRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    function resize() {
      const rect = container!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    function onPointerMove(e: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      cursorRef.current.x = e.clientX - rect.left;
      cursorRef.current.y = e.clientY - rect.top;
      cursorRef.current.active = true;
    }
    function onPointerLeave() {
      cursorRef.current.active = false;
    }
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);

    // Build static dot positions once. cols × cols square grid centred.
    const total = density * density;
    const cx = width / 2;
    const cy = height / 2;
    const halfSpan = (density - 1) * spacing * 0.5;
    const positions = new Float32Array(total * 2);
    for (let row = 0; row < density; row += 1) {
      for (let col = 0; col < density; col += 1) {
        const idx = (row * density + col) * 2;
        positions[idx] = cx - halfSpan + col * spacing;
        positions[idx + 1] = cy - halfSpan + row * spacing;
      }
    }

    // Per-dot idle phase so each dot drifts independently.
    const phases = new Float32Array(total * 2);
    for (let i = 0; i < total; i += 1) {
      phases[i * 2] = Math.random() * Math.PI * 2;
      phases[i * 2 + 1] = Math.random() * Math.PI * 2;
    }

    let mounted = true;
    let t = 0;

    function frame() {
      if (!mounted) return;
      t += 1;
      ctx!.clearRect(0, 0, width, height);
      const cursor = cursorRef.current;
      const cxCur = cursor.x;
      const cyCur = cursor.y;
      const cursorActive = cursor.active;
      const cursorR2 = cursorRadius * cursorRadius;

      ctx!.fillStyle = color;
      for (let i = 0; i < total; i += 1) {
        const idx = i * 2;
        const baseX = positions[idx];
        const baseY = positions[idx + 1];

        // Idle drift — slow sinusoidal sway in two phases.
        const driftX = reduceMotion
          ? 0
          : Math.sin(t * 0.012 + phases[idx]) * driftAmplitude * 0.5;
        const driftY = reduceMotion
          ? 0
          : Math.cos(t * 0.01 + phases[idx + 1]) * driftAmplitude * 0.5;

        const x = baseX + driftX;
        const y = baseY + driftY;

        // Cursor influence — inverse-square falloff.
        let radius = baseRadius;
        if (cursorActive) {
          const dx = x - cxCur;
          const dy = y - cyCur;
          const d2 = dx * dx + dy * dy;
          if (d2 < cursorR2) {
            // 1 at centre, 0 at cursorRadius. Smoothstep for nicer falloff.
            const norm = 1 - d2 / cursorR2;
            const eased = norm * norm * (3 - 2 * norm);
            radius = baseRadius + (maxRadius - baseRadius) * eased;
          }
        }

        ctx!.beginPath();
        ctx!.arc(x, y, radius, 0, Math.PI * 2);
        ctx!.fill();
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    if (reduceMotion) {
      // Single static paint — no animation loop.
      ctx.fillStyle = color;
      for (let i = 0; i < total; i += 1) {
        const idx = i * 2;
        ctx.beginPath();
        ctx.arc(positions[idx], positions[idx + 1], baseRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      rafRef.current = requestAnimationFrame(frame);
    }

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [density, spacing, baseRadius, maxRadius, cursorRadius, driftAmplitude, color, reduceMotion]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}

export default CursorDotGrid;
