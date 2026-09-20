'use client';

import Link from 'next/link';
import { ClientNav } from '@/components/ui/ClientNav';
import { Footer } from '@/components/ui/Footer';
import { Section } from '@/components/ui/Section';
import { LimitationItem } from '@/components/about/LimitationItem';
import { LabelGallery } from '@/components/landing/LabelGallery';
import {
  Reveal,
  Parallax,
  StaggerChildren,
  StaggerItem,
  CharSplit,
  MagneticButton,
  Aurora,
  CardSpotlight,
  HorizontalScroll,
} from '@/components/motion';
import { StepCard, type PipelineStepCard } from '@/components/landing/StepCard';
import { Inline3D } from '@/components/three/Inline3D';
import { GravityStarsBackground } from '@/components/animate-ui/components/backgrounds/gravity-stars';
import { PageRobot } from '@/components/landing/PageRobot';

const PIPELINE_STEPS: PipelineStepCard[] = [
  {
    number: '01',
    title: 'A URL becomes a video id',
    description:
      'You paste a YouTube video URL. ToxiScan parses it to extract the video id — the same id YouTube itself uses to identify the video, regardless of which URL shape you pasted (watch, share link, or Shorts).',
    illustration: 'paste',
    accent: '#a8c8e8',
  },
  {
    number: '02',
    title: 'Comments and replies are fetched',
    description:
      'ToxiScan calls the YouTube Data API v3 for that video and pulls up to two hundred comments per request — replies included, so a reply can later be read against the comment it answers.',
    illustration: 'fetch',
    accent: '#c8b8e0',
  },
  {
    number: '03',
    title: 'Each comment is routed by language',
    description:
      'Hindi, Marathi, Bengali, Tamil, Telugu, Urdu and romanised or code-mixed Indic text go to Hate-speech-CNERG/indic-abusive-allInOne-MuRIL. English and European languages go to unitary/multilingual-toxic-xlm-roberta.',
    illustration: 'score',
    accent: '#a7e5d3',
  },
  {
    number: '04',
    title: 'A language model reads it again',
    description:
      'Llama 3.3 70B, running on Groq, catches what a classifier cannot express: sarcasm, implicit harm, cruelty that exists only in context. It also sets severity, and the category for Indic text, since MuRIL only answers abusive or not.',
    illustration: 'aggregate',
    accent: '#f4c5a8',
  },
  {
    number: '05',
    title: 'Read the result',
    description:
      'An overall score, a breakdown across nine categories, and the comments driving each one. Save it, export it, or flag anything the model got wrong.',
    illustration: 'read',
    accent: '#e8b8c4',
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

export default function AboutPage() {
  return (
    <>
      <ClientNav />

      <div className="grain" aria-hidden="true" />

      <main>
        {/* ---------------------------------------------------------- */}
        {/* HERO — char-split headline                                  */}
        {/* ---------------------------------------------------------- */}
        <section className="relative overflow-hidden">
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
        {/* HOW IT WORKS — vertical scroll drives a horizontal chapter */}
        {/* ---------------------------------------------------------- */}
        <HorizontalScroll
          distanceVh={3.5}
          className="relative overflow-hidden bg-[var(--color-canvas-soft)]"
          innerClassName="px-0"
        >
          {PIPELINE_STEPS.map((step, i) => (
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
      <PageRobot />
    </>
  );
}
