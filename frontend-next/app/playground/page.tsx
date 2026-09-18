import type { Metadata } from 'next';
import { Nav } from '@/components/ui/Nav';
import { Footer } from '@/components/ui/Footer';
import { Section } from '@/components/ui/Section';
import { Scene } from '@/components/three/Scene';
import { OrbField } from '@/components/three/OrbField';
import { Playground } from '@/components/playground/Playground';

export const metadata: Metadata = {
  title: 'Playground — ToxiScan',
  description:
    'Type any sentence and see ToxiScan score it live for insults, obscenity, threats and dangerous content — a direct, tactile look at the model behind the analysis.',
};

export default function PlaygroundPage() {
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
            <span className="caption-uppercase text-muted fade-rise">Playground</span>
            <h1
              className="display-xl fade-rise mt-5 max-w-[20ch]"
              style={{ animationDelay: '0.05s' }}
            >
              See the model think, one sentence at a time.
            </h1>
            <p
              className="body-md fade-rise mt-6 max-w-[54ch] text-body"
              style={{ animationDelay: '0.1s' }}
            >
              This is the same RuBERT-based toxicity model that scores every comment on
              a full video analysis — here it is stripped down to a single text box, so
              you can see exactly how it reads a sentence.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------- */}
        {/* Playground                                                 */}
        {/* ---------------------------------------------------------- */}
        <Section className="section-rhythm border-t border-hairline">
          <div className="editorial-container">
            <Playground />
          </div>
        </Section>

        {/* ---------------------------------------------------------- */}
        {/* Honesty note                                               */}
        {/* ---------------------------------------------------------- */}
        <Section className="section-rhythm border-t border-hairline bg-canvas-soft">
          <div className="editorial-container max-w-[720px]">
            <span className="caption-uppercase text-muted">Worth knowing</span>
            <h2 className="display-lg mt-4 max-w-[22ch]">
              A probability, not a verdict.
            </h2>
            <p className="body-md mt-4 text-body">
              The model behind this playground is a RuBERT-derived classifier. It is
              strong on the languages and phrasing patterns it was trained on, and less
              certain outside them — sarcasm, slang, and non-English text can all shift
              its confidence. Treat every result here as a probability worth reading
              carefully, not an automatic judgement of the person who wrote it.
            </p>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
