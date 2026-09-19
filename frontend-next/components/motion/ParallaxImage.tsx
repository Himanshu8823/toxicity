'use client';

import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type HTMLMotionProps,
} from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ParallaxImageProps
  extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'whileInView' | 'transition'> {
  /** Image source. Rendered as an absolutely-positioned `<img>` inside. */
  src: string;
  /** Alt text for accessibility. */
  alt: string;
  /** Vertical drift in px over the element's scroll lifetime. Positive moves
   * down with the page, negative moves up (creates the "drift behind" feel). */
  speed?: number;
  /** Horizontal drift in px. Defaults to 0. */
  horizontalSpeed?: number;
  /** Slight zoom on scroll (1 = no zoom). Defaults to 1.08. */
  scaleFrom?: number;
  /** Reveal duration in seconds. Defaults to 1.2. */
  duration?: number;
  /** Reveal blur in px that resolves to 0. Defaults to 12. */
  blur?: number;
  /** When true, reveal runs on mount; otherwise on viewport entry. */
  immediate?: boolean;
  /** Viewport trigger amount (0-1). Defaults to 0.25. */
  amount?: number;
  /** Optional caption / overlay content rendered on top of the image. */
  children?: ReactNode;
  /** Optional className for the outer wrapper. */
  className?: string;
  /** Optional className for the inner image. */
  imageClassName?: string;
  /** Optional className for the overlay layer. */
  overlayClassName?: string;
  /** Object-fit behavior. Defaults to "cover". */
  objectFit?: 'cover' | 'contain';
}

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

/**
 * An image wrapper that gives you:
 *  - parallax y/x drift as it scrolls past
 *  - subtle zoom-in entrance + reveal blur resolving to 0
 *  - overlay layer (children) so you can drop captions / labels on top
 *
 * The image is rendered as a child element scaled larger than its container,
 * then translated via `useTransform` of the element's scroll progress — this
 * gives the parallax "drifting behind glass" feel without any transform-origin
 * tricks. Respects `prefers-reduced-motion: reduce`.
 */
export function ParallaxImage({
  src,
  alt,
  speed = 80,
  horizontalSpeed = 0,
  scaleFrom = 1.08,
  duration = 1.2,
  blur = 12,
  immediate = false,
  amount = 0.25,
  children,
  className,
  imageClassName,
  overlayClassName,
  objectFit = 'cover',
  ...rest
}: ParallaxImageProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Drift: starts above final position, settles as the element reaches
  // the viewport center, continues past as the user scrolls out.
  const y = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  const x = useTransform(scrollYProgress, [0, 1], [-horizontalSpeed, horizontalSpeed]);
  // Scale settles from scaleFrom → 1 over the first half of the lifetime.
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [scaleFrom, 1, 1.02]);
  const initialBlur = `${blur}px`;
  const blurValue = useTransform(scrollYProgress, [0, 0.4], [initialBlur, '0px']);

  if (reduceMotion) {
    return (
      <div ref={ref} className={cn('relative overflow-hidden', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn('h-full w-full', imageClassName)}
          style={{ objectFit, display: 'block' }}
        />
        {children ? <div className={cn('absolute inset-0', overlayClassName)}>{children}</div> : null}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      initial={immediate ? false : { opacity: 0, scale: scaleFrom, filter: `blur(${blur}px)` }}
      {...(immediate
        ? {}
        : {
            whileInView: { opacity: 1, scale: 1, filter: 'blur(0px)' },
            viewport: { once: true, amount },
            transition: { duration, ease: EASE_OUT_EXPO },
          })}
      style={{ transformStyle: 'preserve-3d' }}
      {...rest}
    >
      <motion.img
        src={src}
        alt={alt}
        className={cn('block h-full w-full', imageClassName)}
        style={{
          objectFit,
          scale,
          x,
          y,
          filter: blurValue,
          willChange: 'transform, filter',
          transformOrigin: 'center',
        }}
      />
      {children ? (
        <div className={cn('pointer-events-none absolute inset-0', overlayClassName)}>
          {children}
        </div>
      ) : null}
    </motion.div>
  );
}

export default ParallaxImage;
