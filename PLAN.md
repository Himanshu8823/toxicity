# ToxiScan — Full-Stack Build Plan

Final-year project. Migrating the Express backend into Next.js, adding auth,
two roles, dashboards, reporting, multilingual detection, and the research
features that make this evaluable as a dissertation project.

---

## 1. Decisions taken

| Area | Decision | Why |
|---|---|---|
| Backend | Migrate `backend/server.js` into Next.js Route Handlers | One codebase, one deploy, server-side Supabase session available to every route |
| Auth | Supabase Auth (email + password) | Free, integrates with Postgres RLS |
| DB | Supabase Postgres via **Drizzle ORM** | Free, SQL-first migrations that live in the repo and are reviewable |
| LLM | **Groq** (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) | 14,400 req/day free, no card; far more generous than HF's $0.10/mo credit |
| Classifier | **MuRIL** for Indic, **XLM-R** for European, routed by detected language | Neither model alone covers the required languages |
| Admin | Separate `/admin` tree, seeded, no registration | Requested explicitly |

### Why two classifiers

Verified against the model cards:

- `unitary/multilingual-toxic-xlm-roberta` — trained on **en, fr, es, it, pt, tr, ru**.
  Model card explicitly says it should *only* be tested on those. **No Hindi, no Marathi.**
  Returns 7 useful labels: `toxicity`, `severe_toxicity`, `obscene`, `threat`,
  `insult`, `identity_attack`, `sexual_explicit`.
- `Hate-speech-CNERG/indic-abusive-allInOne-MuRIL` — Bengali, Devanagari Hindi,
  **code-mixed Hindi**, Kannada, Malayalam, **Marathi**, Tamil, Urdu, English.
  Binary only: `LABEL_0` normal, `LABEL_1` abusive.

So: detect language → route to the right classifier → Groq fills in what the
classifier cannot express (fine-grained category for Indic, sarcasm, context,
severity). This is the honest engineering answer and it is also a defensible
research contribution to write up.

---

## 2. Language support

Target: **English, Hindi, Marathi**, plus Spanish/French/Portuguese for free
from XLM-R.

Pipeline per comment:

1. **Detect** — script-based heuristic first (Devanagari block → hi/mr, and
   Marathi-specific tokens separate mr from hi), `franc` for Latin-script.
   Cheap, offline, no API call.
2. **Route** —
   - Devanagari or code-mixed Indic → MuRIL
   - en/fr/es/it/pt/tr/ru → XLM-R
   - anything else → XLM-R (cross-lingual transfer) and flag `low_confidence`
3. **Enrich with Groq** — one batched call per ~20 comments returning, per
   comment: fine category, severity, sarcasm flag, whether the classifier looks
   wrong, and a one-line rationale.
4. **Merge** — classifier score is the number, Groq supplies the nuance. On
   disagreement both are stored; disagreement itself is a useful signal and is
   surfaced in the false-positive analysis.

Caching: comment text is hashed (SHA-256) and results cached in
`comment_analyses`. Re-scanning a video costs nothing for comments already seen.

---

## 3. Taxonomy

### Severity (ordered enum)
`none` → `mild` → `moderate` → `severe` → `critical`

Derived from classifier confidence, banded, then allowed to be overridden one
step by Groq when it detects sarcasm or an implicit threat that the score misses.

### Categories (replaces the old 5-label scheme)
`non_toxic`, `insult`, `harassment`, `hate_speech`, `threat`, `profanity`,
`sexual_explicit`, `identity_attack`, `self_harm`

The old five labels remain as a view over these so existing UI keeps working
during the migration.

---

## 4. Schema (Drizzle → Supabase Postgres)

```
profiles            id(uuid,fk auth.users) · role(user|admin) · full_name · avatar_url
                    preferred_language · created_at · last_seen_at

scans               id · user_id → profiles · video_id · video_title · channel_name
                    thumbnail_url · view_count · comment_count
                    status(pending|running|complete|failed) · requested_comments
                    analysed_count · errored_count · overall_toxicity_score
                    avg_confidence · dominant_language · duration_ms
                    error_message · created_at · completed_at

comments            id · scan_id → scans · youtube_comment_id · author_name
                    text · text_hash · language · like_count · published_at

comment_analyses    id · comment_id → comments · text_hash(idx, for cache reuse)
                    category · severity · confidence · model_name · model_version
                    is_sarcastic · context_shifted · rationale
                    raw_scores(jsonb) · groq_scores(jsonb) · models_disagree
                    created_at

saved_analyses      id · user_id · scan_id · title · note · tags(text[]) · created_at

reports             id · user_id · scan_id · format(pdf|csv|json) · title
                    storage_path · file_size · status · created_at

feedback            id · user_id · comment_analysis_id · verdict(correct|incorrect)
                    corrected_category · corrected_severity · note
                    reviewed_by · reviewed_at · created_at        ← human-in-the-loop

model_metrics       id · model_name · language · period_start · period_end
                    true_pos · false_pos · true_neg · false_neg
                    precision · recall · f1 · roc_auc · sample_size · computed_at

audit_log           id · actor_id · action · entity · entity_id
                    metadata(jsonb) · ip · created_at         ← admin actions

usage_events        id · user_id · kind(scan|report|playground)
                    tokens_used · cost_estimate · created_at  ← powers both dashboards
```

Relations: every table cascades from `profiles` or `scans`. `comment_analyses.text_hash`
is indexed so the cache lookup never touches `comments`. RLS on every user-facing
table: a user sees only their own rows; admin bypasses via service role.

---

## 5. Routes

### Public
`/` `/about` `/playground` — unchanged, playground stays usable logged-out.

### Auth
`/login` `/register` `/forgot-password` `/auth/callback` `/auth/confirm`

### User (guarded)
```
/dashboard          stats, recent scans, toxicity trend, language split
/dashboard/history  every scan, filterable, re-runnable
/dashboard/saved    saved analyses with notes and tags
/dashboard/scans/[id]  full result + per-comment feedback buttons
/dashboard/reports  generated reports, download links
/dashboard/settings profile, preferred language, password
```

### Admin (guarded, separate shell)
```
/admin/login        own login page, no registration
/admin              platform overview: users, scans, comments, error rate
/admin/users        list, search, role change, suspend
/admin/scans        every scan across all users
/admin/feedback     review queue for user-reported wrong predictions
/admin/metrics      precision/recall/F1, confusion matrix, ROC-AUC per model+language
/admin/models       which model handled what, disagreement rate
/admin/audit        audit log
```

### API (Route Handlers, replacing Express)
```
POST /api/analyze/video       ← was /analyze-video
POST /api/analyze/text        ← was /analyze-toxicity
POST /api/analyze/batch       ← was /analyze-toxicity-batch
GET  /api/scans               list own
GET  /api/scans/[id]
POST /api/scans/[id]/save
POST /api/reports             generate
GET  /api/reports/[id]/download
POST /api/feedback
GET  /api/admin/*             admin-only, service role
```

---

## 6. Code splitting

```
lib/
  analysis/
    language.ts       detection + routing
    classifiers/
      muril.ts        Indic
      xlmr.ts         European
      index.ts        route(), normalise to one shape
    groq.ts           enrichment client, batched, rate-limit aware
    severity.ts       banding + override rules
    taxonomy.ts       categories, legacy 5-label view
    pipeline.ts       orchestrates: detect → classify → enrich → merge → persist
    cache.ts          text_hash lookup
  youtube/
    extract.ts        video id from any URL shape
    comments.ts       Data API v3 paging
    metadata.ts
  db/
    schema.ts         Drizzle tables
    client.ts
    queries/          one file per domain: scans, users, metrics, feedback
  auth/
    server.ts         server-side session
    guards.ts         requireUser / requireAdmin
  metrics/
    confusion.ts      precision, recall, F1, ROC-AUC
  reports/
    pdf.ts  csv.ts  json.ts
```

Every file one job. No route handler holds business logic — it validates,
calls a lib function, shapes the response.

---

## 7. Research features → where they live

| Feature | Implementation |
|---|---|
| Context-aware | `comments` keeps `parent_id`; pipeline sends the parent with the reply to Groq, which sets `context_shifted` when the reply is only toxic in context |
| Sarcasm | Groq returns `is_sarcastic` + rationale; surfaced with an icon in results |
| Severity levels | `severity` enum, colour-banded in UI |
| Hate-speech taxonomy | 9 categories, not 5 |
| False pos/neg | `/admin/metrics` — confusion matrix from `feedback` as ground truth |
| Human feedback | Buttons on every comment → `feedback` → admin review queue → `model_metrics` |

---

## 8. Phases — all complete

1. ✅ **Foundation** — Drizzle schema, migrations, seed, Supabase clients, env
2. ✅ **Auth** — register/login/reset, proxy guards, profile bootstrap trigger
3. ✅ **Backend migration** — Express logic → Route Handlers; `backend/` retired
4. ✅ **Multilingual pipeline** — language detect, dual classifier, Groq, severity
5. ✅ **User area** — dashboard, history, saved, scan detail, feedback UI
6. ✅ **Admin area** — separate shell, every page, metrics, audit
7. ✅ **Reports** — CSV / JSON / print-ready HTML + Supabase Storage
8. ✅ **Polish** — loading, empty, error and not-found states; responsive; a11y

**Verified:** `tsc --noEmit` clean; `next build` compiles all 40 routes.

Env needed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `GROQ_API_KEY`, `HF_TOKEN`,
`YOUTUBE_API_KEY`, `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`.
See [SETUP.md](SETUP.md).

---

## 9. What shipped beyond the original plan

- **`npm run check`** (`scripts/check-setup.ts`) — verifies keys, schema, RLS,
  storage bucket, admin account, and reachability of both classifiers, the
  YouTube API and Groq. Each failure says what to do about it.
- **Self-lockout protection** — an admin cannot demote or suspend themselves,
  and the last remaining admin cannot be demoted or suspended by anyone.
- **Feedback is not re-triageable.** Once accepted or rejected, an item is
  closed; re-triaging would silently change the ground truth the published
  metrics were computed from.
- **Sample-size honesty on the metrics page.** Slices below `MIN_SLICE_SIZE`
  show their raw counts but withhold derived ratios, and the withheld
  (model, language) pairs are named in a footnote rather than quietly dropped.
- **Comment caching by text hash** — identical comment text is scored once and
  reused across scans and users.
- **`/results` retired** — superseded by `/dashboard/scans/[id]` once scans
  became persistent; the route now redirects to `/dashboard/history`.

## 10. Known limitations

Stated because a final-year project is judged partly on knowing them:

- Hindi and Marathi rest on a binary classifier plus a language model, a less
  well-grounded path than English. The metrics page reports accuracy per
  language so the gap is measurable rather than hidden.
- `getScanForAdmin` caps at 200 comments with no offset — fine at this scale,
  would need a cursor if scans grow much larger.
- Feedback submission updates client state only; the server-rendered map
  refreshes on next navigation. Correct for the current UI, but a "corrected N
  of these" counter would need `router.refresh()`.
- `react-hooks/set-state-in-effect` fires on the playground's debounce reset.
  Pre-existing, stylistic, untouched.
- Verified by typecheck, build and code review. **Not yet exercised against a
  live database** — that needs real credentials in `.env.local`.
