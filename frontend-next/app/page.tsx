'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ClientNav } from '@/components/ui/ClientNav';
import { Footer } from '@/components/ui/Footer';
import { Section } from '@/components/ui/Section';
import { AnalyseForm } from '@/components/landing/AnalyseForm';
import { Faq } from '@/components/landing/Faq';
import { LabelGallery } from '@/components/landing/LabelGallery';
import { TrustedMarquee } from '@/components/landing/TrustedMarquee';
import { ReviewGallery } from '@/components/landing/ReviewGallery';
import {
  Reveal,
  Parallax,
  StaggerChildren,
  StaggerItem,
  MagneticButton,
  CharSplit,
  Aurora,
  CardSpotlight,
  ParallaxImage,
  ScrollLockSection,
  HorizontalScroll,
  LottieLoop,
} from '@/components/motion';
import { GravityStarsBackground } from '@/components/animate-ui/components/backgrounds/gravity-stars';
import { LABEL_META, LABEL_ORDER } from '@/lib/labels';
import aiRobotAnimation from '@/components/landing/lottie/ai-robot.json';

const STEPS = [
  {
    number: '01',
    title: 'Paste a link',
    description:
      'Drop in the URL of any public YouTube video with comments enabled. Sign in first — the scan is saved to your account. No channel access needed.',
    illustration: 'paste' as const,
    accent: '#a8c8e8',
  },
  {
    number: '02',
    title: 'Fetch the comments',
    description:
      'ToxiScan calls the YouTube Data API v3 and pulls up to two hundred comments — replies included, so a reply can be read against what it replies to.',
    illustration: 'fetch' as const,
    accent: '#c8b8e0',
  },
  {
    number: '03',
    title: 'Score each one',
    description:
      'Each comment is routed by language: a MuRIL model for Hindi, Marathi and code-mixed text, an XLM-RoBERTa model for English and European languages.',
    illustration: 'score' as const,
    accent: '#a7e5d3',
  },
  {
    number: '04',
    title: 'Catch what scores miss',
    description:
      'A language model reads each comment again for sarcasm, for harm that only exists in context, and to place it on a five-level severity scale.',
    illustration: 'aggregate' as const,
    accent: '#f4c5a8',
  },
  {
    number: '05',
    title: 'Read the result',
    description:
      'An overall score, a breakdown across nine categories, and the comments driving each one. Save it, export it, or flag anything the model got wrong.',
    illustration: 'read' as const,
    accent: '#e8b8c4',
  },
];

const CAPABILITIES = [
  {
    title: 'English, Hindi and Marathi',
    description:
      'Including romanised, code-mixed comments — the "bhai yeh kya hai" register that generic toxicity models read as English and score as harmless.',
    accent: '#a8c8e8',
  },
  {
    title: 'Sarcasm and context',
    description:
      '"Wow, you\'re really a genius 🙄" carries no abusive word. Neither does a reply that is only cruel because of what it is replying to. Both are caught.',
    accent: '#a7e5d3',
  },
  {
    title: 'Nine categories, five severities',
    description:
      'Insult, harassment, hate speech, threat, profanity, sexual content, identity attack and self-harm — each graded from mild through to critical.',
    accent: '#c8b8e0',
  },
  {
    title: 'It shows its working',
    description:
      'Every verdict carries its confidence, which model produced it, and where the two models disagreed. Flag anything wrong and it is measured against the next run.',
    accent: '#f4c5a8',
  },
];

const EASE_OUT_EXPO = [0.22, 1, 0.36, 1] as const;

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const formDrift = useTransform(heroScroll, [0, 1], [0, -80]);
  const eyebrowDrift = useTransform(heroScroll, [0, 1], [0, -40]);
  const headlineDrift = useTransform(heroScroll, [0, 1], [0, -100]);
  const headlineBlurValue = useTransform(heroScroll, [0, 0.7], [0, 12]);
  const headlineBlur = useTransform(headlineBlurValue, (v) => `blur(${v}px)`);
  const headlineOpacity = useTransform(heroScroll, [0, 0.85], [1, 0]);

  return (
    <>
      <ClientNav />

      <div className="grain" aria-hidden="true" />

      <main>
        {/* ---------------------------------------------------------- */}
        {/* HERO — gravity stars + 3D cluster + Lottie robot          */}
        {/* ---------------------------------------------------------- */}
        <section ref={heroRef} className="relative min-h-screen overflow-hidden">
          {/* Gravity stars background — gated to lg+ so mobile doesn't pay the 120-star RAF + glow cost */}
          <div
            className="pointer-events-auto absolute inset-x-0 top-0 bottom-0 z-0 hidden lg:block"
            aria-hidden="true"
            style={{ color: 'var(--color-ink)' }}
          >
            <GravityStarsBackground
              starsCount={70}
              starsSize={1.6}
              starsOpacity={0.4}
              glowIntensity={10}
              glowAnimation="ease"
              movementSpeed={0.18}
              mouseInfluence={110}
              mouseGravity="attract"
              gravityStrength={40}
              starsInteraction
              starsInteractionType="merge"
              className="h-full w-full"
            />
            <div
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(245,245,245,0)_0%,rgba(245,245,245,0)_55%,rgba(245,245,245,0.25)_100%)]"
              aria-hidden="true"
            />
          </div>

          <div className="editorial-container relative z-10 pt-20 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:items-center lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1">
              <div>
                <motion.span
                  className="caption-uppercase text-muted block"
                  initial={reduceMotion ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                  style={reduceMotion ? undefined : { y: eyebrowDrift }}
                >
                  ToxiScan
                </motion.span>

                <motion.div
                  style={
                    reduceMotion
                      ? undefined
                      : { y: headlineDrift, filter: headlineBlur, opacity: headlineOpacity }
                  }
                >
                  <CharSplit
                    as="h1"
                    text="Read the room before you read the comments."
                    className="display-mega mt-5 max-w-[16ch]"
                    stagger={0.028}
                    delay={0.15}
                    distance={16}
                    duration={0.6}
                    immediate
                  />
                </motion.div>

                <motion.p
                  className="body-md mt-6 max-w-[54ch] text-body"
                  initial={reduceMotion ? false : { opacity: 0, y: 24, filter: 'blur(6px)' }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.8, delay: 0.22, ease: EASE_OUT_EXPO }}
                >
                  ToxiScan scores every comment and reply on a public YouTube video
                  across nine categories and five levels of severity, then shows you the
                  shape of the conversation — before you scroll through it yourself.
                </motion.p>
              </div>

              <motion.div
                id="analyse-form"
                className="scroll-anchor-offset max-w-[560px] lg:max-w-none"
                initial={reduceMotion ? false : { opacity: 0, y: 40, filter: 'blur(8px)' }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 1.0, delay: 0.36, ease: EASE_OUT_EXPO }}
                style={reduceMotion ? undefined : { y: formDrift }}
              >
                <AnalyseForm />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* TRUSTED BY — endlessly scrolling strip of who this is for   */}
        {/* ---------------------------------------------------------- */}
        <section className="border-t border-hairline overflow-hidden py-14">
          <Reveal axis="3d" direction="up" distance={24} rotateDeg={4} duration={0.9}>
            <p className="caption-uppercase text-muted mb-8 text-center">
              Built for the people who read comment sections
            </p>
          </Reveal>
          <TrustedMarquee />
        </section>

        {/* ---------------------------------------------------------- */}
        {/* HOW IT WORKS — 5 cards, pinned horizontal scroll            */}
        {/* Vertical scroll → horizontal card-by-card translation.      */}
        {/* Mirrors the Motion ScrollHorizontal reference: outer        */}
        {/* `relative` container, no surrounding section, no border —   */}
        {/* so previous/next sections sit flush.                        */}
        {/* ---------------------------------------------------------- */}
        <HorizontalScroll
          distanceVh={3.5}
          className="relative overflow-hidden bg-[var(--color-canvas-soft)]"
          innerClassName="px-0"
        >
          {STEPS.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </HorizontalScroll>

        {/* ---------------------------------------------------------- */}
        {/* THE CATEGORIES — heading band; the cards themselves live    */}
        {/* in the pinned <LabelGallery /> directly below, which shares */}
        {/* this band's silver surface so the two read as one section.  */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline relative overflow-hidden bg-[var(--color-surface-strong)]"
          eyebrow="The categories"
          heading="Nine categories, grouped into five families here."
          description="Severity is never carried by a loud red banner — it is carried by language. Here is what each family means and how it is weighted."
          containerClassName="!pb-0 [&>div:first-child]:mb-0"
        >
          <></>
        </Section>

        {/* The five label cards ride a pinned horizontal gallery: scrolling
            vertically past the 300vh container translates the track sideways,
            bringing each card in turn through the centred sticky slot. */}
        <LabelGallery />

        {/* ---------------------------------------------------------- */}
        {/* CAPABILITIES — neural-net 3D backdrop + 2-col grid         */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline relative overflow-hidden"
          eyebrow="Capabilities"
          heading="What is actually happening under the hood."
          backdrop="topographic"
        >
          {/* 3D neural-net canvas removed — replaced with empty spacer to preserve layout. */}
          <div aria-hidden="true" className="pointer-events-none absolute left-[-120px] top-[20%] z-[1] hidden h-[600px] w-[700px] lg:block" />

          <div className="relative z-10 grid gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((item, i) => (
              <Reveal
                key={item.title}
                axis="3d"
                direction="up"
                distance={48}
                rotateDeg={6}
                duration={0.9}
                delay={i * 0.1}
              >
                <CardSpotlight
                  className="hairline-card lift-on-hover relative overflow-hidden p-6"
                  color={`${item.accent}55`}
                  size={300}
                >
                  <div
                    className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full opacity-50 blur-3xl"
                    style={{ background: item.accent }}
                    aria-hidden="true"
                  />
                  <div className="relative">
                    <h3 className="title-md text-ink">{item.title}</h3>
                    <p className="body-sm mt-2 text-body">{item.description}</p>
                  </div>
                </CardSpotlight>
              </Reveal>
            ))}
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* REVIEWS — cards on a rotating 3D ring                       */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline relative overflow-hidden"
          eyebrow="Reviews"
          heading="What people use it for."
          description="Creators, moderators and researchers reading the same comment sections you are."
        >
          <Reveal axis="3d" direction="up" distance={40} rotateDeg={5} duration={1.0} blur>
            <ReviewGallery />
          </Reveal>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* FAQ                                                         */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline"
          soft
          containerClassName="max-w-[800px]"
          eyebrow="Questions"
          heading="Before you paste a link."
          backdrop="atmosphere"
          backdropColors={['#c8b8e0', '#a8c8e8', '#a7e5d3']}
          backdropIntensity="soft"
        >
          <Reveal axis="3d" direction="up" distance={40} rotateDeg={5} duration={1.0} blur>
            <Faq />
          </Reveal>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* CTA band — aurora + magnetic CTA                            */}
        {/* ---------------------------------------------------------- */}
        <Section className="border-t border-hairline relative overflow-hidden">
          <Aurora />
          <div className="relative z-10 flex flex-col items-center text-center">
            <Reveal axis="3d" direction="up" distance={48} rotateDeg={6} duration={1.1} blur>
              <h2 className="display-lg max-w-[20ch]">
                See what a comment section is actually saying.
              </h2>
            </Reveal>
            <Reveal axis="3d" direction="up" distance={24} rotateDeg={4} duration={0.9} delay={0.25}>
              <div className="mt-10">
                <MagneticButton
                  href="#analyse-form"
                  variant="primary"
                  size="lg"
                  trailingIcon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                >
                  Analyse a video
                </MagneticButton>
              </div>
            </Reveal>
          </div>
        </Section>
      </main>
      <Footer />

      {/* AI Robot — page-wide sticky. Follows the user down the page and
          drifts lower as scroll progresses; fades out near the footer. */}
      <PageRobot />
    </>
  );
}

/* ============================================================
   One horizontal-scroll-locked chapter card — wide, cinematic,
   each fills 100vw with internal layered illustration.
   ============================================================ */

function StepCard({
  step,
  index,
}: {
  step: (typeof STEPS)[number];
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  // Each card pops in slightly with its own scroll progress.
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  });

  const cardScale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.92, 1, 1, 1.04]);
  const cardOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.6, 1, 1, 0.7]);

  return (
    <motion.div
      ref={cardRef}
      style={
        reduceMotion
          ? undefined
          : {
              scale: cardScale,
              opacity: cardOpacity,
              transformStyle: 'preserve-3d',
            }
      }
      className="relative w-full max-w-[820px]"
    >
      <CardSpotlight
        className="hairline-card relative overflow-hidden p-8 sm:p-10"
        color={`${step.accent}66`}
        size={420}
      >
        {/* Atmospheric corner orb */}
        <div
          className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full opacity-50 blur-3xl"
          style={{ background: step.accent }}
          aria-hidden="true"
        />

        <div className="relative grid gap-8 sm:grid-cols-[1fr_minmax(0,1.1fr)] sm:items-center">
          {/* Number + text */}
          <div>
            <span className="caption-uppercase text-muted-soft">Chapter {step.number}</span>
            <h3 className="display-md mt-3 text-ink">{step.title}</h3>
            <p className="body-md mt-4 text-body">{step.description}</p>

            {/* Step progress dots */}
            <div className="mt-8 flex items-center gap-2" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="block h-1.5 rounded-full transition-all duration-700"
                  style={{
                    width: i === index ? 32 : 12,
                    background: i === index ? step.accent : 'var(--color-hairline-strong)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Illustration panel */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface-strong)]">
            <StepIllustration kind={step.illustration} accent={step.accent} />
          </div>
        </div>
      </CardSpotlight>
    </motion.div>
  );
}

/* ============================================================
   Per-step illustrations — bigger, more detailed than before
   because these cards are wider now (820px max).
   ============================================================ */

function StepIllustration({
  kind,
  accent,
}: {
  kind: 'paste' | 'fetch' | 'score' | 'aggregate' | 'read';
  accent: string;
}) {
  if (kind === 'paste') {
    return (
      <svg viewBox="0 0 480 360" className="h-full w-full">
        <defs>
          <linearGradient id={`bg-paste-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a8c8e8" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <rect width="480" height="360" fill={`url(#bg-paste-${accent})`} />
        {/* URL field */}
        <rect x="40" y="80" width="400" height="56" rx="28" fill="#ffffff" stroke="#d6d3d1" strokeWidth="1.5" />
        <text x="72" y="115" fontFamily="Inter, sans-serif" fontSize="18" fill="#777169">
          https://www.youtube.com/watch?v=…
        </text>
        <line x1="340" y1="88" x2="340" y2="128" stroke="#0c0a09" strokeWidth="2" />
        {/* Play button */}
        <circle cx="240" cy="240" r="40" fill="#0c0a09" />
        <path d="M230 222 L230 258 L260 240 Z" fill="#ffffff" />
        {/* Channel chip */}
        <rect x="40" y="180" width="160" height="32" rx="16" fill="#ffffff" opacity="0.85" />
        <circle cx="60" cy="196" r="10" fill={accent} />
        <text x="80" y="200" fontFamily="Inter, sans-serif" fontSize="13" fill="#777169">Channel · Video</text>
      </svg>
    );
  }
  if (kind === 'fetch') {
    return (
      <svg viewBox="0 0 480 360" className="h-full w-full">
        <defs>
          <linearGradient id={`bg-fetch-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c8b8e0" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="480" height="360" fill={`url(#bg-fetch-${accent})`} />
        {/* YouTube API source box */}
        <rect x="40" y="60" width="140" height="240" rx="14" fill="#ffffff" opacity="0.92" />
        <text x="110" y="100" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="600" fill="#0c0a09" textAnchor="middle">YouTube API</text>
        <text x="110" y="120" fontFamily="Inter, sans-serif" fontSize="11" fill="#777169" textAnchor="middle">v3 · comments.list</text>
        {/* Comment stream */}
        <g transform="translate(220, 60)">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <g key={i} transform={`translate(0, ${i * 34})`}>
              <rect width="220" height="22" rx="4" fill="#ffffff" opacity={0.85 - i * 0.05} />
              <rect width={50 + i * 18} height="22" rx="4" fill={accent} opacity="0.75" />
            </g>
          ))}
        </g>
        {/* Arrow */}
        <path d="M195 180 L218 180" stroke="#0c0a09" strokeWidth="1.5" strokeDasharray="4 4" />
        <polygon points="218,176 226,180 218,184" fill="#0c0a09" />
      </svg>
    );
  }
  if (kind === 'score') {
    return (
      <svg viewBox="0 0 480 360" className="h-full w-full">
        <defs>
          <linearGradient id={`bg-score-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a7e5d3" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="480" height="360" fill={`url(#bg-score-${accent})`} />
        {/* Comments flowing through nodes */}
        {[40, 90, 140, 190, 240, 290].map((y, i) => (
          <g key={i}>
            <rect x="30" y={y - 11} width="120" height="22" rx="3" fill="#ffffff" opacity="0.9" />
            <line x1="160" y1={y} x2="210" y2={y} stroke="#777169" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="240" cy={y} r="14" fill={accent} />
            <circle cx="240" cy={y} r="6" fill="#ffffff" />
            <line x1="270" y1={y} x2="320" y2={y} stroke="#777169" strokeWidth="1" strokeDasharray="3 3" />
            <rect x="320" y={y - 11} width="120" height="22" rx="3" fill="#0c0a09" opacity="0.9" />
            <text x="380" y={y + 4} fontFamily="Inter, sans-serif" fontSize="11" fill="#ffffff" textAnchor="middle">
              {(0.12 + i * 0.16).toFixed(2)}
            </text>
          </g>
        ))}
      </svg>
    );
  }
  if (kind === 'aggregate') {
    return (
      <svg viewBox="0 0 480 360" className="h-full w-full">
        <defs>
          <linearGradient id={`bg-agg-${accent}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f4c5a8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect width="480" height="360" fill={`url(#bg-agg-${accent})`} />
        {/* Donut chart */}
        <g transform="translate(120, 180)">
          <circle cx="0" cy="0" r="74" fill="#ffffff" opacity="0.92" />
          {[
            { pct: 0.42, c: '#a7e5d3' },
            { pct: 0.26, c: '#c8b8e0' },
            { pct: 0.18, c: '#f4c5a8' },
            { pct: 0.14, c: '#a8c8e8' },
          ].map((d, i, arr) => {
            let acc = 0;
            for (let j = 0; j < i; j += 1) acc += arr[j].pct;
            const start = acc * Math.PI * 2 - Math.PI / 2;
            const end = (acc + d.pct) * Math.PI * 2 - Math.PI / 2;
            const x1 = Math.cos(start) * 74;
            const y1 = Math.sin(start) * 74;
            const x2 = Math.cos(end) * 74;
            const y2 = Math.sin(end) * 74;
            const large = d.pct > 0.5 ? 1 : 0;
            return (
              <path
                key={i}
                d={`M 0 0 L ${x1} ${y1} A 74 74 0 ${large} 1 ${x2} ${y2} Z`}
                fill={d.c}
              />
            );
          })}
          <circle cx="0" cy="0" r="32" fill="#fafafa" />
          <text x="0" y="5" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="600" fill="#0c0a09" textAnchor="middle">42%</text>
        </g>
        {/* Legend bars */}
        <g transform="translate(240, 70)">
          {[
            { label: 'Safe', pct: 0.55, c: '#a7e5d3' },
            { label: 'Insult', pct: 0.30, c: '#c8b8e0' },
            { label: 'Obscene', pct: 0.40, c: '#f4c5a8' },
            { label: 'Threat', pct: 0.65, c: '#a8c8e8' },
            { label: 'Dangerous', pct: 0.50, c: '#e8b8c4' },
          ].map((row, i) => (
            <g key={i} transform={`translate(0, ${i * 50})`}>
              <text x="0" y="12" fontFamily="Inter, sans-serif" fontSize="13" fill="#0c0a09">{row.label}</text>
              <rect x="0" y="20" width="200" height="10" rx="5" fill="#ffffff" opacity="0.85" />
              <rect x="0" y="20" width={200 * row.pct} height="10" rx="5" fill={row.c} />
              <text x="210" y="29" fontFamily="Inter, sans-serif" fontSize="11" fill="#777169">{Math.round(row.pct * 100)}%</text>
            </g>
          ))}
        </g>
      </svg>
    );
  }
  // read — final report screen
  return (
    <svg viewBox="0 0 480 360" className="h-full w-full">
      <defs>
        <linearGradient id={`bg-read-${accent}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
          <stop offset="100%" stopColor="#e8b8c4" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <rect width="480" height="360" fill={`url(#bg-read-${accent})`} />
      {/* Final report card */}
      <rect x="40" y="40" width="400" height="280" rx="14" fill="#ffffff" opacity="0.95" />
      <text x="60" y="74" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="#777169" letterSpacing="1.5">
        OVERALL TOXICITY
      </text>
      <text x="60" y="120" fontFamily="EB Garamond, serif" fontSize="56" fontWeight="300" fill="#0c0a09">
        0.34
      </text>
      <text x="60" y="148" fontFamily="Inter, sans-serif" fontSize="13" fill="#777169">
        Confidence 78% · 200 comments analysed
      </text>
      {/* Mini bars */}
      <g transform="translate(60, 180)">
        {[
          { label: 'Safe', w: 200, c: '#a7e5d3' },
          { label: 'Insult', w: 140, c: '#c8b8e0' },
          { label: 'Obscene', w: 90, c: '#f4c5a8' },
          { label: 'Threat', w: 50, c: '#a8c8e8' },
          { label: 'Dangerous', w: 30, c: '#e8b8c4' },
        ].map((b, i) => (
          <g key={i} transform={`translate(0, ${i * 24})`}>
            <text x="0" y="10" fontFamily="Inter, sans-serif" fontSize="11" fill="#777169">{b.label}</text>
            <rect x="60" y="0" width="240" height="10" rx="5" fill="#f0efed" />
            <rect x="60" y="0" width={b.w} height="10" rx="5" fill={b.c} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/* ============================================================
   PageRobot — viewport-fixed AI mascot that rides the user all the
   way down the page. Drifts lower as scroll progresses, fades out
   just before the footer so it doesn't collide with footer chrome.
   ============================================================ */

function PageRobot() {
  const reduceMotion = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll();

  // Gentle drift down (~30vh across the whole page) so the robot reaches
  // the footer area without overshooting. Stays fully visible the whole
  // way down — never hidden, even in the footer.
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
