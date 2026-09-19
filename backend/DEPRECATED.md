# This backend is no longer used

The Express server in `server.js` has been migrated into the Next.js
application and is kept only for reference. Running it does nothing useful:
the frontend no longer calls it, and `next.config.ts` no longer proxies to it.

## Where everything went

| Was | Is now |
|---|---|
| `POST /analyze-video` | `frontend-next/app/api/analyze/video/route.ts` |
| `POST /analyze-toxicity` | `frontend-next/app/api/analyze/text/route.ts` |
| `POST /analyze-toxicity-batch` | `frontend-next/app/api/analyze/batch/route.ts` |
| `extractVideoId()` | `frontend-next/lib/youtube/extract.ts` |
| `fetchYouTubeComments()` | `frontend-next/lib/youtube/comments.ts` |
| `analyzeWithHF()` | `frontend-next/lib/analysis/classifiers/hf-client.ts` |
| `processHFResult()` | `frontend-next/lib/analysis/pipeline.ts` |
| `normalizeLabel()` | `frontend-next/lib/analysis/taxonomy.ts` — `normalizeCategory()` |

## What changed beyond the move

- **The model.** `cointegrated/rubert-tiny-toxicity` is a Russian model; it
  could not read Hindi or Marathi and was weak on English. Replaced by MuRIL
  for Indic languages and XLM-R for European ones, routed per comment by
  detected language.
- **The taxonomy.** Five labels became nine categories plus a five-level
  severity scale. `dangerous` had been carrying hate speech, identity attacks
  and self-harm all at once.
- **Replies are fetched.** The old version took only top-level comments, which
  made context-aware detection impossible.
- **Results are persisted.** Scans belong to a user, and comments are cached by
  text hash so the same comment is never scored twice.

Environment variables moved to `frontend-next/.env.local`; see
`frontend-next/.env.example`.

## Can it be deleted?

Yes, once you are satisfied the migration is complete. It is kept for now so
the original implementation stays readable alongside the new one.
