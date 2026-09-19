import 'server-only';

import type { HfLabelScore } from './types';

/**
 * Shared transport for the Hugging Face Inference API.
 *
 * Both classifiers speak the same text-classification protocol, so the retry,
 * timeout and cold-start handling lives here once rather than twice.
 */

const HF_BASE = 'https://router.huggingface.co/hf-inference/models';

/** HF returns 503 while a model loads onto a worker; this is not an error. */
const COLD_START_STATUS = 503;
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 30_000;

export interface HfCallOptions {
  /** Model id, e.g. `unitary/multilingual-toxic-xlm-roberta`. */
  model: string;
  text: string;
  /** Ask HF to hold the request open until the model has loaded. */
  waitForModel?: boolean;
}

export class HfError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'HfError';
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls a text-classification model and returns its label/score list.
 *
 * HF wraps single-input results in an extra array, and returns either a flat
 * list or a nested one depending on the model, so the response is flattened
 * before it leaves here.
 */
export async function classifyWithHf({
  model,
  text,
  waitForModel = true,
}: HfCallOptions): Promise<HfLabelScore[]> {
  const token = process.env.HF_TOKEN;

  if (!token) {
    throw new HfError(
      'HF_TOKEN is not set — the toxicity classifiers cannot be reached.'
    );
  }

  let lastError: HfError | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${HF_BASE}/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: waitForModel },
        }),
        signal: controller.signal,
      });

      if (response.status === COLD_START_STATUS && attempt < MAX_ATTEMPTS) {
        // Model is spinning up. Back off and let it finish.
        await sleep(attempt * 3000);
        continue;
      }

      if (!response.ok) {
        const body = await response.text();
        throw new HfError(
          `Hugging Face returned ${response.status}: ${body.slice(0, 200)}`,
          response.status
        );
      }

      const data: unknown = await response.json();

      if (data && typeof data === 'object' && 'error' in data) {
        throw new HfError(String((data as { error: unknown }).error));
      }

      if (!Array.isArray(data)) {
        throw new HfError('Unexpected response shape from Hugging Face.');
      }

      // Single input comes back as [[{label, score}, ...]]; some models return
      // the inner list directly.
      const flat = Array.isArray(data[0]) ? (data[0] as HfLabelScore[]) : (data as HfLabelScore[]);

      return flat.filter(
        (item): item is HfLabelScore =>
          item != null &&
          typeof item === 'object' &&
          typeof item.label === 'string' &&
          typeof item.score === 'number'
      );
    } catch (error) {
      if (error instanceof HfError) {
        lastError = error;
        // A 4xx will not fix itself on retry.
        if (error.status && error.status < 500 && error.status !== 429) throw error;
      } else if (error instanceof Error && error.name === 'AbortError') {
        lastError = new HfError(`Model call timed out after ${TIMEOUT_MS}ms.`);
      } else {
        lastError = new HfError(
          error instanceof Error ? error.message : 'Unknown model error.'
        );
      }

      if (attempt < MAX_ATTEMPTS) await sleep(attempt * 1500);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new HfError('Model call failed.');
}
