'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/components/three/useReducedMotion';

// Dynamically import lottie-react so its runtime only loads when this
// component actually mounts (lottie-web + its DOM walkers are heavy).
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => null,
});

export interface LottieLoopProps {
  /** Path to a Lottie JSON under /public — fetched at runtime. Prefer `data`. */
  src?: string;
  /**
   * Pre-loaded animation data. Prefer this over `src` when you can `import`
   * the JSON directly — it bundles into the route's JS chunk and removes a
   * network round-trip on first paint.
   */
  data?: unknown;
  /** When true, plays once instead of looping. */
  once?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Thin wrapper around lottie-react. Pauses on reduced-motion.
 *
 * Prefer `data` (a static `import` of the JSON) over `src` (a URL under
 * /public) so the animation ships with the component bundle and there is no
 * extra fetch on hydration.
 */
export function LottieLoop({
  src,
  data,
  once = false,
  className,
  ariaLabel,
}: LottieLoopProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const [fetched, setFetched] = useState<unknown | null>(data ?? null);

  useEffect(() => {
    if (data || !src) return;
    let cancelled = false;
    fetch(src)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setFetched(json);
      })
      .catch(() => {
        // Silent fail — UI keeps working without the animation.
      });
    return () => {
      cancelled = true;
    };
  }, [data, src]);

  if (!fetched) return null;

  return (
    <Lottie
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      animationData={fetched as any}
      loop={!once && !reduceMotion}
      autoplay={!reduceMotion}
      className={className}
      style={{ width: '100%', height: '100%' }}
      aria-label={ariaLabel}
    />
  );
}

export default LottieLoop;