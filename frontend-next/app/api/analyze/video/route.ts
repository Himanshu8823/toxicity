import { z } from 'zod';
import { requireUserApi } from '@/lib/auth/guards';
import { extractVideoId } from '@/lib/youtube/extract';
import {
  fetchComments,
  fetchVideoMetadata,
  YouTubeError,
} from '@/lib/youtube/comments';
import { analyseComments, type PipelineInput } from '@/lib/analysis/pipeline';
import {
  completeScan,
  createScan,
  failScan,
  type PersistableComment,
} from '@/lib/db/queries/scans';

/**
 * `POST /api/analyze/video` — the replacement for the Express `/analyze-video`.
 *
 * Differences from what it replaces:
 *  - requires a signed-in user, and the scan is saved against them
 *  - fetches replies as well as top-level comments, so context detection works
 *  - routes each comment to a classifier by language rather than sending
 *    everything to one Russian model
 *  - returns categories and severity from the wider taxonomy
 *
 * The route validates, delegates, and shapes the response. All the work lives
 * in `lib/`.
 */

export const runtime = 'nodejs';
/** 200 comments through two models is minutes, not seconds. */
export const maxDuration = 300;

const bodySchema = z.object({
  url: z.string().min(1, 'A YouTube URL is required.'),
  maxComments: z.number().int().min(1).max(200).default(50),
  includeReplies: z.boolean().default(true),
  /** Lets the playground opt out of the slower enrichment pass. */
  skipEnrichment: z.boolean().default(false),
});

export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (auth.response) return auth.response;

  const { user } = auth;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? 'Invalid request.')
        : 'Invalid request body.';
    return Response.json({ error: message }, { status: 400 });
  }

  const videoId = extractVideoId(body.url);
  if (!videoId) {
    return Response.json(
      {
        error:
          'That does not look like a YouTube link. Paste a watch, share, or Shorts URL.',
      },
      { status: 400 }
    );
  }

  let scanId: string | null = null;

  try {
    const metadata = await fetchVideoMetadata(videoId);

    const scan = await createScan({
      userId: user.id,
      videoId,
      videoTitle: metadata.title,
      channelName: metadata.channelName,
      thumbnailUrl: metadata.thumbnail,
      viewCount: metadata.viewCount,
      commentCount: metadata.commentCount,
      requestedComments: body.maxComments,
    });
    scanId = scan.id;

    const fetched = await fetchComments(videoId, {
      maxComments: body.maxComments,
      includeReplies: body.includeReplies,
    });

    if (fetched.length === 0) {
      await failScan(scan.id, 'No comments found.');
      return Response.json(
        {
          error:
            'No comments were found on this video — they may be disabled or it may have none yet.',
        },
        { status: 404 }
      );
    }

    // Parent text, so a reply can be judged in context.
    const textByYoutubeId = new Map(fetched.map((c) => [c.id, c.text]));

    const inputs: PipelineInput[] = fetched.map((c) => ({
      id: c.id,
      text: c.text,
      parentText: c.parentId ? textByYoutubeId.get(c.parentId) : undefined,
    }));

    const summary = await analyseComments(inputs, {
      skipEnrichment: body.skipEnrichment,
    });

    const persistable = new Map<string, PersistableComment>(
      fetched.map((c) => [
        c.id,
        {
          youtubeCommentId: c.id,
          authorName: c.authorName,
          text: c.text,
          likeCount: c.likeCount,
          publishedAt: c.publishedAt ? new Date(c.publishedAt) : null,
          parentYoutubeId: c.parentId,
        },
      ])
    );

    await completeScan({
      scanId: scan.id,
      userId: user.id,
      summary,
      commentsByResultId: persistable,
    });

    const analysed = summary.results.filter((r) => !r.error);

    return Response.json({
      scanId: scan.id,
      videoInfo: {
        id: videoId,
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        channelName: metadata.channelName,
        viewCount: Number(metadata.viewCount).toLocaleString(),
        commentCount: Number(metadata.commentCount).toLocaleString(),
      },
      analysis: {
        totalAnalyzed: summary.analysedCount,
        errored: summary.erroredCount,
        overallToxicityScore: summary.overallToxicityScore.toFixed(1),
        avgConfidence: (summary.avgConfidence * 100).toFixed(1),
        dominantLanguage: summary.dominantLanguage,
        durationMs: summary.durationMs,
        disagreementRate: summary.disagreementRate.toFixed(1),
        enrichmentUsed: summary.enrichmentUsed,
        categoryCounts: summary.categoryCounts,
        severityCounts: summary.severityCounts,
        languageCounts: summary.languageCounts,
        mostToxicComments: analysed
          .filter((r) => r.harmful)
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 10),
        allResults: analysed,
      },
    });
  } catch (error) {
    if (scanId) {
      await failScan(
        scanId,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    if (error instanceof YouTubeError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error('[analyze/video]', error);

    return Response.json(
      {
        error: 'The analysis failed.',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
