import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/ui/Nav';
import { Footer } from '@/components/ui/Footer';
import { Section } from '@/components/ui/Section';
import { PipelineStep } from '@/components/about/PipelineStep';
import { LabelCard } from '@/components/about/LabelCard';
import { LimitationItem } from '@/components/about/LimitationItem';
import { LABEL_META, LABEL_ORDER } from '@/lib/labels';

export const metadata: Metadata = {
  title: 'About — ToxiScan',
  description:
    'What ToxiScan is, how the pipeline actually works, what the five toxicity states mean, and an honest account of where the tool is limited.',
};

const PIPELINE_STEPS = [
  {
    number: '01',
    title: 'A URL becomes a video id',
    description:
      'You paste a YouTube video URL. ToxiScan parses it to extract the video id — the same id YouTube itself uses to identify the video, regardless of which URL shape you pasted (watch, share link, or Shorts).',
  },
  {
    number: '02',
    title: 'Comments are fetched',
    description:
      'ToxiScan calls the YouTube Data API v3 for that video and pulls its top-level comments, up to two hundred per request. Replies to comments are not included in this pass.',
  },
  {
    number: '03',
    title: 'Each comment is scored',
    description:
      'Every comment is sent to a RuBERT-based toxicity model hosted on Hugging Face Inference, which returns a probability for each of five categories.',
  },
  {
    number: '04',
    title: 'Labels are normalised and aggregated',
    description:
      'Raw model output is mapped onto five canonical states, then rolled up into an overall report: category breakdowns, confidence, and the specific comments driving each label.',
  },
] as const;

const LIMITATIONS = [
  {
    title: 'A probability, not a verdict',
    description:
      'Every score is the model’s confidence, not a fact. A high score means the language pattern-matches a harmful category closely — it is not a ruling on the person who wrote it.',
  },
  {
    title: 'Uneven across languages',
    description:
      'The model is derived from a Russian BERT checkpoint. It was tuned for multilingual toxicity detection, but its confidence is strongest on the languages and phrasing it saw most in training, and noticeably less certain elsewhere.',
  },
  {
    title: 'Public videos only',
    description:
      'Only videos that are public and have comments enabled can be analysed. Private, unlisted, age-restricted and members-only videos are not reachable through the YouTube Data API.',
  },
  {
    title: 'Top-level comments only',
    description:
      'Replies within comment threads are not fetched or scored in this version — only the top-level comments on the video itself.',
  },
  {
    title: 'A sample, not the whole thread',
    description:
      'Analyses cap at two hundred comments. On a video with thousands of comments, that is a sample of the conversation, not a census of it — a real signal, but not the complete picture.',
  },
  {
    title: 'It informs, it does not moderate',
    description:
      'ToxiScan does not take any action on YouTube, does not report anyone, and does not moderate a comment section. It is a lens for understanding a conversation, not an enforcement tool.',
  },
] as const;

const TECH_STACK = [
  {
    name: 'Next.js + React',
    description: 'The frontend you are using now — server-rendered pages, a client playground.',
  },
  {
    name: 'Express',
    description: 'A small backend that talks to the YouTube API and the model host, and exposes the analysis endpoints this site calls.',
  },
  {
    name: 'YouTube Data API v3',
    description: 'The source of every video and comment ToxiScan reads.',
  },
  {
    name: 'Hugging Face Inference',
    description: 'Hosts the model and serves each scoring request.',
  },
  {
    name: 'RuBERT toxicity model',
    description: 'The classifier itself — a RuBERT-derived model fine-tuned to score text across five toxicity categories.',
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main>
        {/* ---------------------------------------------------------- */}
        {/* Hero                                                       */}
        {/* ---------------------------------------------------------- */}
        <section className="border-b border-hairline">
          <div className="editorial-container pt-20 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24">
            <span className="caption-uppercase text-muted">About</span>
            <h1 className="display-xl mt-5 max-w-[22ch]">
              ToxiScan reads a YouTube comment section and tells you its shape.
            </h1>
            <p className="body-md mt-6 max-w-[58ch] text-body">
              It scores every comment it can reach for insults, obscenity, threats and
              dangerous content, then turns that into a report you can actually read —
              built for creators, moderators and anyone curious what a comment section
              is really saying before they scroll through it themselves.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* How it works                                               */}
        {/* ---------------------------------------------------------- */}
        <Section className="section-rhythm border-b border-hairline">
          <div className="editorial-container">
            <span className="caption-uppercase text-muted">How it works</span>
            <h2 className="display-lg mt-4 max-w-[26ch]">
              The genuine pipeline, no simplifications.
            </h2>

            <div className="mt-14 grid gap-10 sm:grid-cols-2">
              {PIPELINE_STEPS.map((step) => (
                <PipelineStep key={step.number} {...step} />
              ))}
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* The five states                                            */}
        {/* ---------------------------------------------------------- */}
        <Section className="section-rhythm border-b border-hairline bg-canvas-soft">
          <div className="editorial-container">
            <span className="caption-uppercase text-muted">The five states</span>
            <h2 className="display-lg mt-4 max-w-[26ch]">
              Every comment lands in one of five categories.
            </h2>
            <p className="body-md mt-4 max-w-[56ch] text-body">
              Severity is never carried by a loud red banner — it is carried by
              language and by the ink colour used in charts and text. Pastel is
              atmosphere only.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LABEL_ORDER.map((label) => (
                <LabelCard key={label} meta={LABEL_META[label]} />
              ))}
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* Limitations                                                */}
        {/* ---------------------------------------------------------- */}
        <Section className="section-rhythm border-b border-hairline">
          <div className="editorial-container">
            <span className="caption-uppercase text-muted">Limitations</span>
            <h2 className="display-lg mt-4 max-w-[26ch]">
              Where this tool is genuinely limited.
            </h2>
            <p className="body-md mt-4 max-w-[60ch] text-body">
              A tool like this is only useful if its limits are stated plainly. Here is
              what we know is true about where ToxiScan can be wrong, incomplete, or
              simply the wrong tool for the job.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {LIMITATIONS.map((item) => (
                <LimitationItem key={item.title} {...item} />
              ))}
            </div>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* Privacy                                                    */}
        {/* ---------------------------------------------------------- */}
        <Section className="section-rhythm border-b border-hairline bg-canvas-soft">
          <div className="editorial-container max-w-[720px]">
            <span className="caption-uppercase text-muted">Privacy</span>
            <h2 className="display-lg mt-4 max-w-[20ch]">
              Nothing you analyse is stored.
            </h2>
            <p className="body-md mt-4 text-body">
              Every analysis is a per-request round trip. A URL or a piece of text comes
              in, comments are fetched and scored, and the result is sent straight back
              to your browser. ToxiScan does not write comments, video URLs or analysis
              results to a database, and does not retain them after the response is
              sent.
            </p>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* Tech                                                       */}
        {/* ---------------------------------------------------------- */}
        <Section className="section-rhythm border-b border-hairline">
          <div className="editorial-container max-w-[720px]">
            <span className="caption-uppercase text-muted">Built with</span>
            <h2 className="display-lg mt-4 max-w-[20ch]">
              The stack behind the pipeline.
            </h2>

            <dl className="mt-10 flex flex-col">
              {TECH_STACK.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col gap-1 border-t border-hairline py-5 first:border-t-0 sm:flex-row sm:items-baseline sm:gap-8"
                >
                  <dt className="title-sm w-full shrink-0 text-ink sm:w-[220px]">
                    {item.name}
                  </dt>
                  <dd className="body-sm text-body">{item.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* CTA band                                                   */}
        {/* ---------------------------------------------------------- */}
        <Section className="section-rhythm">
          <div className="editorial-container flex flex-col items-center text-center">
            <h2 className="display-lg max-w-[22ch]">
              See what the model does with your own sentence.
            </h2>
            <Link
              href="/playground"
              className="btn-type mt-8 inline-flex h-11 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-6 text-on-primary transition-colors hover:bg-primary-active"
            >
              Open the playground
            </Link>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
