'use client';

import { useRef, type ReactNode } from 'react';
import { useInView } from 'framer-motion';

/**
 * Mounts its children only when the wrapper scrolls into view.
 * Below-the-fold 3D canvases (r3f + drei + three.js) are heavy — deferring
 * their allocation until the user actually reaches them keeps the first paint
 * and the hero/scroll experience cheap.
 *
 * Once mounted, the children stay mounted (`once: true`) — re-entering and
 * leaving the section does not re-allocate the WebGL context.
 */
export interface Deferred3DProps {
  children: ReactNode;
  /** Pixel height/width or className for the placeholder box while idle. */
  className?: string;
  /** How much of the box must be in view (0-1) before mounting. Default 0.1. */
  amount?: number;
}

export function Deferred3D({ children, className, amount = 0.1 }: Deferred3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount });

  return (
    <div ref={ref} className={className}>
      {inView ? children : null}
    </div>
  );
}

export default Deferred3D;