'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type MouseGravity = 'attract' | 'repel';
type GlowAnimation = 'instant' | 'ease' | 'spring';
type StarsInteractionType = 'bounce' | 'merge';

type GravityStarsProps = {
  starsCount?: number;
  starsSize?: number;
  starsOpacity?: number;
  glowIntensity?: number;
  glowAnimation?: GlowAnimation;
  movementSpeed?: number;
  mouseInfluence?: number;
  mouseGravity?: MouseGravity;
  gravityStrength?: number;
  starsInteraction?: boolean;
  starsInteractionType?: StarsInteractionType;
  /** Enable hover ripples drawn at the cursor location. Default true. */
  enableHoverSplash?: boolean;
} & React.ComponentProps<'div'>;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  baseOpacity: number;
  mass: number;
  glowMultiplier?: number;
  glowVelocity?: number;
};

type Ripple = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number; // 0..1
};

function GravityStarsBackground({
  starsCount = 60,
  starsSize = 1.5,
  starsOpacity = 0.4,
  glowIntensity = 10,
  glowAnimation = 'ease',
  movementSpeed = 0.18,
  mouseInfluence = 110,
  mouseGravity = 'attract',
  gravityStrength = 40,
  starsInteraction = false,
  starsInteractionType = 'bounce',
  enableHoverSplash = true,
  className,
  ...props
}: GravityStarsProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animRef = React.useRef<number | null>(null);
  const starsRef = React.useRef<Particle[]>([]);
  const ripplesRef = React.useRef<Ripple[]>([]);
  const lastRippleAtRef = React.useRef<number>(0);
  const mouseRef = React.useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const [dpr, setDpr] = React.useState(1);
  const [canvasSize, setCanvasSize] = React.useState({
    width: 800,
    height: 600,
  });

  const readColor = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return '#ffffff';
    const cs = getComputedStyle(el);
    return cs.color || '#ffffff';
  }, []);

  const initStars = React.useCallback(
    (w: number, h: number) => {
      starsRef.current = Array.from({ length: starsCount }).map(() => {
        const angle = Math.random() * Math.PI * 2;
        const speed = movementSpeed * (0.5 + Math.random() * 0.5);
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * starsSize + 1,
          opacity: starsOpacity,
          baseOpacity: starsOpacity,
          mass: Math.random() * 0.5 + 0.5,
          glowMultiplier: 1,
          glowVelocity: 0,
        };
      });
    },
    [starsCount, movementSpeed, starsOpacity, starsSize],
  );

  const spawnRipple = React.useCallback((x: number, y: number) => {
    ripplesRef.current.push({ x, y, radius: 0, maxRadius: 70 + Math.random() * 30, life: 1 });
    if (ripplesRef.current.length > 12) ripplesRef.current.shift();
  }, []);

  const redistributeStars = React.useCallback((w: number, h: number) => {
    starsRef.current.forEach((p) => {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
    });
    ripplesRef.current = [];
  }, []);

  const resizeCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const nextDpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    setDpr(nextDpr);
    canvas.width = Math.max(1, Math.floor(rect.width * nextDpr));
    canvas.height = Math.max(1, Math.floor(rect.height * nextDpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    setCanvasSize({ width: rect.width, height: rect.height });
    if (starsRef.current.length === 0) {
      initStars(rect.width, rect.height);
    } else {
      redistributeStars(rect.width, rect.height);
    }
  }, [initStars, redistributeStars]);

  const handlePointerMove = React.useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e) {
        const t = e.touches[0];
        if (!t) return;
        clientX = t.clientX;
        clientY = t.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const prev = mouseRef.current;
      mouseRef.current = { x, y, active: true };

      // Spawn a ripple on movement (throttled). Also push the surrounding
      // stars outward slightly so the splash feels like it has weight.
      if (enableHoverSplash) {
        const now = performance.now();
        if (now - lastRippleAtRef.current > 110) {
          lastRippleAtRef.current = now;
          spawnRipple(x, y);
          const dx = prev.x - x;
          const dy = prev.y - y;
          const moved = Math.hypot(dx, dy);
          if (moved > 4) {
            const nx = dx / moved;
            const ny = dy / moved;
            for (const p of starsRef.current) {
              const ddx = p.x - x;
              const ddy = p.y - y;
              const d = Math.hypot(ddx, ddy);
              if (d < 90 && d > 0) {
                const f = (90 - d) / 90;
                p.vx += nx * f * 0.6;
                p.vy += ny * f * 0.6;
              }
            }
          }
        }
      }
    },
    [enableHoverSplash, spawnRipple],
  );

  const handlePointerLeave = React.useCallback(() => {
    mouseRef.current.active = false;
  }, []);

  const handlePointerEnter = React.useCallback(() => {
    mouseRef.current.active = true;
  }, []);

  const updateStars = React.useCallback(() => {
    const w = canvasSize.width;
    const h = canvasSize.height;
    const mouse = mouseRef.current;

    for (let i = 0; i < starsRef.current.length; i++) {
      const p = starsRef.current[i];

      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.hypot(dx, dy);

      if (dist < mouseInfluence && dist > 0) {
        const force = (mouseInfluence - dist) / mouseInfluence;
        const nx = dx / dist;
        const ny = dy / dist;
        const g = force * (gravityStrength * 0.001);

        if (mouseGravity === 'attract') {
          p.vx += nx * g;
          p.vy += ny * g;
        } else if (mouseGravity === 'repel') {
          p.vx -= nx * g;
          p.vy -= ny * g;
        }

        p.opacity = Math.min(1, p.baseOpacity + force * 0.4);

        const targetGlow = 1 + force * 2;
        const currentGlow = p.glowMultiplier || 1;

        if (glowAnimation === 'instant') {
          p.glowMultiplier = targetGlow;
        } else if (glowAnimation === 'ease') {
          const ease = 0.15;
          p.glowMultiplier = currentGlow + (targetGlow - currentGlow) * ease;
        } else {
          const spring = (targetGlow - currentGlow) * 0.2;
          const damping = 0.85;
          p.glowVelocity = (p.glowVelocity || 0) * damping + spring;
          p.glowMultiplier = currentGlow + (p.glowVelocity || 0);
        }
      } else {
        p.opacity = Math.max(p.baseOpacity * 0.3, p.opacity - 0.02);
        const targetGlow = 1;
        const currentGlow = p.glowMultiplier || 1;
        if (glowAnimation === 'instant') {
          p.glowMultiplier = targetGlow;
        } else if (glowAnimation === 'ease') {
          const ease = 0.08;
          p.glowMultiplier = Math.max(
            1,
            currentGlow + (targetGlow - currentGlow) * ease,
          );
        } else {
          const spring = (targetGlow - currentGlow) * 0.15;
          const damping = 0.9;
          p.glowVelocity = (p.glowVelocity || 0) * damping + spring;
          p.glowMultiplier = Math.max(1, currentGlow + (p.glowVelocity || 0));
        }
      }

      if (starsInteraction) {
        for (let j = i + 1; j < starsRef.current.length; j++) {
          const o = starsRef.current[j];
          const dx2 = o.x - p.x;
          const dy2 = o.y - p.y;
          const d = Math.hypot(dx2, dy2);
          const minD = p.size + o.size + 5;
          if (d < minD && d > 0) {
            if (starsInteractionType === 'bounce') {
              const nx = dx2 / d;
              const ny = dy2 / d;
              const rvx = p.vx - o.vx;
              const rvy = p.vy - o.vy;
              const speed = rvx * nx + rvy * ny;
              if (speed < 0) continue;
              const impulse = (2 * speed) / (p.mass + o.mass);
              p.vx -= impulse * o.mass * nx;
              p.vy -= impulse * o.mass * ny;
              o.vx += impulse * p.mass * nx;
              o.vy += impulse * p.mass * ny;
              const overlap = minD - d;
              const sx = nx * overlap * 0.5;
              const sy = ny * overlap * 0.5;
              p.x -= sx;
              p.y -= sy;
              o.x += sx;
              o.y += sy;
            } else {
              const mergeForce = (minD - d) / minD;
              p.glowMultiplier = (p.glowMultiplier || 1) + mergeForce * 0.5;
              o.glowMultiplier = (o.glowMultiplier || 1) + mergeForce * 0.5;
              const af = mergeForce * 0.01;
              p.vx += dx2 * af;
              p.vy += dy2 * af;
              o.vx -= dx2 * af;
              o.vy -= dy2 * af;
            }
          }
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      p.vx += (Math.random() - 0.5) * 0.001;
      p.vy += (Math.random() - 0.5) * 0.001;

      p.vx *= 0.999;
      p.vy *= 0.999;

      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
    }
  }, [
    canvasSize.width,
    canvasSize.height,
    mouseInfluence,
    mouseGravity,
    gravityStrength,
    glowAnimation,
    starsInteraction,
    starsInteractionType,
  ]);

  const drawStars = React.useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const color = readColor();
      for (const p of starsRef.current) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = glowIntensity * (p.glowMultiplier || 1) * 2;
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x * dpr, p.y * dpr, p.size * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Hover ripples — concentric expanding circles + inner highlight ring.
      if (enableHoverSplash && ripplesRef.current.length > 0) {
        for (const r of ripplesRef.current) {
          const alpha = r.life * 0.55;
          if (alpha <= 0) continue;
          const px = r.x * dpr;
          const py = r.y * dpr;
          const radius = r.radius * dpr;

          // Outer soft ring.
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 18 * dpr;
          ctx.lineWidth = 1.4 * dpr;
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Inner brighter thin ring trailing.
          ctx.save();
          ctx.globalAlpha = alpha * 0.85;
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.8 * dpr;
          ctx.beginPath();
          ctx.arc(px, py, radius * 0.62, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Tiny center dot for the "drop" origin.
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 14 * dpr;
          ctx.beginPath();
          ctx.arc(px, py, 2 * dpr, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    },
    [dpr, glowIntensity, readColor, enableHoverSplash],
  );

  const animate = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    updateStars();

    // Advance ripples — expand radius, fade out, drop finished ones.
    if (ripplesRef.current.length > 0) {
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += (r.maxRadius - r.radius) * 0.08 + 0.4;
        r.life -= 0.022;
        if (r.life <= 0) ripples.splice(i, 1);
      }
    }

    drawStars(ctx);
    animRef.current = requestAnimationFrame(animate);
  }, [updateStars, drawStars]);

  React.useEffect(() => {
    resizeCanvas();
    const container = containerRef.current;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(resizeCanvas)
        : null;
    if (container && ro) ro.observe(container);
    const onResize = () => resizeCanvas();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (ro && container) ro.disconnect();
    };
  }, [resizeCanvas]);

  React.useEffect(() => {
    if (starsRef.current.length === 0) {
      initStars(canvasSize.width, canvasSize.height);
    } else {
      starsRef.current.forEach((p) => {
        p.baseOpacity = starsOpacity;
        p.opacity = starsOpacity;
        const spd = Math.hypot(p.vx, p.vy);
        if (spd > 0) {
          const ratio = movementSpeed / spd;
          p.vx *= ratio;
          p.vy *= ratio;
        }
      });
    }
  }, [
    starsCount,
    starsOpacity,
    movementSpeed,
    canvasSize.width,
    canvasSize.height,
    initStars,
  ]);

  React.useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
    };
  }, [animate]);

  return (
    <div
      ref={containerRef}
      data-slot="gravity-stars-background"
      className={cn('relative size-full overflow-hidden', className)}
      onMouseMove={(e) => handlePointerMove(e)}
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      onTouchMove={(e) => handlePointerMove(e)}
      {...props}
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}

export { GravityStarsBackground, type GravityStarsProps };
