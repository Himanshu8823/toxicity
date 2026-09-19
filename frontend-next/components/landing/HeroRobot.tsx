'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { LottieLoop } from '@/components/motion';
import aiRobotAnimation from './lottie/ai-robot.json';

/**
 * The hero's AI-robot mascot — a Lottie animation that reacts to scroll.
 * As the user scrolls past the hero, the robot drifts up, scales down,
 * and fades — the editorial "exit" moment.
 */
export function HeroRobot() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  // Drift up + scale down + fade as user leaves the hero.
  const y = useTransform(scrollYProgress, [0, 1], [0, -160]);
  const scale = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.92, 0.85]);
  const opacity = useTransform(scrollYProgress, [0, 0.55, 0.95], [1, 0.7, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -4]);

  if (reduceMotion) {
    return (
      <div
        ref={ref}
        className="pointer-events-none h-full w-full"
        aria-hidden="true"
      >
        <LottieLoop data={aiRobotAnimation} ariaLabel="AI robot thinking animation" />
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className="pointer-events-none h-full w-full"
      aria-hidden="true"
      style={{ y, scale, opacity, rotate, transformStyle: 'preserve-3d' }}
    >
      <LottieLoop data={aiRobotAnimation} ariaLabel="AI robot thinking animation" />
    </motion.div>
  );
}

export default HeroRobot;
