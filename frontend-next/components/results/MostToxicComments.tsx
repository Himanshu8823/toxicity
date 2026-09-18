import type { AnalysedComment } from '@/lib/types';
import { LABEL_META } from '@/lib/labels';
import { truncate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export interface MostToxicCommentsProps {
  comments: AnalysedComment[];
}

const TEXT_PREVIEW_LIMIT = 320;

/**
 * The top-10 harmful-only comments the backend already ranked. Rendered as
 * plain text (never dangerouslySetInnerHTML) since this is untrusted
 * YouTube content. Empty state when the video had nothing harmful to show.
 */
export function MostToxicComments({ comments }: MostToxicCommentsProps) {
  return (
    <div className="editorial-container">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h3 className="display-sm text-ink">Most flagged comments</h3>
        <span className="caption-uppercase text-muted">Top {comments.length || 0}</span>
      </div>

      {comments.length === 0 ? (
        <div className="hairline-card px-6 py-12 text-center">
          <p className="body-sm text-muted">No harmful comments were flagged in this batch.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment, index) => {
            const meta = LABEL_META[comment.mostLikelyCategory] ?? LABEL_META.dangerous;
            const confidencePct = Number.isFinite(comment.confidence) ? comment.confidence * 100 : 0;
            return (
              <li key={`${index}-${comment.text.slice(0, 24)}`} className="hairline-card flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge labelTone={comment.mostLikelyCategory}>{meta.display}</Badge>
                  <span className="caption text-muted">{confidencePct.toFixed(1)}% confidence</span>
                </div>
                <p className="body-md whitespace-pre-wrap break-words text-body">
                  {truncate(comment.text ?? '', TEXT_PREVIEW_LIMIT)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default MostToxicComments;
