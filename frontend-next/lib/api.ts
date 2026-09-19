import axios, { AxiosError } from 'axios';
import type {
  AnalysisResponse,
  ApiErrorBody,
  BatchAnalysisResponse,
  TextAnalysisResponse,
} from './types';

/**
 * Requests go to same-origin `/api/*`, which the Route Handlers under
 * `app/api/` serve directly. The Express backend these used to be proxied to
 * has been migrated in, so there is no cross-origin hop and the Supabase
 * session cookie travels with every call without any CORS arrangement.
 */
const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  // The model call runs comments in batches of 10 with a 300ms pause between
  // batches, so 200 comments can legitimately take minutes. Fail slow, not early.
  timeout: 300_000,
});

/**
 * True when the request failed because nobody is signed in.
 *
 * Worth distinguishing from every other failure: the caller can send the
 * visitor to sign in and bring them back, rather than showing an error about
 * something they cannot fix by retrying.
 */
export function isUnauthorised(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

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
      return 'Could not reach the analysis server. Check your connection and try again.';
    }
    if (axiosErr.response.status === 401) {
      return 'You need to be signed in to analyse a video.';
    }
    if (axiosErr.response.status === 404) {
      return 'No comments found for this video — comments may be disabled.';
    }
    if (axiosErr.response.status === 429) {
      return 'The daily API quota has been used up. Try again tomorrow.';
    }
    if (axiosErr.response.status >= 500) {
      return 'The analysis server hit an error. Check that the API keys are configured.';
    }
  }

  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

/** `POST /api/analyze/video` — fetch a video's comments and score each one. */
export async function analyzeVideo(
  url: string,
  maxComments: number,
  signal?: AbortSignal,
): Promise<AnalysisResponse> {
  const { data } = await client.post<AnalysisResponse>(
    '/analyze/video',
    { url, maxComments },
    { signal },
  );
  return data;
}

/** `POST /api/analyze/text` — score a single piece of text. */
export async function analyzeText(
  text: string,
  signal?: AbortSignal,
): Promise<TextAnalysisResponse> {
  const { data } = await client.post<TextAnalysisResponse>(
    '/analyze/text',
    { text },
    { signal },
  );
  return data;
}

/** `POST /api/analyze/batch` — score many texts in one request. */
export async function analyzeBatch(
  texts: string[],
  signal?: AbortSignal,
): Promise<BatchAnalysisResponse> {
  const { data } = await client.post<BatchAnalysisResponse>(
    '/analyze/batch',
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
