'use client';

import { useId, useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: 'How accurate is the scoring?',
    answer:
      'Each comment is scored by a RuBERT-based multilingual toxicity model hosted on Hugging Face. It performs well across the languages and domains it was trained on, but accuracy varies with dialect, slang and context — we would rather be honest about that than quote a single number that will not hold everywhere.',
  },
  {
    question: 'Can I analyse a private video or a live stream?',
    answer:
      'Only public videos with comments enabled. Private, unlisted, age-restricted and members-only videos are not accessible through the YouTube Data API, and live streams do not expose a stable comment thread while they are running.',
  },
  {
    question: 'What is the maximum number of comments?',
    answer:
      'Two hundred per request. That is the cap on both ends — the form will not let you ask for more, and the backend enforces the same limit.',
  },
  {
    question: 'How long does an analysis take?',
    answer:
      'Typically ten to sixty seconds. Comments are scored in small batches, so the exact time depends on how many comments you request and how the model host is responding in that moment — occasionally a few minutes for the full two hundred.',
  },
  {
    question: 'Do you store the comments or the results?',
    answer:
      'No. Each analysis is a per-request round trip — comments are fetched, scored and returned to your browser. Nothing is written to a database and nothing is shared with a third party beyond the model host doing the scoring.',
  },
  {
    question: 'Can I export the results?',
    answer:
      'Yes. From the results page you can download the full analysis as JSON or as a CSV, ready for a spreadsheet or a closer look elsewhere.',
  },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      style={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
        flexShrink: 0,
      }}
    >
      <path
        d="M4 7L9 12L14 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FaqItem({ entry }: { entry: FaqEntry }) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const buttonId = `${baseId}-button`;
  const panelId = `${baseId}-panel`;
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="border-b border-hairline">
      <h3 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full min-h-[44px] items-center justify-between gap-4 py-5 text-left"
        >
          <span className="title-sm text-ink">{entry.question}</span>
          <span className="text-muted">
            <ChevronIcon open={open} />
          </span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
            }
            style={{ overflow: 'hidden' }}
          >
            <p className="body-md pb-6 pr-8 text-body">{entry.answer}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export interface FaqProps {
  className?: string;
}

export function Faq({ className }: FaqProps) {
  return (
    <div className={className}>
      {FAQ_ENTRIES.map((entry) => (
        <FaqItem key={entry.question} entry={entry} />
      ))}
    </div>
  );
}
