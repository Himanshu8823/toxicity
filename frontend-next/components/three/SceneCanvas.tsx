'use client';

import { Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';

export interface SceneCanvasProps {
  children: ReactNode;
  /** Camera position tuple, forwarded to the R3F default camera. */
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  /** `frameloop="demand"` renders only when invalidated — cheapest option
   * for scenes that don't need a constant animation clock. Scenes with a
   * running `useFrame` drift should pass `"always"`. */
  frameloop?: 'always' | 'demand' | 'never';
}

/**
 * The actual `<Canvas>` mount. Split out from `Scene.tsx` so the dynamic
 * `import()` in that file only ever pulls R3F/three into the client bundle
 * — this module is never referenced from a server component directly.
 */
export function SceneCanvas({
  children,
  cameraPosition = [0, 0, 8],
  cameraFov = 45,
  frameloop = 'always',
}: SceneCanvasProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={frameloop}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      camera={{ position: cameraPosition, fov: cameraFov }}
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <ambientLight intensity={0.6} />
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}

export default SceneCanvas;
