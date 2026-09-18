import type { LabelMeta } from '@/lib/labels';

export interface LabelCardProps {
  meta: LabelMeta;
}

/** One of the five toxicity-state cards on the About page. Server component. */
export function LabelCard({ meta }: LabelCardProps) {
  return (
    <article className="hairline-card relative overflow-hidden p-6 transition-shadow hover:shadow-[var(--shadow-soft-drop)]">
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
}

export default LabelCard;
