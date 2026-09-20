import type { Metadata } from 'next';
import { SiteNav } from '@/components/ui/SiteNav';
import { Footer } from '@/components/ui/Footer';
import { Section } from '@/components/ui/Section';
import { Scene } from '@/components/three/Scene';
import { OrbField } from '@/components/three/OrbField';
import { Playground } from '@/components/playground/Playground';
import { PageRobot } from '@/components/landing/PageRobot';

export const metadata: Metadata = {
  title: 'Playground — ToxiScan',
  description:
    'Type any sentence and see ToxiScan score it live across nine categories and five levels of severity — a direct, tactile look at the models behind the analysis.',
};

export default function PlaygroundPage() {
  return (
    <>
      <SiteNav />
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
              These are the same models that score every comment on a full video
              analysis — here they are stripped down to a single text box, so you can
              see exactly how a sentence is read. No sign-in needed.
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
              Your text is routed by the language detected in it: MuRIL for Indic and
              code-mixed writing, XLM-RoBERTa for English and European languages, with a
              language model reading it again for sarcasm and severity. Each is stronger
              on the phrasing it was trained on and less certain outside it. Treat every
              result here as a probability worth reading carefully, not an automatic
              judgement of the person who wrote it.
            </p>
          </div>
        </Section>
      </main>
      <Footer />
      <PageRobot />
    </>
  );
}
