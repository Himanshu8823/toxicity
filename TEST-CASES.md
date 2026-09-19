# ToxiScan — Functional Test Cases

Manual test plan covering every flow in the application. Functionality only —
security testing is deliberately out of scope, though access-control cases are
included where getting them wrong would break a *feature* (a user seeing an
empty dashboard because the query scoped wrong is a functionality bug).

Every expected result below was read off the actual implementation, not
assumed. Where a test depends on a specific threshold or rule, the file and
behaviour it comes from is named.

---

## How to use this document

| Column | Meaning |
|---|---|
| **ID** | Stable reference, e.g. `AUTH-03` |
| **Priority** | P1 blocks release · P2 important · P3 polish |
| **Steps** | What to do |
| **Expected** | What must happen |

Record `Pass` / `Fail` / `Blocked` against each ID as you go.

### Before you start

```bash
cd frontend-next
npm run check     # must be green before any of this means anything
npm run dev
```

You need **three accounts**:

| Account | How |
|---|---|
| `admin@test.com` | `npm run db:seed` with `ADMIN_SEED_EMAIL=admin@test.com` |
| `user-a@test.com` | Register through `/register` |
| `user-b@test.com` | Register through `/register` — needed for isolation tests |

### Test data

Keep these to hand. They exercise every routing path in the pipeline.

| Ref | Text | Why |
|---|---|---|
| `T-EN-CLEAN` | `This was a really helpful explanation, thank you.` | English, clean → XLM-R |
| `T-EN-INSULT` | `You are an absolute idiot and everyone knows it.` | English, hostile → XLM-R |
| `T-EN-SARCASM` | `Wow, you're really a genius 🙄 truly groundbreaking stuff here.` | **No abusive word.** Classifier should score it clean; Groq should flag sarcasm |
| `T-HI-CLEAN` | `बहुत अच्छा वीडियो था, धन्यवाद।` | Devanagari Hindi → MuRIL |
| `T-HI-TOXIC` | `तुम बिल्कुल बेवकूफ हो, कुछ नहीं आता तुम्हें।` | Devanagari Hindi, hostile → MuRIL |
| `T-MR-CLEAN` | `खूप छान व्हिडिओ आहे, धन्यवाद.` | Marathi — must detect `mr`, not `hi` |
| `T-ROMAN-HI` | `bhai ye kya bakwas hai yaar bilkul time waste` | Romanised Hinglish → MuRIL via code-mix path |
| `T-MIXED` | `Honestly यह video बहुत अच्छा था` | Mixed script → `isCodeMixed: true` |
| `T-SHORT` | `ok` | Under 20 chars → `en` at confidence 0.3 |
| `T-EMPTY` | `   ` (whitespace only) | Must be rejected by validation |
| `T-LONG` | Any 5001-character string | One over the limit |

**Videos** — pick these yourself and note the IDs:

| Ref | Needs |
|---|---|
| `V-EN` | Public, English comments, 50+ comments |
| `V-HI` | Public, Hindi/Hinglish comments — an Indian creator's video |
| `V-REPLIES` | Public, with visible reply threads (needed for context tests) |
| `V-NOCOMMENTS` | Public, comments disabled |
| `V-PRIVATE` | A private or deleted video URL |

---

## 1. Setup and configuration — `SETUP`

| ID | P | Steps | Expected |
|---|---|---|---|
| SETUP-01 | P1 | `npm run check` with everything configured | Every line ✓. Exit code 0 |
| SETUP-02 | P1 | Remove `DATABASE_URL`, run `npm run check` | Fails naming `DATABASE_URL`, says to copy `.env.example`. Exit 1 |
| SETUP-03 | P2 | Remove `GROQ_API_KEY`, run `npm run check` | **Warning, not failure.** Says sarcasm/context/severity refinement will be unavailable. Exit 0 |
| SETUP-04 | P1 | `npm run db:migrate` twice in a row | Second run reports every migration as already applied, changes nothing |
| SETUP-05 | P1 | `npm run db:seed` twice | Second run resets the password rather than erroring or duplicating |
| SETUP-06 | P2 | Set `ADMIN_SEED_PASSWORD` to 8 chars, seed | Rejected: must be at least 12 characters |
| SETUP-07 | P2 | Check Supabase → Storage after migrate | A private bucket named `reports` exists |
| SETUP-08 | P2 | Supabase → Database → check RLS | Row-level security enabled on all 10 tables |

---

## 2. Registration and login — `AUTH`

| ID | P | Steps | Expected |
|---|---|---|---|
| AUTH-01 | P1 | Register with valid name, email, matching passwords | Account created. Either straight to `/dashboard`, or a "check your inbox" state if email confirmation is on |
| AUTH-02 | P1 | Register, passwords do not match | Inline error. No request sent |
| AUTH-03 | P1 | Register with password under 8 chars | Inline error naming the minimum |
| AUTH-04 | P2 | Register with a malformed email | Inline validation error |
| AUTH-05 | P2 | Register with an already-registered email | Handled gracefully — a clear message, not a raw Supabase error |
| AUTH-06 | P1 | Log in with correct credentials | Lands on `/dashboard`. Nav CTA now reads "Dashboard" |
| AUTH-07 | P1 | Log in with a wrong password | Inline error. Stays on `/login` |
| AUTH-08 | P1 | Visit `/dashboard` signed out | Redirected to `/login?next=/dashboard` |
| AUTH-09 | P1 | Complete that login | Returns to `/dashboard`, not the generic landing |
| AUTH-10 | P2 | Visit `/login` while already signed in | Redirected to `/dashboard` (proxy `AUTH_ROUTES`) |
| AUTH-11 | P2 | Visit `/register` while signed in | Redirected to `/dashboard` |
| AUTH-12 | P1 | Sign out | Session cleared. `/dashboard` now redirects to login |
| AUTH-13 | P2 | Request a password reset for a **registered** email | "If an account exists…" — deliberately does not confirm |
| AUTH-14 | P2 | Request a reset for an **unregistered** email | **Identical message.** Any difference here is a bug |
| AUTH-15 | P1 | Follow the reset link, set a new password | Lands on `/reset`, accepts the new password, signs in |
| AUTH-16 | P2 | Follow an expired/used reset link | Redirected to `/forgot-password?error=expired` with an explanation |
| AUTH-17 | P2 | Open `/reset` directly with no recovery token | Shows the "link expired or invalid" card, not a broken form |
| AUTH-18 | P3 | Sign out in tab A while tab B is open on the landing page | Tab B's nav settles back to "Sign in" (`ClientNav` auth subscription) |

---

## 3. Admin access — `ADMIN-ACCESS`

| ID | P | Steps | Expected |
|---|---|---|---|
| AA-01 | P1 | Sign in at `/admin/login` as the seeded admin | Lands on `/admin` console |
| AA-02 | P1 | Sign in at `/admin/login` as `user-a` | Rejected: "does not have administrator access". **Session signed out again** — not left holding a live session |
| AA-03 | P1 | Signed in as `user-a`, visit `/admin` directly | Redirected to `/dashboard` — not to a login form, since they are signed in and just not privileged |
| AA-04 | P1 | Signed out, visit `/admin` | Redirected to `/admin/login?next=/admin` |
| AA-05 | P2 | Signed in as admin, visit `/admin/login` | Redirected to `/admin` |
| AA-06 | P2 | Compare `/login` and `/admin/login` visually | Distinctly different surfaces. Admin has no registration link |
| AA-07 | P2 | As admin, check the public nav | An extra "Admin" link is present (`SiteNav` / `ClientNav` role branch) |

---

## 4. Playground (signed out) — `PLAY`

The playground works signed out on purpose. Every case here should be run
**while logged out** first, then spot-checked signed in.

| ID | P | Steps | Expected |
|---|---|---|---|
| PLAY-01 | P1 | Signed out, open `/playground` | Page loads fully. No redirect to login |
| PLAY-02 | P1 | Analyse `T-EN-CLEAN` | Category `Non-toxic`, severity `None`, model shown as **XLM-R**, language `English` |
| PLAY-03 | P1 | Analyse `T-EN-INSULT` | A harmful category (insult/harassment). Severity at least `Mild`. Model XLM-R |
| PLAY-04 | P1 | Analyse `T-HI-CLEAN` | Language `Hindi`. Model **MuRIL**. Category `Non-toxic` |
| PLAY-05 | P1 | Analyse `T-HI-TOXIC` | Language `Hindi`, model MuRIL, a harmful category. **The category must not be the generic placeholder** — Groq fills it in because MuRIL is binary |
| PLAY-06 | P1 | Analyse `T-MR-CLEAN` | Language detected as **Marathi**, not Hindi. This is the marker-word disambiguation in `language.ts` |
| PLAY-07 | P1 | Analyse `T-ROMAN-HI` | **Language `Hindi`, `isCodeMixed` true, model MuRIL** — despite being Latin script. Routing rule: `isCodeMixed → muril` |
| PLAY-08 | P1 | Analyse `T-MIXED` | Code-mixed indicated in the UI |
| PLAY-09 | P1 | **Analyse `T-SARCASM`** | **Sarcasm flag shown.** The headline case: no abusive token, so the classifier alone would call it clean |
| PLAY-10 | P2 | Analyse `T-SHORT` (`ok`) | Falls back to English at low confidence. No crash |
| PLAY-11 | P1 | Submit `T-EMPTY` | Rejected: "Enter some text to analyse." No request fired |
| PLAY-12 | P2 | Submit `T-LONG` (5001 chars) | Rejected naming the 5000-character limit |
| PLAY-13 | P2 | Paste exactly 5000 chars | **Accepted** — boundary is inclusive |
| PLAY-14 | P2 | Click each built-in example | Each fills the box and analyses. Covers all six routing paths |
| PLAY-15 | P2 | Expand the raw-scores `<details>` | MuRIL shows `label_0`/`label_1`; XLM-R shows named heads. Whatever keys arrive render |
| PLAY-16 | P2 | Type, pause, type again quickly | Debounce holds; the previous result stays on screen dimmed rather than flickering to a skeleton |
| PLAY-17 | P2 | Press ⌘/Ctrl+Enter | Submits |
| PLAY-18 | P3 | Analyse with `GROQ_API_KEY` removed and server restarted | Still returns a category and severity from the classifier. **No sarcasm flag, no rationale.** Must not error |
| PLAY-19 | P2 | Check `modelsDisagree` on a borderline input | When shown, it is stated plainly rather than hidden |

---

## 5. Video analysis — `SCAN`

| ID | P | Steps | Expected |
|---|---|---|---|
| SCAN-01 | P1 | **Signed out**, paste `V-EN` on the landing page and submit | Redirected to `/login?next=…`. **Not** a raw error message |
| SCAN-02 | P1 | Sign in, then analyse `V-EN` with 50 comments | Progress stages advance: Fetching → Detecting languages → Scoring → Sarcasm/context → Aggregating. Lands on `/dashboard/scans/<id>` |
| SCAN-03 | P1 | Check that scan's detail page | Video title, channel, thumbnail, counts all correct. Comment count matches what was requested (or fewer if the video has fewer) |
| SCAN-04 | P1 | Analyse `V-HI` | `dominantLanguage` is Hindi. Comments routed to MuRIL |
| SCAN-05 | P1 | Analyse `V-REPLIES` with replies enabled | **Replies present in the results**, not only top-level comments |
| SCAN-06 | P1 | Look for a context-shifted flag in `V-REPLIES` | Where present, it marks a reply harmless alone but harmful given its parent |
| SCAN-07 | P1 | Analyse `V-NOCOMMENTS` | Clear message that comments are disabled. **Scan marked `failed`, not left `running`** |
| SCAN-08 | P1 | Analyse `V-PRIVATE` | Clear "could not be found / may be private" message. Scan marked failed |
| SCAN-09 | P1 | Submit `not-a-url` | "That does not look like a YouTube video URL." Rejected client-side, no request |
| SCAN-10 | P2 | Try each URL shape: `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`, and a bare 11-char ID | All accepted (`lib/youtube/extract.ts`) |
| SCAN-11 | P2 | Set the slider to 10, analyse | Exactly 10 (or fewer if the video has fewer) |
| SCAN-12 | P2 | Set the slider to 200, analyse | Up to 200. Takes noticeably longer — this is expected |
| SCAN-13 | P2 | Start an analysis, click Cancel | Stops. "Analysis cancelled." UI returns to a usable state |
| SCAN-14 | P2 | Navigate away mid-analysis, come back to `/dashboard/history` | The scan row exists with a sensible status — not stuck at `running` forever |
| SCAN-15 | P2 | Analyse the **same video twice** | Second run is noticeably faster on repeated comments (text-hash cache in `comment_analyses`) |
| SCAN-16 | P3 | Analyse a video mixing English and Hindi comments | The language breakdown shows both, with sensible proportions |

---

## 6. Dashboard — `DASH`

| ID | P | Steps | Expected |
|---|---|---|---|
| DASH-01 | P1 | Sign in as a **brand-new** user, open `/dashboard` | Empty state that invites a first analysis. **Not** blank tiles or a chart of zeros |
| DASH-02 | P1 | After 2–3 scans, reload `/dashboard` | Stat tiles show real totals: scans, comments analysed, harmful found, average toxicity, saved, this week |
| DASH-03 | P1 | Check the toxicity trend chart | Plots the last 30 days. Points line up with when scans were actually run |
| DASH-04 | P1 | Check the category breakdown | Proportions match the scans. Colours come from `CATEGORY_META` — muted pastels, no saturated red/green |
| DASH-05 | P1 | Check the language breakdown | Every language actually scanned appears |
| DASH-06 | P2 | Check recent scans | Five most recent, newest first. Each links to its detail page |
| DASH-07 | P1 | Open `/dashboard/history` | Every scan, newest first, paginated |
| DASH-08 | P2 | Page forward and back in history | Pagination correct; no duplicated or skipped rows at the boundary |
| DASH-09 | P2 | Filter history by status | Only matching scans shown |
| DASH-10 | P1 | Delete a scan from history | Row disappears. Its comments, analyses, saved entry and reports go with it (cascade) |
| DASH-11 | P1 | Save a scan | Appears under `/dashboard/saved` |
| DASH-12 | P2 | Add a note and tags to a saved scan | Persist across a reload |
| DASH-13 | P2 | Save the **same** scan twice | Updates in place. **No duplicate row** (unique index on user+scan) |
| DASH-14 | P2 | Unsave | Removed from saved; **the scan itself still exists** in history |
| DASH-15 | P1 | Open `/dashboard/saved` with nothing saved | Real empty state |
| DASH-16 | P2 | Update name and preferred language in settings | Persist across reload |
| DASH-17 | P2 | Change password in settings, sign out, sign in with the new one | Works |
| DASH-18 | P2 | Reload each dashboard page and watch closely | Loading skeleton matches the real layout — content does not jump on hydration |
| DASH-19 | P2 | Visit `/dashboard/scans/<random-uuid>` | Not-found page offering a way back to history. **Not** a stock 404 |
| DASH-20 | P1 | As `user-b`, visit a scan URL belonging to `user-a` | Not found. **This is a functionality requirement** — the query is scoped by user |

---

## 7. Scan detail — `DETAIL`

| ID | P | Steps | Expected |
|---|---|---|---|
| DET-01 | P1 | Open a completed scan | Video header, summary tiles, breakdown charts, comment list all render |
| DET-02 | P1 | Check summary tiles | Analysed count, harmful %, average confidence, dominant language, duration, disagreement rate — all populated |
| DET-03 | P1 | Check a comment card | Text, author, category badge, severity badge, confidence, language all present |
| DET-04 | P1 | Find a sarcastic comment | Sarcasm flag visible, with the Groq rationale |
| DET-05 | P1 | Find a comment where the models disagreed | Stated plainly, not hidden |
| DET-06 | P2 | Filter comments by category | Only that category shown |
| DET-07 | P2 | Filter by severity | Only that severity shown |
| DET-08 | P2 | Sort by confidence, then by severity | Order changes correctly |
| DET-09 | P2 | Check severity ordering anywhere it is listed | `none → mild → moderate → severe → critical`, **by rank, never alphabetically** |
| DET-10 | P2 | Find a comment the model errored on | No feedback controls on it — there is no prediction to dispute |
| DET-11 | P2 | Check a scan with 200 comments | Page stays responsive. No layout break |

---

## 8. Feedback (human-in-the-loop) — `FB`

The research feature. Test it carefully.

| ID | P | Steps | Expected |
|---|---|---|---|
| FB-01 | P1 | Click "Looks right" on a comment | Flips to confirmed **immediately** (optimistic). Persists across reload |
| FB-02 | P1 | Click "This is wrong" | Inline form opens: category chips, optional severity, optional note |
| FB-03 | P1 | Open the form and touch nothing | **Submit is disabled**, and the reason is visible — mirrors the server's `.refine()` rule |
| FB-04 | P1 | Pick a category only | Submit enables. Submits successfully |
| FB-05 | P1 | Type a note only, no category | Submit enables. Server accepts (`category OR note`) |
| FB-06 | P2 | Pick category + severity + note | All three saved and shown back |
| FB-07 | P2 | Reload the page | Your verdict is still shown on that comment |
| FB-08 | P1 | Change a submitted verdict | Updates **in place**, no duplicate. Status returns to `open` for re-review |
| FB-09 | P2 | Cancel the form | Closes. Focus returns to the trigger button |
| FB-10 | P2 | Press Escape with the form open | Closes, focus returns |
| FB-11 | P2 | Type a note approaching 1000 chars | Counter appears around 800. Hard-capped at 1000 |
| FB-12 | P2 | Open the form with keyboard only | Focus moves into the form. Chips operable with Enter/Space |
| FB-13 | P2 | Sign out in another tab, then submit feedback | "Your session has expired" with a `/login` link — **not** a generic failure |
| FB-14 | P2 | Give feedback on 5+ comments across 2 scans | All recorded. All appear in the admin queue |
| FB-15 | P3 | Check colours used for right/wrong | Muted taxonomy ink. **No saturated red/green** — deliberate design decision |

---

## 9. Reports — `REP`

| ID | P | Steps | Expected |
|---|---|---|---|
| REP-01 | P1 | Generate a PDF report from a completed scan | Appears under `/dashboard/reports` with status `ready` |
| REP-02 | P1 | Download it, open in a browser, print-preview | Video header, summary tiles, category/severity/language tables, signals section, most-severe comments, limitations footer |
| REP-03 | P1 | Generate a CSV, open in Excel or Sheets | All columns present. **Hindi/Marathi text renders correctly** (UTF-8 BOM) |
| REP-04 | P1 | In the CSV, check a comment starting with `=`, `+`, `-` or `@` | Prefixed with `'` so the spreadsheet does not execute it as a formula |
| REP-05 | P1 | Generate JSON and open it | Valid JSON. Contains video, analysis and per-comment verdicts including `rawScores` |
| REP-06 | P2 | Generate a report on a **failed** scan | Rejected with 409 and a clear explanation — nothing to report on |
| REP-07 | P2 | Generate two reports for the same scan | Both listed separately, each downloadable |
| REP-08 | P2 | Check the reports list | Format badge, status, size and date all correct |
| REP-09 | P1 | As `user-b`, hit `user-a`'s report download URL | Not found — ownership is checked against the session |
| REP-10 | P2 | Check the report's most-severe list | Sorted worst-first by severity rank, then confidence |
| REP-11 | P2 | Report on a scan with Hindi comments | Language table shows Hindi correctly |
| REP-12 | P3 | Check the report footer | States the limitations plainly (sample not census, confidence not fact) |

---

## 10. Admin console — `ADM`

### 10.1 Overview and users

| ID | P | Steps | Expected |
|---|---|---|---|
| ADM-01 | P1 | Open `/admin` | Platform totals across **all** users: users, scans, comments, harmful rate, reports, open feedback |
| ADM-02 | P2 | Compare admin totals against your own dashboard | Admin figures are higher — they span every account |
| ADM-03 | P2 | Check the activity feed | Recent scans and audit entries, newest first |
| ADM-04 | P1 | Open `/admin/users` | All three accounts listed with role, scan count, joined, last seen |
| ADM-05 | P2 | Search by email | Filters correctly |
| ADM-06 | P2 | Sort by each sortable column | Order changes; direction toggles |
| ADM-07 | P1 | Promote `user-b` to admin | Role updates. **An audit entry is written** |
| ADM-08 | P1 | Demote `user-b` back | Works. Audit entry written |
| ADM-09 | P1 | **Try to demote yourself** | **Refused** — "Ask another administrator to do it." This is the self-lockout guard |
| ADM-10 | P1 | **Try to suspend yourself** | **Refused** for the same reason |
| ADM-11 | P1 | With only one admin, try to demote them via the API | **409** — "This is the only active administrator." |
| ADM-12 | P2 | Suspend `user-a`, then try to sign in as them | Blocked with a suspension message |
| ADM-13 | P2 | Unsuspend `user-a`, sign in again | Works |
| ADM-14 | P2 | Send a no-op change (promote an existing admin) | 409 "already admin and active". **No empty audit row written** |

### 10.2 Scans and feedback queue

| ID | P | Steps | Expected |
|---|---|---|---|
| ADM-15 | P1 | Open `/admin/scans` | Every scan across all users, with owner email |
| ADM-16 | P2 | Filter by status, then by owner | Both filter correctly |
| ADM-17 | P2 | Open an admin scan detail | Read-only. **No feedback controls, no delete button** |
| ADM-18 | P2 | Check flags on an admin scan detail | Sarcasm, context-shifted and models-disagree all render where present |
| ADM-19 | P1 | Open `/admin/feedback` | Defaults to `?status=open`. Items from FB-14 are listed |
| ADM-20 | P1 | Inspect one queue item | Shows comment text, what the model said, what the user says, their note, and the Groq rationale |
| ADM-21 | P1 | **Accept** an item | Status → `accepted`, `reviewedBy` and `reviewedAt` set. Audit entry written |
| ADM-22 | P1 | **Reject** another item | Status → `rejected`. Audit entry written |
| ADM-23 | P1 | **Try to re-triage an already-accepted item** | **409 with an explanation** — re-triaging would silently change the ground truth the metrics were computed from |
| ADM-24 | P2 | Filter the queue by each status | Counts on the tabs match the rows shown |

### 10.3 Metrics — the research page

| ID | P | Steps | Expected |
|---|---|---|---|
| ADM-25 | P1 | Open `/admin/metrics` with **no** accepted feedback | A banner explaining there is not enough reviewed data. **No fabricated figures** |
| ADM-26 | P1 | Accept 10+ feedback items, click **Recompute**, reload | Confusion matrix, precision, recall and F1 all populate |
| ADM-27 | P1 | Check the "working" panel | Real counts substituted into each formula, e.g. `TP / (TP + FP)` → `27 / 32` → `0.844`. An examiner must be able to check the arithmetic |
| ADM-28 | P1 | Check the confusion matrix | Proper row/column headers. Cells shaded relative to their own row, so a rare class is not blank beside a majority class |
| ADM-29 | P1 | Check **false positives** | Model said harmful, human said clean — **with the actual comment text** |
| ADM-30 | P1 | Check **false negatives** | Model said clean, human said harmful — with the text |
| ADM-31 | P1 | Find a slice with fewer than 5 observations | Raw counts shown, **derived ratios withheld**, and the withheld (model, language) pairs **named in a footnote** rather than dropped |
| ADM-32 | P2 | Check disagreement by language | Populated from `modelsDisagree`, broken down per language |
| ADM-33 | P2 | Apply a date-range filter | Figures change to match the range |
| ADM-34 | P2 | Recompute with no reviewed feedback in range | `written: 0` reported as **success** with an explanation — not an error |
| ADM-35 | P2 | Check the snapshots table | Each recompute appears with its period and sample size |
| ADM-36 | P2 | Check ROC-AUC | Rendered where computable; where not, said so rather than shown as 0 |

### 10.4 Models and audit

| ID | P | Steps | Expected |
|---|---|---|---|
| ADM-37 | P1 | Open `/admin/models` | Volume, confidence, harmful rate, disagreement and error rate per model |
| ADM-38 | P1 | Check the model × language grid | **Hindi/Marathi rows sit under MuRIL; English/European under XLM-R.** This is the routing decision made visible |
| ADM-39 | P2 | Check latency by language | Populated |
| ADM-40 | P1 | Open `/admin/audit` | Every admin action from ADM-07 onward: actor, action, entity, metadata, IP, timestamp |
| ADM-41 | P2 | Filter by actor, then by action | Both filter correctly |
| ADM-42 | P2 | Check a combined role+suspend change | **Two audit rows** written, so neither is invisible under a single-action filter |
| ADM-43 | P2 | Look for a delete control on the audit page | **There is none.** An audit log an admin can prune is not evidence |

---

## 11. Cross-cutting — `X`

| ID | P | Steps | Expected |
|---|---|---|---|
| X-01 | P1 | Walk the whole app at 375px width | No horizontal scrollbar anywhere. Tables become cards on small screens |
| X-02 | P2 | Walk the whole app at 768px and 1440px | Layouts hold |
| X-03 | P1 | Enable `prefers-reduced-motion`, reload the landing page | The pinned card gallery and review wall stop animating and become readable static layouts |
| X-04 | P2 | Tab through every form | Focus order sensible. Focus ring always visible |
| X-05 | P2 | Check every form field | Real `<label>` tied to its input. Errors in `role="alert"` |
| X-06 | P2 | Disconnect the network mid-analysis | Clear error. UI recovers to a usable state |
| X-07 | P2 | Stop the database, load `/dashboard` | The error boundary appears with a retry — **not** a raw stack trace |
| X-08 | P2 | Stop the database, load `/admin/metrics` | Admin error boundary shows the message (admins get detail) and suggests `npm run check` |
| X-09 | P3 | Check the browser console across the app | No React key warnings, no hydration mismatches |
| X-10 | P2 | Analyse a video whose comments are all clean | Toxicity 0%. Charts render an honest empty distribution, not a broken one |
| X-11 | P2 | Analyse a video with heavy emoji-only comments | No crash. Language detection degrades gracefully |
| X-12 | P3 | Leave a scan running and reload the page | State is coherent — either running or resolved, never inconsistent |

---

## 12. Pipeline accuracy — `ACC`

These record **model behaviour**, not pass/fail bugs. Their purpose is to give
the dissertation real numbers, including where the system is weak. A "fail"
here is a finding to write up, not necessarily something to fix.

| ID | P | Method | Record |
|---|---|---|---|
| ACC-01 | P1 | Run 20 known-clean English comments | How many false positives? |
| ACC-02 | P1 | Run 20 known-toxic English comments | How many false negatives? |
| ACC-03 | P1 | Run 20 known-clean Hindi comments | False positive rate vs English — expected to be worse |
| ACC-04 | P1 | Run 20 known-toxic Hindi comments | False negative rate vs English |
| ACC-05 | P1 | Run 20 romanised Hinglish comments, mixed | Does the code-mix path beat sending them to XLM-R? |
| ACC-06 | P1 | Run 10 sarcastic comments with no abusive words | How many did Groq catch? **This is the headline research result** |
| ACC-07 | P2 | Run 10 replies harmless alone but hostile in context | How many were flagged `contextShifted`? |
| ACC-08 | P2 | Run 10 comments criticising an *idea*, not a person | Should be clean. Criticism is not toxicity |
| ACC-09 | P2 | Run 10 comments with profanity but no target | Should be `profanity`/`mild`, not `insult`/`severe` |
| ACC-10 | P2 | Run 10 reclaimed/in-group usages | Should not be automatically toxic |
| ACC-11 | P2 | Compare severity bands against your own judgement on 20 comments | How often does the band feel right? |
| ACC-12 | P2 | Count `modelsDisagree` across 200 comments | Overall disagreement rate — a genuine finding |
| ACC-13 | P3 | Same 20 comments twice | Verdicts identical (`temperature: 0` in `groq.ts`) |

---

## 13. Regression checklist

Run before any release.

- [ ] `npm run check` green
- [ ] `npm run typecheck` clean
- [ ] `npm run build` succeeds
- [ ] Register → analyse → view → save → report → feedback, end to end
- [ ] Admin: login → users → feedback → accept → recompute → metrics populate
- [ ] One Hindi, one Marathi and one romanised scan route to MuRIL
- [ ] One English scan routes to XLM-R
- [ ] A sarcastic comment is flagged
- [ ] `user-b` cannot see `user-a`'s scans, reports or saved analyses
- [ ] 375px width has no horizontal scrollbar

---

## 14. Known behaviour — not bugs

Do not raise these:

| Behaviour | Why |
|---|---|
| First analysis after idle is slow | Hugging Face loads the model onto a worker. The client waits it out |
| 200-comment scans take minutes | Two model calls per comment plus deliberate rate-limit pacing |
| Hindi severity feels coarser than English | MuRIL is binary; category and nuance come from Groq. This is the documented limitation |
| No sarcasm flags without `GROQ_API_KEY` | Enrichment is optional by design; the app degrades rather than fails |
| `/results` redirects to `/dashboard/history` | Retired once scans became persistent |
| Admin scan detail caps at 200 comments | No cursor pagination there yet |
| Feedback count does not live-update after submit | Client state only; refreshes on next navigation |
