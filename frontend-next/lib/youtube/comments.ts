import 'server-only';

/**
 * YouTube Data API v3 — video metadata and comment threads.
 *
 * Ported from `backend/server.js` with one substantive change: replies are
 * fetched alongside top-level comments. The old version took only top-level
 * comments, which made context-aware detection impossible — a reply is where
 * context actually matters.
 */

const API_BASE = 'https://www.googleapis.com/youtube/v3';

/** The API's own ceiling per page. */
const PAGE_SIZE = 100;

export interface YouTubeComment {
  id: string;
  text: string;
  authorName: string;
  likeCount: number;
  publishedAt: string | null;
  /** The id of the comment this replies to, or `null` for a top-level one. */
  parentId: string | null;
}

export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  channelName: string;
  viewCount: string;
  commentCount: string;
  publishedAt: string | null;
  description: string;
}

export class YouTubeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** True when it is the video that is unusable, not the request. */
    readonly isVideoProblem = false
  ) {
    super(message);
    this.name = 'YouTubeError';
  }
}

function requireApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new YouTubeError(
      'YOUTUBE_API_KEY is not configured on the server.',
      500
    );
  }
  return key;
}

/**
 * Turns an API error body into something a user can act on. The raw messages
 * are written for developers and say nothing useful to someone who pasted a
 * link.
 */
function translateError(status: number, body: unknown): YouTubeError {
  const reason =
    typeof body === 'object' && body !== null
      ? ((body as { error?: { errors?: Array<{ reason?: string }> } }).error
          ?.errors?.[0]?.reason ?? '')
      : '';

  switch (reason) {
    case 'commentsDisabled':
      return new YouTubeError(
        'Comments are turned off for this video, so there is nothing to analyse.',
        404,
        true
      );
    case 'videoNotFound':
      return new YouTubeError(
        'That video could not be found. It may be private, deleted, or the link may be wrong.',
        404,
        true
      );
    case 'quotaExceeded':
      return new YouTubeError(
        'The daily YouTube API quota has been used up. Try again tomorrow.',
        429
      );
    case 'keyInvalid':
    case 'forbidden':
      return new YouTubeError(
        'The YouTube API key was rejected. Check the server configuration.',
        500
      );
    default:
      return new YouTubeError(
        'YouTube refused the request. The video may be private or restricted.',
        status,
        status === 403 || status === 404
      );
  }
}

async function apiGet(
  path: string,
  params: Record<string, string>
): Promise<unknown> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('key', requireApiKey());

  const response = await fetch(url.toString(), {
    // Comment threads change; never serve a cached analysis as fresh.
    cache: 'no-store',
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Non-JSON error body; the status alone will have to do.
    }
    throw translateError(response.status, body);
  }

  return response.json();
}

// ─── Metadata ────────────────────────────────────────────────────────────────

interface VideoListResponse {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      publishedAt?: string;
      description?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
    statistics?: { viewCount?: string; commentCount?: string };
  }>;
}

export async function fetchVideoMetadata(
  videoId: string
): Promise<VideoMetadata> {
  const data = (await apiGet('videos', {
    part: 'snippet,statistics',
    id: videoId,
  })) as VideoListResponse;

  const video = data.items?.[0];

  if (!video) {
    throw new YouTubeError(
      'That video could not be found. It may be private, deleted, or the link may be wrong.',
      404,
      true
    );
  }

  const thumbnails = video.snippet?.thumbnails ?? {};
  const thumbnail =
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    '';

  return {
    id: videoId,
    title: video.snippet?.title ?? 'Untitled video',
    thumbnail,
    channelName: video.snippet?.channelTitle ?? '',
    viewCount: video.statistics?.viewCount ?? '0',
    commentCount: video.statistics?.commentCount ?? '0',
    publishedAt: video.snippet?.publishedAt ?? null,
    description: video.snippet?.description ?? '',
  };
}

// ─── Comments ────────────────────────────────────────────────────────────────

interface CommentSnippet {
  textDisplay?: string;
  textOriginal?: string;
  authorDisplayName?: string;
  likeCount?: number;
  publishedAt?: string;
  parentId?: string;
}

interface CommentThreadResponse {
  items?: Array<{
    snippet?: {
      topLevelComment?: { id?: string; snippet?: CommentSnippet };
      totalReplyCount?: number;
    };
    replies?: { comments?: Array<{ id?: string; snippet?: CommentSnippet }> };
  }>;
  nextPageToken?: string;
}

function toComment(
  id: string | undefined,
  snippet: CommentSnippet | undefined,
  parentId: string | null
): YouTubeComment | null {
  // textOriginal is the text as typed; textDisplay carries HTML entities and
  // <br> from YouTube's renderer, which would otherwise be scored as content.
  const text = snippet?.textOriginal ?? snippet?.textDisplay;
  if (!id || !text?.trim()) return null;

  return {
    id,
    text: text.trim(),
    authorName: snippet?.authorDisplayName ?? 'Unknown',
    likeCount: snippet?.likeCount ?? 0,
    publishedAt: snippet?.publishedAt ?? null,
    parentId,
  };
}

export interface FetchCommentsOptions {
  /** Hard ceiling on comments returned, replies included. */
  maxComments?: number;
  /** Fetch replies too. Needed for context-aware detection. */
  includeReplies?: boolean;
}

/**
 * Fetches up to `maxComments` comments, newest-relevance first.
 *
 * Replies are returned immediately after their parent, so a caller walking the
 * list in order always sees a parent before anything replying to it.
 */
export async function fetchComments(
  videoId: string,
  { maxComments = 100, includeReplies = true }: FetchCommentsOptions = {}
): Promise<YouTubeComment[]> {
  const collected: YouTubeComment[] = [];
  let pageToken: string | undefined;

  while (collected.length < maxComments) {
    const params: Record<string, string> = {
      part: includeReplies ? 'snippet,replies' : 'snippet',
      videoId,
      maxResults: String(PAGE_SIZE),
      textFormat: 'plainText',
      order: 'relevance',
    };
    if (pageToken) params.pageToken = pageToken;

    const data = (await apiGet('commentThreads', params)) as CommentThreadResponse;

    for (const item of data.items ?? []) {
      const top = item.snippet?.topLevelComment;
      const parent = toComment(top?.id, top?.snippet, null);
      if (!parent) continue;

      collected.push(parent);
      if (collected.length >= maxComments) break;

      if (includeReplies) {
        for (const reply of item.replies?.comments ?? []) {
          const child = toComment(reply.id, reply.snippet, parent.id);
          if (!child) continue;

          collected.push(child);
          if (collected.length >= maxComments) break;
        }
      }

      if (collected.length >= maxComments) break;
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return collected.slice(0, maxComments);
}
