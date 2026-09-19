/**
 * Pulling a video id out of whatever a user pasted.
 *
 * Ported from `backend/server.js`, widened to cover the URL shapes the old
 * two patterns missed: `/live/`, `/v/`, `?vi=`, and bare ids.
 */

/** A YouTube video id is always exactly 11 URL-safe base64 characters. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const PATTERNS: readonly RegExp[] = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=)([A-Za-z0-9_-]{11})/,
  /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/live\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
  /(?:youtube\.com\/.*[?&]vi=)([A-Za-z0-9_-]{11})/,
];

/** The video id, or `null` if the input is not a YouTube video reference. */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Someone may paste the id itself rather than a URL.
  if (VIDEO_ID.test(trimmed)) return trimmed;

  for (const pattern of PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function isValidVideoId(id: string): boolean {
  return VIDEO_ID.test(id);
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
