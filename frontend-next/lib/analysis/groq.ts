import 'server-only';

import Groq from 'groq-sdk';
import { z } from 'zod';
import { CATEGORIES, SEVERITIES } from './taxonomy';
import type { Severity, ToxicityCategory } from '@/lib/db/schema';

/**
 * Groq enrichment.
 *
 * The classifiers answer "how toxic, roughly what kind". They cannot do the
 * three things this project actually needs beyond that:
 *
 *  1. **Sarcasm** — "Wow, you're really a genius 🙄" contains no abusive token
 *     and every keyword-based or fine-tuned classifier scores it clean.
 *  2. **Context** — "you should definitely do that" is harmless alone and
 *     hostile as a reply to someone describing self-harm.
 *  3. **Category for Indic text** — MuRIL only says abusive/not, so for Hindi
 *     and Marathi the category has to come from somewhere else.
 *
 * Comments go up in batches to stay inside the free tier: 30 requests/minute
 * and 14,400/day, so one call per comment would exhaust the daily budget on
 * seventy videos.
 */

/**
 * Verified against the live model list on 2026-09-19. The Llama 3.x models
 * this originally used were withdrawn from Groq's catalogue; `gpt-oss-120b`
 * was picked from what remains because it was the only candidate that both
 * caught sarcasm in an unflagged comment *and* correctly reported the
 * classifier as wrong when it had been. If it disappears in turn,
 * `openai/gpt-oss-20b` behaved nearly as well at roughly half the latency.
 */
const MODEL = 'openai/gpt-oss-120b';
const BATCH_SIZE = 20;
const MAX_ATTEMPTS = 2;

let client: Groq | null = null;

function getClient(): Groq | null {
  if (client) return client;

  const apiKey = process.env.GROQ_API_KEY;
  // Enrichment is optional by design: without a key the pipeline still runs
  // on classifier output alone, just without sarcasm or context detection.
  if (!apiKey) return null;

  client = new Groq({ apiKey });
  return client;
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

// ─── Response contract ───────────────────────────────────────────────────────

const enrichmentSchema = z.object({
  index: z.number().int().min(0),
  category: z.enum(CATEGORIES as unknown as [string, ...string[]]),
  severity: z.enum(SEVERITIES as unknown as [string, ...string[]]),
  is_sarcastic: z.boolean(),
  context_shifted: z.boolean(),
  classifier_looks_wrong: z.boolean(),
  rationale: z.string().max(280),
});

const batchSchema = z.object({
  results: z.array(enrichmentSchema),
});

export interface GroqEnrichment {
  index: number;
  category: ToxicityCategory;
  severity: Severity;
  isSarcastic: boolean;
  contextShifted: boolean;
  classifierLooksWrong: boolean;
  rationale: string;
}

export interface EnrichmentInput {
  index: number;
  text: string;
  language: string;
  /** The parent comment, when this is a reply — the whole point of item 2. */
  parentText?: string;
  /** What the classifier said, so the model can agree or push back. */
  classifierCategory: string;
  classifierConfidence: number;
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a content-moderation analyst for a research tool that studies toxicity in YouTube comments. You work in English, Hindi, Marathi and romanised (code-mixed) Hindi/Marathi.

For each comment you receive, you return a judgement. A statistical classifier has already scored it; you are the second opinion that catches what it misses.

CATEGORIES (choose exactly one):
- non_toxic: nothing harmful
- profanity: crude or vulgar language, not aimed at anyone
- insult: hostile or disrespectful, aimed at a person or group
- harassment: sustained or targeted abuse of one person
- sexual_explicit: sexually explicit language or unwanted advances
- identity_attack: attacks who someone is (race, religion, caste, gender, sexuality, disability)
- hate_speech: dehumanises or incites hostility against a protected group
- self_harm: encourages self-harm or suicide, or expresses intent
- threat: expresses intent to harm

SEVERITY (choose exactly one):
- none: nothing harmful
- mild: rude or crude, unlikely to cause real harm
- moderate: clearly hostile and aimed at someone
- severe: abusive, hateful, or attacking who a person is
- critical: credible threats, incitement, or content needing escalation

WHAT YOU ARE FOR:
1. Sarcasm and implicit toxicity. "Wow, you're really a genius 🙄" has no abusive word in it and is an insult. Mark is_sarcastic when the surface reading and the intent differ.
2. Context. When a parent comment is supplied, judge the reply in that light. Set context_shifted ONLY when the reply would read as harmless on its own but is harmful as a response.
3. Indic-language nuance. For Hindi and Marathi the classifier is binary and cannot name a category. Yours is the category that counts.

Set classifier_looks_wrong when your verdict materially differs from the classifier's — a different harm category, or clean versus harmful.

RULES:
- Reclaimed or in-group language is not automatically toxic.
- Criticism of ideas, films, products or public conduct is not toxic. Attacking the person is.
- Strong emotion is not toxicity. Swearing at a situation is profanity at most.
- Judge the text as written. Do not imagine an interpretation that makes it worse.
- rationale: one short sentence, plain English, at most 25 words.

Reply with JSON only: {"results":[{"index":0,"category":"insult","severity":"moderate","is_sarcastic":false,"context_shifted":false,"classifier_looks_wrong":false,"rationale":"..."}]}
Return exactly one entry per comment, with the index you were given.`;

function buildUserPrompt(batch: readonly EnrichmentInput[]): string {
  const lines = batch.map((item) => {
    const parts = [
      `[${item.index}] language=${item.language}`,
      `classifier=${item.classifierCategory} (${(item.classifierConfidence * 100).toFixed(0)}%)`,
    ];

    if (item.parentText) {
      parts.push(`IN REPLY TO: ${truncate(item.parentText, 400)}`);
    }

    parts.push(`COMMENT: ${truncate(item.text, 800)}`);
    return parts.join('\n');
  });

  return `Judge these ${batch.length} comments.\n\n${lines.join('\n\n---\n\n')}`;
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}

// ─── Enrichment ──────────────────────────────────────────────────────────────

/**
 * Enriches one batch. Returns an empty array rather than throwing when Groq is
 * unavailable — enrichment is an upgrade, never a dependency.
 */
async function enrichBatch(
  batch: readonly EnrichmentInput[]
): Promise<GroqEnrichment[]> {
  const groq = getClient();
  if (!groq || batch.length === 0) return [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(batch) },
        ],
        // Deterministic: the same comment should not swing between runs, or
        // the metrics page is measuring noise.
        temperature: 0,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) continue;

      const parsed = batchSchema.safeParse(JSON.parse(content));
      if (!parsed.success) continue;

      const validIndices = new Set(batch.map((b) => b.index));

      return parsed.data.results
        // A hallucinated index would misattribute a verdict to the wrong
        // comment, which is worse than dropping it.
        .filter((r) => validIndices.has(r.index))
        .map((r) => ({
          index: r.index,
          category: r.category as ToxicityCategory,
          severity: r.severity as Severity,
          isSarcastic: r.is_sarcastic,
          contextShifted: r.context_shifted,
          classifierLooksWrong: r.classifier_looks_wrong,
          rationale: r.rationale,
        }));
    } catch (error) {
      const isLast = attempt === MAX_ATTEMPTS;
      if (isLast) {
        console.error('[groq] enrichment failed:', error);
        return [];
      }
      // Rate limited or a transient hiccup — wait out the window and retry.
      await new Promise((r) => setTimeout(r, attempt * 2500));
    }
  }

  return [];
}

/**
 * Enriches every input, batched and paced for the free tier.
 *
 * Keyed by `index` so the caller can match verdicts back onto comments
 * regardless of what came back or in what order.
 */
export async function enrichComments(
  inputs: readonly EnrichmentInput[]
): Promise<Map<number, GroqEnrichment>> {
  const results = new Map<number, GroqEnrichment>();
  if (!isGroqConfigured() || inputs.length === 0) return results;

  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);
    const enriched = await enrichBatch(batch);

    for (const item of enriched) {
      results.set(item.index, item);
    }

    // 30 requests/minute on the free tier; 2s between batches keeps a margin.
    if (i + BATCH_SIZE < inputs.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return results;
}
