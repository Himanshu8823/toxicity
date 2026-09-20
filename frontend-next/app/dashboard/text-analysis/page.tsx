import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guards';
import { Playground } from '@/components/playground/Playground';

export const metadata: Metadata = {
  title: 'Text analysis — ToxiScan',
  description:
    'Type any sentence and see ToxiScan score it live across nine categories and five levels of severity — the same models that analyse every comment on a full video scan.',
};

/**
 * The playground, inside the dashboard.
 *
 * Identical to the public `/playground` route, minus the marketing chrome
 * (3D scene, hero, honesty section). The component is self-contained — it
 * owns its own header, textarea, example chips and result panel — so the
 * dashboard layout only needs to give it room and a heading.
 */
export default async function DashboardTextAnalysisPage() {
  await requireUser();
  return (
    <div className="px-4 pt-8 pb-12 sm:px-6 lg:px-10">
      <header className="mb-6 max-w-2xl">
        <span className="caption-uppercase text-muted">Quick test</span>
        <h1 className="display-sm mt-2 text-ink">Text analysis</h1>
        <p className="body-sm mt-2 text-muted">
          Type one sentence and watch the same models that score a full video
          scan read it back to you. Category, severity, detected language and
          which model handled it — no scan saved, no entry on your history.
        </p>
      </header>

      <Playground />
    </div>
  );
}
