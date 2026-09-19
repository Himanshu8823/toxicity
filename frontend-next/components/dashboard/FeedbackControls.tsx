'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Severity, ToxicityCategory } from '@/lib/db/schema';
import {
  CATEGORIES,
  CATEGORY_META,
  SEVERITIES,
  SEVERITY_META,
} from '@/lib/analysis/taxonomy';
import { cn } from '@/lib/utils';

/**
 * Per-comment human-in-the-loop controls.
 *
 * This is the only place in the product where a person can contradict the
 * model, and the whole point of `/admin/metrics` downstream — precision and
 * recall computed from accepted feedback rather than from the model marking
 * its own homework.
 *
 * Because of that the controls have to be *easy* to reach but quiet enough to
 * ignore. A reader is here to read a verdict, not to grade one, so these are
 * text buttons with a hairline that appears on hover rather than filled
 * buttons competing with the category and severity badges directly above them.
 *
 * No red/green anywhere. The app's entire job is judging tone; shouting a
 * verdict back in alarm colours would contradict the thing it is measuring.
 * Agreement and disagreement are both just ink.
 */

/** What the user already told us about this prediction, if anything. */
export interface ExistingFeedback {
  verdict: 'correct' | 'incorrect';
  correctedCategory: ToxicityCategory | null;
  correctedSeverity: Severity | null;
  note: string | null;
}

export interface FeedbackControlsProps {
  /** The `comment_analyses` row id — what the endpoint keys feedback on. */
  commentAnalysisId: string;
  /**
   * Resolved server-side by the scan detail page. `undefined` means "this page
   * did not look it up", not "there is none" — see `resting` below.
   */
  existing?: ExistingFeedback | null;
}

const NOTE_LIMIT = 1000;
/** Only worth showing a counter once the limit is plausibly in reach. */
const NOTE_COUNTER_FROM = 800;

/** A quiet text button — hairline on hover, never a fill. */
const QUIET_BUTTON =
  'caption inline-flex h-8 items-center rounded-[var(--radius-pill)] border border-transparent px-3 text-muted transition-colors duration-150 hover:border-hairline-strong hover:text-ink disabled:pointer-events-none disabled:opacity-50';

/** A picker chip. Selection is carried by ink weight and border, not by fill. */
function chipClass(selected: boolean): string {
  return cn(
    'caption inline-flex h-8 items-center rounded-[var(--radius-pill)] border px-3 transition-colors duration-150',
    selected
      ? 'border-ink bg-surface-strong text-ink'
      : 'border-hairline-strong text-muted hover:border-ink hover:text-ink',
  );
}

type Phase = 'resting' | 'form' | 'saving' | 'done';

interface FailureState {
  message: string;
  /** A dead session needs a way back in, not a "try again" that cannot work. */
  sessionExpired: boolean;
}

export function FeedbackControls({
  commentAnalysisId,
  existing = null,
}: FeedbackControlsProps) {
  const [saved, setSaved] = useState<ExistingFeedback | null>(existing);
  const [phase, setPhase] = useState<Phase>('resting');
  const [failure, setFailure] = useState<FailureState | null>(null);

  // Draft state for the "this is wrong" form, seeded from whatever they said
  // last time so changing one field does not silently drop the others.
  const [category, setCategory] = useState<ToxicityCategory | null>(
    existing?.correctedCategory ?? null,
  );
  const [severity, setSeverity] = useState<Severity | null>(
    existing?.correctedSeverity ?? null,
  );
  const [note, setNote] = useState(existing?.note ?? '');

  const formRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const hintId = useId();
  const formId = useId();

  const formOpen = phase === 'form' || phase === 'saving';

  // Focus follows the disclosure both ways: into the form when it opens, back
  // to the trigger when it closes, so a keyboard user is never dropped at the
  // top of a 200-comment list.
  useEffect(() => {
    if (phase === 'form') formRef.current?.focus();
  }, [phase]);

  // Closing unmounts the form and remounts the trigger in the same commit, so
  // the focus call has to wait for that commit rather than run during the
  // handler — at handler time the trigger is still detached and `.focus()` on
  // it would silently do nothing, dumping the caret back on <body>.
  const [returnFocus, setReturnFocus] = useState(false);
  useEffect(() => {
    if (returnFocus && !formOpen) {
      triggerRef.current?.focus();
      setReturnFocus(false);
    }
  }, [returnFocus, formOpen]);

  const closeForm = useCallback(() => {
    setPhase('resting');
    setFailure(null);
    setReturnFocus(true);
  }, []);

  /**
   * One submit path for both verdicts, reporting success as a boolean rather
   * than by throwing: a rejected promise here would surface through the route
   * error boundary and take the whole scan page down over one unreachable
   * POST. Every failure mode lands in `failure` instead.
   */
  async function submit(
    verdict: 'correct' | 'incorrect',
    payload: Partial<ExistingFeedback> = {},
  ): Promise<boolean> {
    setFailure(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentAnalysisId,
          verdict,
          // `undefined` keys drop out of JSON entirely, which is what the
          // endpoint's optional fields expect — `null` would fail its schema.
          correctedCategory: payload.correctedCategory ?? undefined,
          correctedSeverity: payload.correctedSeverity ?? undefined,
          note: payload.note?.trim() ? payload.note.trim() : undefined,
        }),
      });

      if (response.status === 401) {
        setFailure({
          message: 'Your session has expired, so this was not recorded.',
          sessionExpired: true,
        });
        return false;
      }

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setFailure({
          message: body?.error ?? 'That could not be recorded. Please try again.',
          sessionExpired: false,
        });
        return false;
      }

      return true;
    } catch {
      setFailure({
        message:
          'That could not be recorded — the request never reached us. Check your connection.',
        sessionExpired: false,
      });
      return false;
    }
  }

  async function agree() {
    // Optimistic: agreeing is the low-stakes, high-frequency action, and
    // waiting on a round trip to acknowledge a single tap makes scanning a
    // long list feel broken. The rollback below is the cost of that.
    const previous = saved;
    setSaved({
      verdict: 'correct',
      correctedCategory: null,
      correctedSeverity: null,
      note: null,
    });
    setPhase('saving');

    const ok = await submit('correct');
    if (!ok) setSaved(previous);
    setPhase('resting');
  }

  // Mirrors the endpoint's own rule: an "incorrect" verdict with neither a
  // correction nor a note says the model was wrong without saying how, which
  // is unusable as ground truth. Enforced here so the user is told before
  // they submit rather than after.
  const trimmedNote = note.trim();
  const canSubmit = category !== null || trimmedNote.length > 0;

  async function disagree() {
    if (!canSubmit) return;
    setPhase('saving');

    const ok = await submit('incorrect', {
      correctedCategory: category,
      correctedSeverity: severity,
      note: trimmedNote,
    });

    if (!ok) {
      setPhase('form');
      return;
    }

    setSaved({
      verdict: 'incorrect',
      correctedCategory: category,
      correctedSeverity: severity,
      note: trimmedNote || null,
    });
    setPhase('resting');
    setReturnFocus(true);
  }

  const busy = phase === 'saving';
  const remaining = NOTE_LIMIT - note.length;

  return (
    <div className="mt-4 border-t border-hairline pt-3">
      {/* The confirmed state, announced rather than merely rendered — a
          screen-reader user gets no visual cue that a tap landed. */}
      <div aria-live="polite">
        {saved && !formOpen && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="caption text-ink">
              {saved.verdict === 'correct'
                ? 'You marked this correct.'
                : 'You marked this wrong.'}
            </span>

            {saved.verdict === 'incorrect' && saved.correctedCategory && (
              <span className="caption text-muted">
                Should have been{' '}
                <span style={{ color: CATEGORY_META[saved.correctedCategory].ink }}>
                  {CATEGORY_META[saved.correctedCategory].display}
                </span>
                {saved.correctedSeverity && (
                  <>
                    {' · '}
                    <span style={{ color: SEVERITY_META[saved.correctedSeverity].ink }}>
                      {SEVERITY_META[saved.correctedSeverity].display}
                    </span>
                  </>
                )}
              </span>
            )}

            {saved.verdict === 'incorrect' && saved.note && (
              <span className="caption break-words text-muted-soft">
                “{saved.note}”
              </span>
            )}
          </div>
        )}
      </div>

      {/* The trigger row stays mounted while the form is open rather than
          being swapped out for it. Unmounting the trigger would mean
          `aria-expanded` never actually reads `true` to anyone — the state it
          exists to report would only ever be announced in one direction. The
          gap above it is conditional because a `first:` variant cannot see
          that the aria-live wrapper above is empty. */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-2 gap-y-1',
          saved && !formOpen && 'mt-2',
        )}
      >
        {!saved && !formOpen && (
          <span className="caption text-muted">Is this right?</span>
        )}

        {!formOpen && (
          <button
            type="button"
            onClick={agree}
            disabled={busy}
            aria-pressed={saved?.verdict === 'correct'}
            className={cn(
              QUIET_BUTTON,
              saved?.verdict === 'correct' && 'border-hairline-strong text-ink',
            )}
          >
            {saved ? 'Looks right after all' : 'Looks right'}
          </button>
        )}

        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (formOpen) {
              closeForm();
              return;
            }
            setFailure(null);
            setPhase('form');
          }}
          disabled={busy}
          aria-expanded={formOpen}
          aria-controls={formId}
          className={cn(
            QUIET_BUTTON,
            (formOpen || saved?.verdict === 'incorrect') &&
              'border-hairline-strong text-ink',
          )}
        >
          {formOpen
            ? 'Hide the correction form'
            : saved?.verdict === 'incorrect'
              ? 'Change what you said'
              : 'This is wrong'}
        </button>

        {busy && <span className="caption text-muted-soft">Saving…</span>}
      </div>

      {formOpen && (
        <div
          id={formId}
          ref={formRef}
          tabIndex={-1}
          role="group"
          aria-labelledby={headingId}
          // Keyed off the trigger rather than a modal: this correction belongs
          // beside the comment it is about, and a dialog would hide it.
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              closeForm();
            }
          }}
          className="mt-3 rounded-[var(--radius-lg)] border border-hairline bg-canvas-soft p-3 focus:outline-none sm:p-4"
        >
          <h4 id={headingId} className="caption-uppercase text-muted">
            What should it have been?
          </h4>

          <fieldset className="mt-3 border-0 p-0" disabled={busy}>
            <legend className="caption text-muted">Category</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((value) => {
                const meta = CATEGORY_META[value];
                const selected = category === value;
                return (
                  <button
                    key={value}
                    type="button"
                    // A toggle, not a radio: tapping the chosen one again
                    // clears it, which is the only way back to "note only"
                    // once a category has been picked.
                    onClick={() => setCategory(selected ? null : value)}
                    aria-pressed={selected}
                    title={meta.description}
                    className={chipClass(selected)}
                    style={selected ? { color: meta.ink } : undefined}
                  >
                    {meta.display}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mt-4 border-0 p-0" disabled={busy}>
            <legend className="caption text-muted">
              Severity <span className="text-muted-soft">(optional)</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SEVERITIES.map((value) => {
                const meta = SEVERITY_META[value];
                const selected = severity === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSeverity(selected ? null : value)}
                    aria-pressed={selected}
                    title={meta.description}
                    className={chipClass(selected)}
                    style={selected ? { color: meta.ink } : undefined}
                  >
                    {meta.display}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-4">
            <label
              htmlFor={`${formId}-note`}
              className="caption text-muted"
            >
              Why?{' '}
              <span className="text-muted-soft">
                (optional if you picked a category)
              </span>
            </label>
            <textarea
              id={`${formId}-note`}
              value={note}
              disabled={busy}
              onChange={(event) =>
                setNote(event.target.value.slice(0, NOTE_LIMIT))
              }
              maxLength={NOTE_LIMIT}
              rows={3}
              placeholder="Sarcasm the model read literally, a slur it missed, context it could not see…"
              className="body-sm mt-1.5 block w-full max-w-full resize-y rounded-[var(--radius-md)] border border-hairline-strong bg-surface-card px-3 py-2 text-ink placeholder:text-muted-soft focus:border-2 focus:border-ink focus:outline-none disabled:opacity-50"
            />
            {note.length >= NOTE_COUNTER_FROM && (
              <p aria-live="polite" className="caption mt-1 text-muted tabular-nums">
                {remaining} character{remaining === 1 ? '' : 's'} left
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={disagree}
              disabled={!canSubmit || busy}
              aria-describedby={canSubmit ? undefined : hintId}
              className="btn-type inline-flex h-9 items-center justify-center rounded-[var(--radius-pill)] bg-primary px-4 text-on-primary transition-colors duration-150 hover:bg-primary-active disabled:opacity-40"
            >
              {busy ? 'Sending…' : 'Submit correction'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={busy}
              className="btn-type inline-flex h-9 items-center justify-center rounded-[var(--radius-pill)] border border-hairline-strong px-4 text-ink transition-colors duration-150 hover:border-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {/* Always present, not conditionally rendered: a disabled button that
              never says why is a dead end, and appearing only on hover would
              hide the reason from touch and keyboard entirely. */}
          {!canSubmit && (
            <p id={hintId} className="caption mt-2 text-muted">
              Pick a category or write a note first — “wrong” on its own cannot
              be used to score the model.
            </p>
          )}
        </div>
      )}

      {failure && (
        <p role="alert" className="caption mt-2 text-body">
          {failure.message}
          {failure.sessionExpired && (
            <>
              {' '}
              <Link
                href="/login"
                className="text-ink underline underline-offset-4"
              >
                Sign in again
              </Link>{' '}
              and your correction will save.
            </>
          )}
        </p>
      )}
    </div>
  );
}

export default FeedbackControls;
