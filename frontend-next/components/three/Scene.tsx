'use client';

import dynamic from 'next/dynamic';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from './useReducedMotion';
import { useDeviceCapability } from './useDeviceCapability';
import type { SceneCanvasProps } from './SceneCanvas';

// R3F/three.js cannot render on the server (it touches `window`, WebGL,
// `requestAnimationFrame`, …), so the canvas itself is pulled in lazily and
// only ever on the client. `ssr: false` must live inside a Client
// Component in the App Router — Scene.tsx is that boundary.
const SceneCanvas = dynamic(() => import('./SceneCanvas'), { ssr: false });

export interface SceneProps {
  /** The R3F scene graph — e.g. <OrbField /> or <ToxicitySpectrum />. */
  children: ReactNode;
  className?: string;
  cameraPosition?: SceneCanvasProps['cameraPosition'];
  cameraFov?: SceneCanvasProps['cameraFov'];
  frameloop?: SceneCanvasProps['frameloop'];
  /**
   * CSS gradient stops used for the fallback surface on reduced-motion,
   * low-capability devices, and the brief pre-mount window. Defaults to
   * the brand's mint → lavender → sky trio.
   */
  fallbackGradient?: string;
  /** Purely decorative — hides the whole mount from assistive tech. */
  ariaHidden?: boolean;
  /**
   * Scroll progress in [0, 1] forwarded to children that accept it
   * (currently just `OrbField`'s `scrollProgress`). Lets the page drive
   * depth-of-field / camera-Z moves from outside the canvas.
   */
  scrollProgress?: number;
}

const DEFAULT_FALLBACK_GRADIENT =
  'radial-gradient(circle at 30% 30%, rgba(167, 229, 211, 0.5), transparent 60%), ' +
  'radial-gradient(circle at 75% 40%, rgba(200, 184, 224, 0.45), transparent 55%), ' +
  'radial-gradient(circle at 55% 80%, rgba(168, 200, 232, 0.4), transparent 60%)';

/**
 * Reusable `<Canvas>` wrapper responsible for every "should this even be
 * WebGL" decision, so individual 3D pieces (`OrbField`, `ToxicitySpectrum`)
 * never have to know about SSR, reduced motion, or device capability.
 *
 * Three render paths:
 * 1. Low-capability device (weak CPU, coarse pointer, or no WebGL) → a
 *    static CSS gradient div. No canvas is ever created.
 * 2. `prefers-reduced-motion: reduce` → the real 3D scene mounts, but every
 *    child receives a `static` prop so `useFrame` loops skip motion and it
 *    renders as a single still frame instead of an animation.
 * 3. Otherwise → the full animated canvas, capped at `dpr={[1, 1.75]}`.
 */
export function Scene({
  children,
  className,
  cameraPosition,
  cameraFov,
  frameloop = 'always',
  fallbackGradient = DEFAULT_FALLBACK_GRADIENT,
  ariaHidden = true,
  scrollProgress = 0,
}: SceneProps) {
  const reducedMotion = useReducedMotion();
  const capability = useDeviceCapability();

  const staticFrame = reducedMotion;
  const effectiveFrameloop: SceneCanvasProps['frameloop'] = staticFrame ? 'demand' : frameloop;

  const content = isValidElement(children)
    ? cloneElement(children as ReactElement<{ static?: boolean; scrollProgress?: number }>, {
        static: staticFrame,
        scrollProgress,
      })
    : children;

  // While capability detection is running, and once it resolves to "low",
  // render the same inert CSS gradient — never a canvas, never a layout
  // flash between the two fallback states.
  if (capability !== 'capable') {
    return (
      <div
        className={cn('h-full w-full', className)}
        style={{ background: fallbackGradient, filter: 'blur(0px)' }}
        aria-hidden={ariaHidden}
      />
    );
  }

  return (
    <div className={cn('h-full w-full', className)} aria-hidden={ariaHidden}>
      <SceneCanvas
        cameraPosition={cameraPosition}
        cameraFov={cameraFov}
        frameloop={effectiveFrameloop}
      >
        {content}
      </SceneCanvas>
    </div>
  );
}

export default Scene;
