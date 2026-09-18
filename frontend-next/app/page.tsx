import { Nav } from '@/components/ui/Nav';
import { Footer } from '@/components/ui/Footer';
import { Section } from '@/components/ui/Section';
import { Scene } from '@/components/three/Scene';
import { OrbField } from '@/components/three/OrbField';
import { AnalyseForm } from '@/components/landing/AnalyseForm';
import { Faq } from '@/components/landing/Faq';
import { LABEL_META, LABEL_ORDER } from '@/lib/labels';

const STEPS = [
  {
    number: '01',
    title: 'Paste a link',
    description:
      'Drop in the URL of any public YouTube video with comments enabled. No login, no channel access, no setup.',
  },
  {
    number: '02',
    title: 'Comments are scored',
    description:
      'Up to two hundred comments are pulled and run through a RuBERT-based toxicity model, one small batch at a time.',
  },
  {
    number: '03',
    title: 'Read the shape of it',
    description:
      'See an overall toxicity score, a breakdown across five categories, and the specific comments driving each one.',
  },
];

const CAPABILITIES = [
  {
    title: 'RuBERT toxicity scoring',
    description:
      'Every comment is classified by a multilingual RuBERT model hosted on Hugging Face — the same category of model used in production moderation pipelines.',
  },
  {
    title: 'Up to 200 comments per run',
    description:
      'Sample deeply enough to see a real pattern, not just the top few pinned replies. You choose the count, from ten to two hundred.',
  },
  {
    title: 'Per-category confidence',
    description:
      'Nothing is a single flat "toxic" flag. Each comment carries a confidence score against insult, obscenity, threat and dangerous content.',
  },
  {
    title: 'Interactive charts, not raw JSON',
    description:
      'The results page turns the analysis into readable charts and a sortable comment list — export to JSON or CSV whenever you need the raw data.',
  },
];

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        {/* ---------------------------------------------------------- */}
        {/* Hero                                                       */}
        {/* ---------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <Scene ariaHidden>
              <OrbField />
            </Scene>
          </div>
          <div className="editorial-container relative pt-20 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24">
            <span className="caption-uppercase text-muted fade-rise">ToxiScan</span>
            <h1 className="display-mega fade-rise mt-5 max-w-[16ch]" style={{ animationDelay: '0.05s' }}>
              Read the room before you read the comments.
            </h1>
            <p
              className="body-md fade-rise mt-6 max-w-[54ch] text-body"
              style={{ animationDelay: '0.1s' }}
            >
              ToxiScan scores every comment on a public YouTube video for insults,
              obscenity, threats and dangerous content, then shows you the shape of
              the conversation in seconds — before you scroll through it yourself.
            </p>

            <div
              id="analyse-form"
              className="fade-rise mt-10 max-w-[560px]"
              style={{ animationDelay: '0.15s' }}
            >
              <AnalyseForm />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* How it works                                               */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline"
          eyebrow="How it works"
          heading="Three steps between a link and an answer."
        >
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step) => (
              <div key={step.number}>
                <span className="display-sm text-muted-soft">{step.number}</span>
                <h3 className="title-md mt-4 text-ink">{step.title}</h3>
                <p className="body-sm mt-2 text-body">{step.description}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* The five states                                            */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline"
          soft
          eyebrow="The five states"
          heading="Every comment lands in one of five categories."
          description="Severity is never carried by a loud red banner — it is carried by language. Here is what each label means and how it is weighted."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LABEL_ORDER.map((label) => {
              const meta = LABEL_META[label];
              return (
                <article
                  key={label}
                  className="hairline-card relative overflow-hidden p-6 transition-shadow hover:shadow-[var(--shadow-soft-drop)]"
                >
                  <div
                    className="orb orb-drifting -right-10 -top-10 h-32 w-32"
                    style={{ background: meta.pastel }}
                    aria-hidden="true"
                  />
                  <h3 className="title-md relative" style={{ color: meta.ink }}>
                    {meta.display}
                  </h3>
                  <p className="body-sm relative mt-2 text-body">{meta.description}</p>
                  <span
                    className="caption-uppercase relative mt-5 inline-block rounded-[var(--radius-pill)] px-2.5 py-1"
                    style={{ background: 'var(--color-surface-strong)', color: meta.ink }}
                  >
                    {meta.harmful ? 'Harmful' : 'Clean'}
                  </span>
                </article>
              );
            })}
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* Capabilities                                               */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline"
          eyebrow="Capabilities"
          heading="What is actually happening under the hood."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {CAPABILITIES.map((item) => (
              <div key={item.title} className="hairline-card p-6">
                <h3 className="title-md text-ink">{item.title}</h3>
                <p className="body-sm mt-2 text-body">{item.description}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* FAQ                                                        */}
        {/* ---------------------------------------------------------- */}
        <Section
          className="border-t border-hairline"
          soft
          containerClassName="max-w-[800px]"
          eyebrow="Questions"
          heading="Before you paste a link."
        >
          <Faq />
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* CTA band                                                   */}
        {/* ---------------------------------------------------------- */}
        <Section className="border-t border-hairline">
          <div className="flex flex-col items-center text-center">
            <h2 className="display-lg max-w-[20ch]">
              See what a comment section is actually saying.
            </h2>
            <a
              href="#analyse-form"
              className="btn-type mt-8 inline-flex h-11 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-6 text-on-primary transition-colors hover:bg-primary-active"
            >
              Analyse a video
            </a>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
