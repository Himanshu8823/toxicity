'use client';

import { useEffect, useState } from 'react';

export type DeviceCapability = 'checking' | 'capable' | 'low';

const LOW_CORE_THRESHOLD = 4;

/**
 * Heuristic gate for whether it is worth mounting a WebGL canvas at all.
 *
 * A device is treated as "low" capability when any of these hold:
 * - `navigator.hardwareConcurrency` is missing or below the threshold
 *   (cheap Android devices and old laptops routinely report 2-4 cores)
 * - the primary pointer is coarse (`(pointer: coarse)`) — a proxy for
 *   phones/tablets, where GPU headroom and battery budget are both tighter
 * - a WebGL context genuinely cannot be created (software-only browsers,
 *   locked-down corporate machines, some headless/embedded webviews)
 *
 * Starts as `'checking'` so callers can render nothing (avoiding a flash of
 * the wrong fallback) until the synchronous checks resolve on mount.
 */
export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>('checking');

  useEffect(() => {
    if (typeof window === 'undefined') {
      setCapability('capable');
      return;
    }

    const cores = navigator.hardwareConcurrency ?? 0;
    const isLowCoreCount = cores > 0 && cores < LOW_CORE_THRESHOLD;
    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;

    let hasWebGL = false;
    try {
      const canvas = document.createElement('canvas');
      hasWebGL = Boolean(
        canvas.getContext('webgl2') ||
          canvas.getContext('webgl') ||
          canvas.getContext('experimental-webgl'),
      );
    } catch {
      hasWebGL = false;
    }

    const low = !hasWebGL || isLowCoreCount || isCoarsePointer;
    setCapability(low ? 'low' : 'capable');
  }, []);

  return capability;
}
