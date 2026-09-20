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
import { PageRobot } from '@/components/landing/PageRobot';
import { StepCard } from '@/components/landing/StepCard';

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
   StepCard is now imported from @/components/landing/StepCard so it
   can be reused on the /about page.
   ============================================================ */

/* ============================================================
   PageRobot is now imported from @/components/landing/PageRobot
   so it can be reused on the /about page too.
   ============================================================ */
