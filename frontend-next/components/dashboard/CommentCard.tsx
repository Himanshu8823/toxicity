'use client';

import type { Comment, CommentAnalysis } from '@/lib/db/schema';
import { CategoryBadge } from './CategoryBadge';
import { SeverityBadge } from './SeverityBadge';
import { LanguageBadge } from './LanguageBadge';
import { FeedbackControls, type ExistingFeedback } from './FeedbackControls';
import { formatConfidence, formatCount, formatDate } from './format';

export interface CommentCardProps {
  comment: Comment;
  /** `null` when the comment errored during analysis and was never scored. */
  analysis: CommentAnalysis | null;
  /**
   * What this user already said about the analysis, resolved server-side by
   * the scan detail page. `null` means they have said nothing yet.
   */
  feedback?: ExistingFeedback | null;
}

/** Small inline glyphs for the three research signals. */
const SIGNAL_ICONS = {
  sarcasm: 'M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  context: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z',
  disagree: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
} as const;

function Signal({
  icon,
  label,
  explanation,
  tone,
}: {
  icon: string;
  label: string;
  explanation: string;
  tone: string;
}) {
  return (
    <span
      className="caption inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-1"
      style={{ color: tone, borderColor: tone }}
      title={explanation}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={icon} />
      </svg>
      {label}
      <span className="sr-only">. {explanation}</span>
    </span>
  );
}

/**
 * One analysed comment.
 *
 * The three research signals — sarcasm, context shift, and the Groq rationale
 * — are the point of this card, so they sit above the fold of it rather than
 * behind a disclosure. A sarcastic comment scored as non-toxic looks like a
 * miss until you can see that the model knew it was sarcasm; the rationale is
 * what turns a number into something a person can argue with.
 *
 * Model disagreement gets the same treatment: it is not an error, it is the
 * single best cue for which rows a human should look at first.
 */
export function CommentCard({ comment, analysis, feedback }: CommentCardProps) {
  return (
    <li className="hairline-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="body-strong text-ink">
          {comment.authorName?.trim() || 'Unknown author'}
        </span>
        {comment.publishedAt && (
          <time
            dateTime={new Date(comment.publishedAt).toISOString()}
            className="caption text-muted-soft"
          >
            {formatDate(comment.publishedAt)}
          </time>
        )}
        {comment.parentId && (
          <span className="caption text-muted-soft">· reply</span>
        )}
        {(comment.likeCount ?? 0) > 0 && (
          <span className="caption text-muted-soft tabular-nums">
            · {formatCount(comment.likeCount ?? 0)} likes
          </span>
        )}
      </div>

      <p className="body-md mt-2 whitespace-pre-wrap break-words text-body">
        {comment.text}
      </p>

      {analysis ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <CategoryBadge category={analysis.category} withTitle />
            <SeverityBadge severity={analysis.severity} showScale />
            <LanguageBadge code={analysis.language ?? comment.language} />
            <span className="caption text-muted tabular-nums">
              {formatConfidence(analysis.confidence)} confidence
            </span>
            <span className="caption text-muted-soft">{analysis.modelName}</span>
          </div>

          {(analysis.isSarcastic ||
            analysis.contextShifted ||
            analysis.modelsDisagree) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.isSarcastic && (
                <Signal
                  icon={SIGNAL_ICONS.sarcasm}
                  label="Sarcasm"
                  explanation="Read as sarcastic, so the literal wording was not taken at face value."
                  tone="#5f4d7a"
                />
              )}
              {analysis.contextShifted && (
                <Signal
                  icon={SIGNAL_ICONS.context}
                  label="Context-shifted"
                  explanation="The verdict changed once the parent comment was taken into account."
                  tone="#3d5f80"
                />
              )}
              {analysis.modelsDisagree && (
                <Signal
                  icon={SIGNAL_ICONS.disagree}
                  label="Models disagree"
                  explanation="The classifier and the language model reached different verdicts — worth a human look."
                  tone="#8a5a3c"
                />
              )}
            </div>
          )}

          {analysis.rationale && (
            <blockquote className="mt-3 border-l-2 border-hairline-strong pl-4">
              <p className="caption-uppercase text-muted-soft">Why</p>
              <p className="body-sm mt-1 text-body">{analysis.rationale}</p>
            </blockquote>
          )}

          {/* Only a scored comment has a prediction to dispute — `analysis.id`
              is what the feedback endpoint keys on. */}
          <FeedbackControls
            commentAnalysisId={analysis.id}
            existing={feedback}
          />
        </>
      ) : (
        <p className="caption mt-4 text-muted">
          This comment was fetched but never scored — the classifier errored on it.
        </p>
      )}
    </li>
  );
}

export default CommentCard;
