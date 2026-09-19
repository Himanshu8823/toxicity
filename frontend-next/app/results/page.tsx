import { redirect } from 'next/navigation';

/**
 * `/results` was the pre-database result view: analyse, stash the response in
 * sessionStorage, render it once, lose it on tab close. Scans are persisted
 * against a user now, so every analysis has a durable URL under
 * `/dashboard/scans/[id]` and a list at `/dashboard/history`.
 *
 * It is not kept as a signed-out view because there is no signed-out path to
 * it: `POST /api/analyze/video` calls `requireUserApi()`, so an anonymous
 * visitor can never produce a result to show here.
 *
 * The route itself stays so that old links, bookmarks, and anything still
 * holding the URL land somewhere real instead of a 404.
 */
export default function ResultsPage(): never {
  redirect('/dashboard/history');
}
