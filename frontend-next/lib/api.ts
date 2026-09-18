import axios, { AxiosError } from 'axios';
import type {
  AnalysisResponse,
  ApiErrorBody,
  BatchTextResult,
  SingleTextResult,
} from './types';

/**
 * Requests go to same-origin `/api/*`, which `next.config.ts` rewrites to the
 * Express server. That keeps the browser free of CORS and cross-origin cookies,
 * and means only one env var (`BACKEND_URL`) ever needs to change per deploy.
 */
const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // The model call runs comments in batches of 10 with a 300ms pause between
  // batches, so 200 comments can legitimately take minutes. Fail slow, not early.
  timeout: 300_000,
});

/** Human-readable message pulled from the server's `{ error, details }` body. */
export function toApiMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<ApiErrorBody>;

    const body = axiosErr.response?.data;
    if (body?.error) return body.details ? `${body.error} — ${body.details}` : body.error;

    if (axiosErr.code === 'ECONNABORTED') {
      return 'The analysis took too long and timed out. Try a smaller number of comments.';
    }
    if (!axiosErr.response) {
      return 'Could not reach the analysis server. Make sure the backend is running on port 5000.';
    }
    if (axiosErr.response.status === 404) {
      return 'No comments found for this video — comments may be disabled.';
    }
    if (axiosErr.response.status >= 500) {
      return 'The analysis server hit an error. Check that the API keys are configured.';
    }
  }

  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

/** `POST /analyze-video` — fetch a video's comments and score each one. */
export async function analyzeVideo(
  url: string,
  maxComments: number,
  signal?: AbortSignal,
): Promise<AnalysisResponse> {
  const { data } = await client.post<AnalysisResponse>(
    '/analyze-video',
    { url, maxComments },
    { signal },
  );
  return data;
}

/** `POST /analyze-toxicity` — score a single piece of text. */
export async function analyzeText(
  text: string,
  signal?: AbortSignal,
): Promise<SingleTextResult> {
  const { data } = await client.post<SingleTextResult>(
    '/analyze-toxicity',
    { text },
    { signal },
  );
  return data;
}

/** `POST /analyze-toxicity-batch` — score many texts in one request. */
export async function analyzeBatch(
  texts: string[],
  signal?: AbortSignal,
): Promise<BatchTextResult> {
  const { data } = await client.post<BatchTextResult>(
    '/analyze-toxicity-batch',
    { texts },
    { signal },
  );
  return data;
}

/** Recognised YouTube URL shapes, matching `extractVideoId()` on the server. */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
