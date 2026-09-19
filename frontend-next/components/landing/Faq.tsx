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
      'Each comment goes to one of two classifiers depending on its language — indic-abusive-allInOne-MuRIL for Indic and code-mixed text, multilingual-toxic-xlm-roberta for English and European languages — and then to Llama 3.3 70B for sarcasm, context and severity. Accuracy is strongest on English and weakest where MuRIL only says abusive or not and the language model fills in the rest. We would rather be honest about that than quote a single number that will not hold everywhere.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'To analyse a video, yes — the scan is saved to your account so you have a history, can keep analyses with notes and tags, and can export reports later. The playground, where you score your own text one piece or a batch at a time, works without signing in.',
  },
  {
    question: 'Can I analyse a private video or a live stream?',
    answer:
      'Only public videos with comments enabled. Private, unlisted, age-restricted and members-only videos are not accessible through the YouTube Data API, and live streams do not expose a stable comment thread while they are running.',
  },
  {
    question: 'What is the maximum number of comments?',
    answer:
      'Two hundred per scan, replies included. That is the cap on both ends — the form will not let you ask for more, and the server enforces the same limit.',
  },
  {
    question: 'How long does an analysis take?',
    answer:
      'Typically ten to sixty seconds. Comments are scored in small batches and then read a second time by the language model, so the exact time depends on how many you request and how the two hosts are responding in that moment — occasionally a few minutes for the full two hundred.',
  },
  {
    question: 'Do you store the comments or the results?',
    answer:
      'Video scans are saved to your account: the comments, their scores and the report. They are visible to you and nobody else, and you can delete a scan whenever you want. Playground text is scored and returned without being kept.',
  },
  {
    question: 'What if the model gets a comment wrong?',
    answer:
      'Flag it. Every comment in a report can be marked as wrongly labelled, with the label you think is right. Accepted flags become ground truth, which is what precision, recall and F1 are measured against — so the corrections are not just filed away.',
  },
  {
    question: 'Can I export the results?',
    answer:
      'Yes. From a saved analysis you can download the full report as CSV for a spreadsheet, as JSON to build on, or as a print-ready page your browser can save to PDF.',
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
