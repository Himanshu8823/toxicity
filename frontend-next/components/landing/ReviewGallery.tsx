'use client';

import { useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react';

interface Review {
  quote: string;
  name: string;
  role: string;
  accent: string;
  ink: string;
  /** Which of the three columns this card sits in. */
  column: 0 | 1 | 2;
  /** Vertical nudge in px — breaks the columns out of a tidy row. */
  offset: number;
  /** Scroll-parallax speed. Higher drifts further as the section passes. */
  speed: number;
  /** Resting tilt in degrees, so the wall reads as pinned-up cards. */
  tilt: number;
}

const REVIEWS: Review[] = [
  {
    quote:
      'I used to skim the first twenty comments and guess. Now I can see the shape of the whole thread before I decide whether to open it at all.',
    name: 'Priya Raghavan',
    role: 'Creator · 480k subscribers',
    accent: '#a7e5d3',
    ink: '#3f6b5c',
    column: 0,
    offset: 0,
    speed: 52,
    tilt: -1.4,
  },
  {
    quote:
      'The breakdown by category is what sold me. "Toxic" on its own is useless — knowing it is mostly obscenity and not threats changes how I respond.',
    name: 'Marcus Whitfield',
    role: 'Community moderator',
    accent: '#c8b8e0',
    ink: '#5f4d7a',
    column: 1,
    offset: 64,
    speed: -34,
    tilt: 1.1,
  },
  {
    quote:
      'It shows the confidence score next to every label instead of hiding it. That honesty is the reason I trust the rest of the report.',
    name: 'Dr. Anneke Vos',
    role: 'Researcher, online harm',
    accent: '#a8c8e8',
    ink: '#3d5f80',
    column: 2,
    offset: 22,
    speed: 76,
    tilt: -0.8,
  },
  {
    quote:
      'We screen videos before featuring them in class. Ten seconds here saves a scroll through four hundred comments.',
    name: 'Tomás Herrera',
    role: 'Secondary school educator',
    accent: '#f4c5a8',
    ink: '#8a5a3c',
    column: 0,
    offset: 40,
    speed: -58,
    tilt: 1.5,
  },
  {
    quote:
      'Plain about its limits — two hundred at a time, and it says where it is least sure. I would rather have a tool that tells me what it cannot see.',
    name: 'Sarah Okonkwo',
    role: 'Trust & safety lead',
    accent: '#e8b8c4',
    ink: '#8a3f52',
    column: 1,
    offset: 0,
    speed: 44,
    tilt: -1.2,
  },
  {
    quote:
      'The one report I can actually forward to a client without translating it first. It reads like a person wrote it.',
    name: 'Daniel Brecht',
    role: 'Agency brand lead',
    accent: '#a7e5d3',
    ink: '#3f6b5c',
    column: 2,
    offset: 56,
    speed: -40,
    tilt: 1.3,
  },
];

const COLUMNS = [0, 1, 2] as const;

/**
 * The reviews as a scattered wall of cards.
 *
 * Cards are dealt into three columns at staggered vertical offsets and slight
 * resting tilts, so the group reads as pinned-up notes rather than a tidy
 * grid. Each card carries its own parallax speed: as the section passes
 * through the viewport they drift at different rates, some up and some down,
 * which is what gives the wall depth. On top of that every card breathes on a
 * slow independent float loop, so the section is never completely still.
 *
 * Under `prefers-reduced-motion` all of that is dropped for a plain grid.
 */
export function ReviewGallery() {
  const reduceMotion = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  if (reduceMotion) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REVIEWS.map((review) => (
          <ReviewCard key={review.name} review={review} />
        ))}
      </div>
    );
  }

  return (
    <div className="review-wall" ref={sectionRef}>
      <div className="wall-columns">
        {COLUMNS.map((col) => (
          <div className="wall-column" key={col}>
            {REVIEWS.filter((r) => r.column === col).map((review, i) => (
              <ParallaxCard
                key={review.name}
                review={review}
                progress={scrollYProgress}
                /* Float loops are offset per card so no two cards ever rise
                   and fall together. */
                floatDelay={(col * 3 + i) * 0.7}
              />
            ))}
          </div>
        ))}
      </div>

      <StyleSheet />
    </div>
  );
}

function ParallaxCard({
  review,
  progress,
  floatDelay,
}: {
  review: Review;
  progress: MotionValue<number>;
  floatDelay: number;
}) {
  // The section travels from just below the viewport to just above it, so
  // mapping 0..1 onto ±speed drifts the card across that whole pass.
  const y = useTransform(progress, [0, 1], [review.speed, -review.speed]);

  return (
    <motion.div
      style={{ y, marginTop: review.offset }}
      initial={{ opacity: 0, y: 34, rotate: review.tilt * 2.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: review.tilt }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        animate={{ y: [0, -9, 0] }}
        transition={{
          duration: 6.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: floatDelay,
        }}
      >
        <ReviewCard review={review} tilt={review.tilt} />
      </motion.div>
    </motion.div>
  );
}

function ReviewCard({ review, tilt = 0 }: { review: Review; tilt?: number }) {
  return (
    <article
      className="wall-card hairline-card"
      style={
        {
          '--card-accent': review.accent,
          '--card-ink': review.ink,
          '--card-tilt': `${tilt}deg`,
        } as React.CSSProperties
      }
    >
      <div className="card-orb" aria-hidden="true" />
      <svg className="card-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9.5 6C6.5 7.6 5 10 5 13v5h6v-6H8c0-2 .6-3.4 2.2-4.4zM20 6c-3 1.6-4.5 4-4.5 7v5h6v-6h-3c0-2 .6-3.4 2.2-4.4z"
          fill="currentColor"
        />
      </svg>
      <p className="card-quote">{review.quote}</p>
      <div className="card-person">
        <span className="card-avatar" aria-hidden="true">
          {review.name.charAt(0)}
        </span>
        <span>
          <span className="card-name">{review.name}</span>
          <span className="card-role">{review.role}</span>
        </span>
      </div>
    </article>
  );
}

function StyleSheet() {
  return (
    <style>{`
      .review-wall {
        position: relative;
        width: 100%;
      }

      .review-wall .wall-columns {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 22px;
        align-items: start;
      }

      .review-wall .wall-column {
        display: flex;
        flex-direction: column;
        gap: 22px;
      }

      .review-wall .wall-card {
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        padding: 30px 28px;
        transform: rotate(var(--card-tilt));
        transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
                    box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1);
      }

      /* Hovering settles the card flat and lifts it clear of the wall, so the
         one being read is the one straightened out. */
      .review-wall .wall-card:hover {
        transform: rotate(0deg) translateY(-4px);
        box-shadow: var(--shadow-soft-drop-lg);
      }

      .review-wall .card-orb {
        position: absolute;
        right: -60px;
        top: -60px;
        width: 210px;
        height: 210px;
        border-radius: 50%;
        background: var(--card-accent);
        filter: blur(50px);
        opacity: 0.45;
      }

      .review-wall .card-mark {
        position: relative;
        width: 24px;
        height: 24px;
        flex-shrink: 0;
        color: var(--card-accent);
      }

      .review-wall .card-quote {
        position: relative;
        margin: 16px 0 0;
        font-size: 17px;
        line-height: 1.6;
        letter-spacing: -0.01em;
        color: var(--color-body-strong);
      }

      .review-wall .card-person {
        position: relative;
        margin-top: auto;
        padding-top: 24px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .review-wall .card-avatar {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        border-radius: 50%;
        background: var(--card-accent);
        color: var(--card-ink);
        font-size: 15px;
      }

      .review-wall .card-name {
        display: block;
        font-size: 15px;
        color: var(--card-ink);
      }

      .review-wall .card-role {
        display: block;
        margin-top: 2px;
        font-size: 12px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--color-muted);
      }

      @media (max-width: 1000px) {
        .review-wall .wall-columns {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .review-wall .wall-columns {
          grid-template-columns: minmax(0, 1fr);
        }

        .review-wall .wall-card {
          padding: 24px 22px;
        }

        .review-wall .card-quote {
          font-size: 16px;
        }
      }
    `}</style>
  );
}

export default ReviewGallery;
