'use client';

import { useReducedMotion, useScroll, useTransform, motion } from 'framer-motion';
import { LottieLoop } from '@/components/motion';
import aiRobotAnimation from './lottie/ai-robot.json';

/**
 * Page-wide floating AI mascot. Sits `position: fixed` so it rides with the
 * viewport rather than the hero, and gently drifts downward across the whole
 * scroll length. Used on long marketing pages where the hero has already
 * faded but the visual identity of the page benefits from a continuous
 * companion.
 */
export function PageRobot() {
  const reduceMotion = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll();

  const y = useTransform(scrollYProgress, [0, 1], [0, 280]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 1]);

  if (reduceMotion) {
    return (
      <div
        className="pointer-events-none fixed right-[-20px] top-[120px] z-20 hidden h-[420px] w-[420px] lg:block"
        aria-hidden="true"
      >
        <LottieLoop data={aiRobotAnimation} ariaLabel="AI robot thinking animation" />
      </div>
    );
  }

  return (
    <motion.div
      className="pointer-events-none fixed right-[-20px] top-[120px] z-20 hidden h-[420px] w-[420px] lg:block"
      aria-hidden="true"
      style={{ y, opacity }}
    >
      <LottieLoop data={aiRobotAnimation} ariaLabel="AI robot thinking animation" />
    </motion.div>
  );
}

export default PageRobot;
