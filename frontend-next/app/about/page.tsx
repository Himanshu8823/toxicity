'use client';

import Link from 'next/link';
import { ClientNav } from '@/components/ui/ClientNav';
import { Footer } from '@/components/ui/Footer';
import { Section } from '@/components/ui/Section';
import { PipelineStep } from '@/components/about/PipelineStep';
import { LabelCard } from '@/components/about/LabelCard';
import { LimitationItem } from '@/components/about/LimitationItem';
import { LABEL_META, LABEL_ORDER } from '@/lib/labels';
import {
  Reveal,
  Parallax,
  StaggerChildren,
  StaggerItem,
  CharSplit,
  MagneticButton,
  Aurora,
  CardSpotlight,
  ScrollLockSection,
} from '@/components/motion';
import { Inline3D } from '@/components/three/Inline3D';
import { GravityStarsBackground } from '@/components/animate-ui/components/backgrounds/gravity-stars';

const PIPELINE_STEPS = [
  {
    number: '01',
    title: 'A URL becomes a video id',
    description:
      'You paste a YouTube video URL. ToxiScan parses it to extract the video id — the same id YouTube itself uses to identify the video, regardless of which URL shape you pasted (watch, share link, or Shorts).',
    illustration: 'url' as const,
    accent: '#a8c8e8',
  },
  {
    number: '02',
    title: 'Comments and replies are fetched',
    description:
      'ToxiScan calls the YouTube Data API v3 for that video and pulls up to two hundred comments per request — replies included, so a reply can later be read against the comment it answers.',
    illustration: 'fetch' as const,
    accent: '#c8b8e0',
  },
  {
    number: '03',
    title: 'Each comment is routed by language',
    description:
      'Hindi, Marathi, Bengali, Tamil, Telugu, Urdu and romanised or code-mixed Indic text go to Hate-speech-CNERG/indic-abusive-allInOne-MuRIL. English and European languages go to unitary/multilingual-toxic-xlm-roberta.',
    illustration: 'score' as const,
    accent: '#a7e5d3',
  },
  {
    number: '04',
    title: 'A language model reads it again',
    description:
      'Llama 3.3 70B, running on Groq, catches what a classifier cannot express: sarcasm, implicit harm, cruelty that exists only in context. It also sets severity, and the category for Indic text, since MuRIL only answers abusive or not.',
    illustration: 'score' as const,
    accent: '#e8b8c4',
  },
  {
    number: '05',
    title: 'Verdicts are merged and aggregated',
    description:
      'The two readings are merged into one category from nine and one severity from five, then rolled up into a report: breakdowns, confidence, where the two disagreed, and the comments driving each label.',
    illustration: 'aggregate' as const,
    accent: '#f4c5a8',
  },
];

const LIMITATIONS = [
  {
    title: 'A probability, not a verdict',
    description:
      'Every score is the model’s confidence, not a fact. A high score means the language pattern-matches a harmful category closely — it is not a ruling on the person who wrote it.',
    accent: '#a8c8e8',
  },
  {
    title: 'The Indic path is less grounded',
    description:
      'MuRIL only answers abusive or not, so for Hindi, Marathi and code-mixed text the category and severity come from the language model rather than a trained classifier. That path is genuinely less well grounded than the English one.',
    accent: '#c8b8e0',
  },
  {
    title: 'Public videos only',
    description:
      'Only videos that are public and have comments enabled can be analysed. Private, unlisted, age-restricted and members-only videos are not reachable through the YouTube Data API.',
    accent: '#a7e5d3',
  },
  {
    title: 'Sarcasm cuts both ways',
    description:
      'Reading tone is the hardest part of this, and the language model will miss dry sarcasm in one comment and read irony into a sincere one in the next. It widens what can be caught; it does not make the reading certain.',
    accent: '#f4c5a8',
  },
  {
    title: 'A sample, not the whole thread',
    description:
      'Analyses cap at two hundred comments. On a video with thousands of comments, that is a sample of the conversation, not a census of it — a real signal, but not the complete picture.',
    accent: '#e8b8c4',
  },
  {
    title: 'It informs, it does not moderate',
    description:
      'ToxiScan does not take any action on YouTube, does not report anyone, and does not moderate a comment section. It is a lens for understanding a conversation, not an enforcement tool.',
    accent: '#a8c8e8',
  },
];

const TECH_STACK = [
  {
    name: 'Next.js + React',
    description: 'The frontend you are using now — server-rendered pages, a client playground.',
    accent: '#a8c8e8',
  },
  {
    name: 'YouTube Data API v3',
    description: 'The source of every video, comment and reply ToxiScan reads.',
    accent: '#c8b8e0',
  },
  {
    name: 'MuRIL abusive classifier',
    description:
      'Hate-speech-CNERG/indic-abusive-allInOne-MuRIL, on Hugging Face Inference — Indic and code-mixed text, abusive or not.',
    accent: '#a7e5d3',
  },
  {
    name: 'XLM-RoBERTa toxicity model',
    description:
      'unitary/multilingual-toxic-xlm-roberta, also on Hugging Face — seven labels across English and six European languages.',
    accent: '#f4c5a8',
  },
  {
    name: 'Llama 3.3 70B on Groq',
    description:
      'The second pass: sarcasm, context, severity, and the category MuRIL cannot give.',
    accent: '#e8b8c4',
  },
  {
    name: 'Supabase + Postgres',
    description:
      'Accounts, saved scans, notes and tags, exported reports, and the feedback that becomes ground truth.',
    accent: '#a8c8e8',
  },
];

export default function AboutPage() {
  return (
    <>
      <ClientNav />

      <div className="grain" aria-hidden="true" />

      <main>
        {/* ---------------------------------------------------------- */}
        {/* HERO — gravity stars + 3D neural net + char-split headline */}
        {/* ---------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-auto absolute inset-0 z-0"
            aria-hidden="true"
            style={{ color: 'var(--color-ink)' }}
          >
            <GravityStarsBackground
              starsCount={100}
              starsSize={2.2}
              starsOpacity={0.5}
              glowIntensity={16}
              glowAnimation="ease"
              movementSpeed={0.2}
              mouseInfluence={140}
              mouseGravity="attract"
              gravityStrength={45}
              starsInteraction
              starsInteractionType="merge"
              className="h-full w-full"
            />
            <div
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(245,245,245,0.6)_0%,rgba(245,245,245,0.18)_45%,rgba(245,245,245,0)_100%)]"
              aria-hidden="true"
            />
          </div>

          {/* 3D neural net on the right side */}
          <div className="pointer-events-none absolute right-[-60px] top-0 z-[1] hidden h-[520px] w-[600px] lg:block">
            <Inline3D kind="neural-net" />
          </div>

          <div className="editorial-container relative z-10 pt-20 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24">
            <Reveal axis="3d" direction="up" distance={20} rotateDeg={6} duration={0.9}>
              <span className="caption-uppercase text-muted block">About</span>
            </Reveal>

            <Reveal axis="3d" direction="up" distance={36} rotateDeg={6} duration={1.1} delay={0.1}>
              <CharSplit
                as="h1"
                text="ToxiScan reads a YouTube comment section and tells you its shape."
                className="display-xl mt-5 max-w-[22ch]"
                stagger={0.022}
                delay={0.2}
                distance={14}
                duration={0.55}
                immediate
              />
            </Reveal>

            <Reveal axis="3d" direction="up" distance={28} rotateDeg={4} duration={0.9} delay={0.35} blur>
              <p className="body-md mt-6 max-w-[58ch] text-body">
                It scores every comment and reply it can reach across nine categories and
                five levels of severity, then turns that into a report you can actually
                read — built for creators, moderators and anyone curious what a comment
                section is really saying before they scroll through it themselves.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* THE PIPELINE — scroll-locked story of a comment travelling */}
        {/* ---------------------------------------------------------- */}
        <ScrollLockSection
          distanceVh={3.6}
          className="relative bg-[var(--color-canvas-soft)]"
          innerClassName="px-6"
          fadeOut={false}
        >
          <div className="mx-auto w-full max-w-[1100px]">
            <Reveal axis="3d" direction="none" distance={0} rotateDeg={5} duration={1.0}>
              <div className="text-center">
                <p className="caption-uppercase text-muted">How it works</p>
                <h2 className="display-lg mt-2">The genuine pipeline, no simplifications.</h2>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              {PIPELINE_STEPS.map((step, i) => (
                <PipelineStep
                  key={step.number}
                  number={step.number}
                  title={step.title}
                  description={step.description}
                  index={i}
                  accent={step.accent}
                  illustration={step.illustration}
                />
              ))}
            </div>
          </div>
        </ScrollLockSection>

        {/* ---------------------------------------------------------- */}
        {/* THE STATES — 3D token backdrop + label grid                 */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline relative overflow-hidden"
          eyebrow="The categories"
          heading="Nine categories, grouped into five families here."
          description="A comment is placed in one of nine categories and given a severity from none through to critical. These five families are the summary view. Severity is never carried by a loud red banner — it is carried by language and by the ink colour used in charts and text."
        >
          {/* Floating 3D tokens behind the section */}
          <div className="pointer-events-none absolute right-[-100px] top-[10%] z-0 hidden h-[480px] w-[600px] opacity-90 lg:block">
            <Inline3D kind="floating-tokens" />
          </div>

          <div className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LABEL_ORDER.map((label, i) => (
              <LabelCard key={label} meta={LABEL_META[label]} index={i} />
            ))}
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* LIMITATIONS — staggered 3D tumble cards                    */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline"
          eyebrow="Limitations"
          heading="Where this tool is genuinely limited."
          description="A tool like this is only useful if its limits are stated plainly. Here is what we know is true about where ToxiScan can be wrong, incomplete, or simply the wrong tool for the job."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {LIMITATIONS.map((item, i) => (
              <LimitationItem
                key={item.title}
                title={item.title}
                description={item.description}
                accent={item.accent}
                index={i}
              />
            ))}
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* PRIVACY — single editorial card                            */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline"
          soft
          containerClassName="max-w-[720px]"
          eyebrow="Privacy"
          heading="Your scans are yours."
        >
          <Reveal axis="3d" direction="up" distance={32} rotateDeg={4} duration={1.0} blur>
            <p className="body-md text-body">
              Analysing a video requires signing in, because the scan is saved to your
              account — your history, anything you save with notes and tags, and the
              reports you export. Only you can read it. The playground is the exception:
              text you type there is scored and returned, and nothing about it is kept.
            </p>
          </Reveal>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* TECH STACK — list with parallax items                      */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline"
          eyebrow="Built with"
          heading="The stack behind the pipeline."
        >
          <Reveal axis="3d" direction="up" distance={32} rotateDeg={4} duration={0.9} blur>
            <dl className="mt-10 flex flex-col">
              {TECH_STACK.map((item, i) => (
                <Parallax key={item.name} speed={20} mode="wrap">
                  <div
                    className="group relative flex flex-col gap-2 border-t border-hairline py-6 first:border-t-0 sm:flex-row sm:items-baseline sm:gap-8 transition-colors duration-500 hover:bg-[var(--color-surface-card)]"
                    style={{ paddingInline: '0.75rem', borderRadius: 'var(--radius-md)' }}
                  >
                    <dt className="title-sm w-full shrink-0 text-ink sm:w-[220px] flex items-baseline gap-3">
                      <span
                        className="caption text-muted-soft"
                        aria-hidden="true"
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="inline-block h-2 w-2 rounded-full transition-transform duration-500 group-hover:scale-150"
                        style={{ background: item.accent }}
                        aria-hidden="true"
                      />
                      {item.name}
                    </dt>
                    <dd className="body-sm text-body">{item.description}</dd>
                  </div>
                </Parallax>
              ))}
            </dl>
          </Reveal>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* CTA band — Aurora + magnetic button                        */}
        {/* ---------------------------------------------------------- */}
        <Section className="border-t border-hairline relative overflow-hidden">
          <Aurora />
          <div className="relative z-10 flex flex-col items-center text-center">
            <Reveal axis="3d" direction="up" distance={48} rotateDeg={6} duration={1.1} blur>
              <h2 className="display-lg max-w-[22ch]">
                See what the model does with your own sentence.
              </h2>
            </Reveal>
            <Reveal axis="3d" direction="up" distance={24} rotateDeg={4} duration={0.9} delay={0.25}>
              <div className="mt-10">
                <MagneticButton
                  href="/playground"
                  variant="primary"
                  size="lg"
                  trailingIcon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                >
                  Open the playground
                </MagneticButton>
              </div>
            </Reveal>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
