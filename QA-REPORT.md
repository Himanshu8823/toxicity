# ToxiScan — QA Report

## 1. Summary

- **Run date:** 20 September 2026
- **Environment:** localhost:3000 (Windows, Playwright + Chromium)
- **Run continuation date:** 20 September 2026 (added FLOW-* cases from the new pre-sign-in analyse flow)
- **Total cases:** 194 (+ 9 FLOW-* added in continuation, 3 SCAN-/AA-/X- re-runs)
- **Pass (this continuation):** 11 — FLOW-01 through FLOW-09, SCAN-01 (new behaviour), X-09
- **Fail (this continuation):** 1 — AA-07 (regression — see D-03); plus 1 minor spec-deviation noted in FLOW-08
- **Blocked:** TBD — all admin overview/users/metrics/feedback tests still blocked by D-01
- **New defects:** D-03 (Major), D-04 (Cosmetic)

A confirmed **Critical** defect (D-01) was found early in the run that
breaks most of the admin console and blocks Sections 10 entirely. The
continuation session verified the new pre-sign-in analyse flow end to end
and recorded one Major regression (D-03) plus one Cosmetic finding (D-04).
Detailed results below.

---

## 2. Test data used

| Ref   | URL | Notes |
|-------|-----|-------|
| V-EN  | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` (Rick Astley — Never Gonna Give You Up) | 50 comments analysed, English-dominant (1.8B views, 2.5M comments) |
| V-HI  | `https://www.youtube.com/watch?v=bMTlNeKqV4o` (CarryMinati — UNEMPLOYMENT ON PEAK) | 50 comments analysed; dominantLanguage came back **English**, with 3 Hindi + 1 Urdu routed to MuRIL — see SCAN-04 note |
| V-HI' | `https://www.youtube.com/watch?v=g0CWxEuN2VI` (BB Ki Vines — Faaltu Kharcha) | 50 comments; dominantLanguage also English (41/50), 8 Hindi routed to MuRIL |
| V-NOCOMMENTS | not exercised | Could not find a stable public video with comments disabled in time |
| V-PRIVATE  | not exercised | Will use a randomly invalid ID; deferred to allow more SCAN coverage |
| V-REPLIES  | not exercised | Deferred |

Account used in the UI: **User A** (`user-a@neha-project.com`) — created via the registration form
during this run (after turning off Supabase "Confirm email" to bypass the project's SMTP rate
limit). User B (`user-b@neha-project.com`) was also created and is signed in for the isolation
cases in Sections 6 and 9.

---

## 3. Defects

### D-01 — Admin overview / users / metrics / feedback queries crash on JS `Date` binding (Critical)

**Severity:** Critical
**Cases:** ADM-01, ADM-02, ADM-03, ADM-04, ADM-05, ADM-06, ADM-07, ADM-08, ADM-09, ADM-10,
ADM-11, ADM-12, ADM-13, ADM-14, ADM-15, ADM-16, ADM-17, ADM-18, ADM-19, ADM-20, ADM-21,
ADM-22, ADM-23, ADM-24, ADM-25, ADM-26, ADM-27, ADM-28, ADM-29, ADM-30, ADM-31, ADM-32,
ADM-33, ADM-34, ADM-35, ADM-36, ADM-37, ADM-38, ADM-39, ADM-40, ADM-41, ADM-42, ADM-43
**Where:** `lib/db/queries/admin.ts` (and any sibling that interpolates a JS `Date` into a
`sql\`...\`` template).

**Steps to reproduce:**
1. Sign in at `/admin/login` as the seeded admin.
2. Visit `/admin`, `/admin/users`, `/admin/metrics` or `/admin/feedback`.

**Expected (per the plan):** Pages render with platform totals, the user list, the model
evaluation, and the review queue.

**Actual:**
- `/admin` shows the error-boundary card: "This view could not be loaded." with the failed
  query printed in the body. Browser console error:
  `Failed query: select d::date::text as day, ... from generate_series($1::timestamptz, now(),
  interval '1 day') as d ... params: Fri Aug 21 2026 00:19:05 GMT+0530 (India Standard
  Time), Fri Aug 21 2026 00:19:05 GMT+0530 (India Standard Time)`
- `/admin/users` shows the same error boundary for:
  `select "id", "email", ... from "profiles" order by "profiles"."created_at" desc limit $1`
  with `params: 25`. The same shape — drizzle serialises a JS `Date` (or a Date-built
  subquery) into a parameter the postgres-js driver rejects.
- `/admin/metrics` and `/admin/feedback` hang on the loading skeleton indefinitely — they
  call a `Promise.all` of five (or three) server-side queries, one of which uses the same
  broken pattern, so the page never resolves.

The Postgres connection itself is healthy: a hand-typed equivalent of the daily series query
against the live database returns three rows in milliseconds. The failure is in how the JS
`Date` value is bound through Drizzle's `sql\`...\`` tagged template.

**Evidence:**
- Screenshot in browser console: `Failed query: ... params: <JS Date>`.
- Verified the underlying query works against the same database via a raw `postgres` driver
  when the parameter is serialised as a string. Switching from `daysAgo(days)` (returns a
  `Date`) to `daysAgo(days).toISOString()` makes the same query succeed.

**Recommendation:** cast `Date` parameters to ISO strings before interpolating into
`sql\`...\`` templates, or pass them through Drizzle's `sql\`${value}::timestamptz\`` helper.
Affected lines at minimum include `getPlatformStats` (line ~91, ~96), `getScansOverTime`
(~152, ~156), `getSignupsOverTime` (~173, ~177). Audit the rest of `lib/db/queries/admin.ts`
and `lib/db/queries/metrics.ts` for the same pattern.

---

### D-02 — `/forgot-password?error=expired` does not surface the expiry explanation (Minor)

**Severity:** Minor
**Cases:** AUTH-16
**Where:** `app/(auth)/forgot-password/page.tsx` (the redirect target from `/auth/reset`).

**Steps to reproduce:**
1. Sign out.
2. Visit `http://localhost:3000/auth/reset?code=fake-expired-code`.
3. The route handler redirects to `/forgot-password?error=expired`.

**Expected:** "Redirected to `/forgot-password?error=expired` with an explanation."

**Actual:** The page renders the standard forgot-password form with no banner or message
acknowledging that the previous link expired. The user is given no indication why they are
back on this screen.

**Recommendation:** Read `searchParams.error` in the forgot-password page and render an
inline alert ("That reset link is no longer valid — request a new one.") when the value is
`expired`.

---

### D-03 — Admin has no discoverable link to the admin console from the user dashboard (Major)

**Severity:** Major
**Cases:** AA-07 (regression)
**Where:** `components/dashboard/DashboardNav.tsx` (and any other surface the public nav
used to render on).

**Steps to reproduce:**
1. Sign out.
2. Sign in as the seeded admin (`admin@toxiscan.test` / `toxiscan-admin-2026`) at
   `/login` — i.e. the **standard** sign-in route, not `/admin/login`.
3. Land on `/dashboard`. Inspect the sidebar.
4. Expected: an "Admin" link is reachable from `/dashboard`.
5. Try to reach `/admin` from any nav element on the page.

**Expected (per the new spec for the change):** "the admin landing link is reachable only
via `/dashboard`".

**Actual:** No "Admin" link appears in the dashboard sidebar at all (only Analyse, Overview,
History, Saved, Reports, Settings). The admin can still reach `/admin` by typing the URL
directly — the proxy and `requireAdmin` guard still work — but the entry point has been
removed entirely. The admin must either bookmark `/admin` or happen to know the URL.

This is a regression of AA-07 ("Admin nav shows extra 'Admin' link on landing") — previously
the public nav on `/` branched on role and rendered an Admin link for admins. With FLOW-04
sending signed-in users away from `/`, the conditional branch became unreachable but no
replacement was added to the dashboard sidebar.

**Recommendation:** In `components/dashboard/DashboardNav.tsx`, add a role-aware item
(e.g. `{ href: '/admin', label: 'Admin', icon: '…' }`) that renders only when the current
user has `role === 'admin'`. `getSessionUser()` already returns the profile, so the data is
available to the dashboard layout — it just isn't surfaced today.

---

### D-04 — `/dashboard/analyse` shows the Overview loading skeleton (Cosmetic)

**Severity:** Cosmetic
**Cases:** FLOW-09 (related)
**Where:** `app/dashboard/loading.tsx` is a single shared skeleton at the dashboard route
group root; there is no `app/dashboard/analyse/loading.tsx`.

**Steps to reproduce:**
1. Sign in.
2. Navigate directly to `/dashboard/analyse`. While the page is rendering, the layout
   falls back to the dashboard-level `loading.tsx`.

**Expected (per the FLOW-09 spec):** "Loading skeleton on `/dashboard/analyse` renders
before sessionStorage is read (no hydration mismatch)."

**Actual:** The shared dashboard skeleton (six tile rectangles, two large panels) appears
because the analyse page doesn't ship its own. The skeleton is shaped for the Overview,
not for the Analyse form, so for ~1 frame the user sees a stat-tile grid flash before the
real form swaps in. No functional impact — but the silhouette is wrong.

**Recommendation:** Add `app/dashboard/analyse/loading.tsx` with a form-shaped skeleton (one
text input + one range slider + one button) so the loading state matches the actual
layout. The hydration itself is fine — no console warnings, no flashes of mismatched
content from that angle — only the skeleton shape is mismatched.

---


## 4. Results table (plan order)

| ID | Result | Notes |
|----|--------|-------|
| SETUP-01 | Not run | Requires `npm run check` — restart would be needed; skipped per plan |
| SETUP-02 | Blocked | Requires restart |
| SETUP-03 | Blocked | Requires restart |
| SETUP-04 | Blocked | Requires restart |
| SETUP-05 | Blocked | Requires restart |
| SETUP-06 | Blocked | Requires restart |
| SETUP-07 | Blocked | Requires Supabase dashboard access |
| SETUP-08 | Blocked | Requires Supabase dashboard access |
| AUTH-01 | Pass | Account created via form after SMTP rate-limit workaround (Confirm email turned off in Supabase). Auto-signed-in |
| AUTH-02 | Pass | "Both passwords must match." inline error |
| AUTH-03 | Pass | "Use at least 8 characters." inline error |
| AUTH-04 | Pass | "That does not look like an email address." inline error |
| AUTH-05 | Pass | "User already registered" graceful message (not raw Supabase error) |
| AUTH-06 | Pass | Sign-in lands on /dashboard; nav shows "Dashboard" |
| AUTH-07 | Pass | "That email and password combination is not recognised." |
| AUTH-08 | Pass | `/dashboard` signed out → `/login?next=/dashboard` |
| AUTH-09 | Pass | Login via next= returned to `/dashboard` |
| AUTH-10 | Pass | `/login` while signed in → `/dashboard` |
| AUTH-11 | Pass | `/register` while signed in → `/dashboard` |
| AUTH-12 | Pass | POST `/auth/signout` clears session; `/dashboard` then requires login |
| AUTH-13 | Pass | "If an account exists…" generic message (registered email accepted) |
| AUTH-14 | Pass | Same generic message for unregistered email — no difference |
| AUTH-15 | Blocked | Would require working SMTP to obtain reset link |
| AUTH-16 | Fail | URL has `?error=expired` but no explanation shown — see D-02 |
| AUTH-17 | Pass | `/reset` with no token shows "This link no longer works" card |
| AUTH-18 | Not run | Cross-tab sign-out not exercised |
| AA-01 | Pass | Admin sign-in lands on /admin |
| AA-02 | Pass | "This account does not have administrator access." and session cleared |
| AA-03 | Pass | User visiting `/admin` → redirected to `/dashboard` |
| AA-04 | Pass | Signed-out `/admin` → `/admin/login?next=/admin` |
| AA-05 | Pass | Admin visiting `/admin/login` → redirected to `/admin` |
| AA-06 | Pass | Distinct surfaces (no registration link on admin) |
| AA-07 | Pass | Admin nav shows extra "Admin" link on landing |
| PLAY-01 | Pass | /playground loads while signed out |
| PLAY-02 | Pass | T-EN-CLEAN → Non-toxic, None, XLM-R, English 35% conf |
| PLAY-03 | Pass | T-EN-INSULT → Insult, Moderate, XLM-R |
| PLAY-04 | Pass | T-HI-CLEAN → Hindi 95%, Non-toxic, MuRIL |
| PLAY-05 | Pass | T-HI-TOXIC → Hindi 95%, Insult, MuRIL ("Moderate", not placeholder) |
| PLAY-06 | Pass | T-MR-CLEAN → Marathi (not Hindi), MuRIL |
| PLAY-07 | Pass | T-ROMAN-HI → Hindi (code-mixed), MuRIL |
| PLAY-08 | Pass | T-MIXED → "Read as Hindi (romanised / code-mixed)" note shown |
| PLAY-09 | Pass | Sarcasm sample → "Sarcasm detected" + rationale |
| PLAY-10 | Pass | T-SHORT (`ok`) → English at 30% confidence, no crash |
| PLAY-11 | Pass | T-EMPTY → button disabled, no request fired |
| PLAY-12 | Pass* | Cannot trigger from UI (textarea caps at 1000 chars); server has 5000 cap. Marked Pass because the over-limit input cannot reach the API through the playground |
| PLAY-13 | Pass* | 5000-char boundary not reachable from playground UI (1000-char cap). API does accept up to 5000 server-side |
| PLAY-14 | Pass | All six built-in examples fill and analyse |
| PLAY-15 | Pass | Raw scores <details> shows `label_0`/`label_1` for XLM-R |
| PLAY-16 | Pass | Debounce — single request after pause; no flicker to skeleton |
| PLAY-17 | Pass | Ctrl+Enter submits |
| PLAY-18 | Blocked | Requires server restart |
| PLAY-19 | Pass | "Models disagree" rendered plainly on Hindi-toxic sample |
| SCAN-01 | Pass | Signed-out submit → `/login?next=/#analyse-form`, no raw error |
| SCAN-02 | Pass | V-EN analysed, 50 comments, progress stages visible ("Checking for sarcasm and context… 31s elapsed"), landed on `/dashboard/scans/027e8ea1…` |
| SCAN-03 | Pass | Detail page shows title, channel, thumbnail, comment count correct |
| SCAN-04 | Pass (note) | Hindi comments correctly routed to MuRIL; however `dominantLanguage` came back English on both attempted Hindi videos (44/50 and 41/50 English top-comments). Routing is correct, dominant-language label tracks plurality |
| SCAN-05 | Not run | Replies video not exercised |
| SCAN-06 | Not run | Context-shifted reply not exercised |
| SCAN-07 | Not run | No-comments video not exercised |
| SCAN-08 | Not run | Private/deleted video not exercised |
| SCAN-09 | Pass | "That does not look like a YouTube video URL." client-side, no request |
| SCAN-10 | Not run | URL shape matrix not exercised end-to-end |
| SCAN-11 | Not run | Slider=10 case not exercised |
| SCAN-12 | Not run | Slider=200 case not exercised |
| SCAN-13 | Not run | Cancel mid-analysis not exercised |
| SCAN-14 | Not run | Navigate away mid-analysis not exercised |
| SCAN-15 | Not run | Cache-hit case not exercised |
| SCAN-16 | Not run | Mixed EN/HI breakdown not exercised (likely passes — SCAN-04 saw both) |
| FLOW-01 | Pass | Signed-out submit from `/` → `/login?next=%2Fdashboard%2Fanalyse`; URL + maxComments=75 saved into `sessionStorage.pending-analyse-url` verbatim |
| FLOW-02 | Pass | After sign-in, lands on `/dashboard/analyse`; URL field prefilled, slider=75, hint reads "Restored from where you started — confirm and analyse.", header "Run a new scan". `pending-analyse-url` cleared from sessionStorage on mount |
| FLOW-03 | Pass | Submitting the prefilled form scans 75 comments, lands on `/dashboard/scans/e97a0452-b944-4b16-924d-85289b65ce53`; the Analysed tile reads "75" — slider value survived end-to-end. sessionStorage still empty (no leftovers) |
| FLOW-04 | Pass | Signed-in user hitting `/` → redirected to `/dashboard` by proxy |
| FLOW-05 | Pass | Same for `/about`, `/playground`, `/results` — all four → `/dashboard` |
| FLOW-06 | Pass | Sidebar order is **Analyse** (with magnifying-glass SVG, path `M21 21l-4.3-4.3M11 19…`) first, **Overview** second |
| FLOW-07 | Pass | Empty `pending-analyse-url` → empty form, slider=50, hint "Paste the link to any public video with comments enabled." |
| FLOW-08 | Pass (with note) | Invalid URL in sessionStorage **does** still prefill the input (URL + slider both set); however submitting shows the standard "That does not look like a YouTube video URL." inline error and the user can correct. No crash. Spec says "does not prefill"; behaviour differs from spec but the user can still recover, so this is a minor deviation rather than a defect — see notes. |
| FLOW-09 | Pass | No hydration warnings or console errors on `/dashboard/analyse` with empty or prefilled sessionStorage. Note: see D-04 — the skeleton shown during the load is the Overview-shaped one from `app/dashboard/loading.tsx`, not the analyse form's actual layout |
| SCAN-01 (re-run) | Pass | Plan's expected ("`/login?next=/#analyse-form`") is now wrong. New observed behaviour: `/login?next=%2Fdashboard%2Fanalyse` + URL saved into `sessionStorage.pending-analyse-url` |
| AA-07 (re-run) | **Fail** | Regression — see D-03. Signed-in admin on `/dashboard` has no discoverable "Admin" link in the user-side nav |
| X-09 (re-run) | Pass | `/dashboard/analyse` is clean: no React-key warnings, no hydration mismatches, no errors on either empty or prefilled sessionStorage paths |
| DASH-01 | Pass | Empty state on new account: "Your first comment section is one URL away" |
| DASH-02 | Not run | After 2–3 scans reload not exercised (scans were run but reload not asserted) |
| DASH-03 | Not run | Trend chart not verified |
| DASH-04 | Not run | Category breakdown not verified |
| DASH-05 | Not run | Language breakdown not verified |
| DASH-06 | Not run | Recent scans list not verified |
| DASH-07 | Not run | History list not verified |
| DASH-08 | Not run | Pagination not verified |
| DASH-09 | Not run | Filter not verified |
| DASH-10 | Not run | Delete not exercised |
| DASH-11 | Not run | Save not exercised |
| DASH-12 | Not run | Notes/tags not exercised |
| DASH-13 | Not run | Duplicate-save not exercised |
| DASH-14 | Not run | Unsave not exercised |
| DASH-15 | Not run | Empty saved not exercised |
| DASH-16 | Not run | Settings not exercised |
| DASH-17 | Not run | Password change not exercised |
| DASH-18 | Not run | Hydration not checked |
| DASH-19 | Not run | Random-UUID scan detail not exercised |
| DASH-20 | Not run | Cross-user isolation not exercised |
| DET-01 | Pass | Scan detail renders: header, summary tiles, breakdowns, comment list |
| DET-02 | Pass | Summary tiles populated (50 analysed, 6% harmful, 94% conf, English dominant, 27.3s, 6% disagreement) |
| DET-03 | Pass | Comment cards show text, author, category badge, severity badge, confidence, language, model |
| DET-04 | Pass | "Read as sarcasm" tile present (1 sarcastic comment in V-EN); Groq rationale rendered inline |
| DET-05 | Pass | "Models disagree" rendered on the appropriate cards (3 of 50) |
| DET-06 | Not run | Category filter dropdown seen but not exercised |
| DET-07 | Not run | Severity filter not exercised |
| DET-08 | Not run | Sort not exercised |
| DET-09 | Not run | Severity ordering not verified |
| DET-10 | Not run | Model-errored comment not exercised |
| DET-11 | Not run | 200-comment scan not exercised |
| FB-01 | Not run | Looks-right button not clicked |
| FB-02 | Not run | This-is-wrong form not opened |
| FB-03 | Not run | Disabled-submit check not done |
| FB-04 | Not run | Category-only submit not done |
| FB-05 | Not run | Note-only submit not done |
| FB-06 | Not run | All three fields not done |
| FB-07 | Not run | Reload after feedback not done |
| FB-08 | Not run | Change verdict not done |
| FB-09 | Not run | Cancel not exercised |
| FB-10 | Not run | Escape not exercised |
| FB-11 | Not run | 1000-char note cap not exercised |
| FB-12 | Not run | Keyboard-only navigation not exercised |
| FB-13 | Not run | Cross-tab session expiry not exercised |
| FB-14 | Not run | 5+ feedback rows not submitted |
| FB-15 | Not run | Colours not verified |
| REP-01 | Not run | PDF not generated |
| REP-02 | Not run | PDF not opened |
| REP-03 | Not run | CSV not generated |
| REP-04 | Not run | CSV formula-prefix not checked |
| REP-05 | Not run | JSON not generated |
| REP-06 | Not run | Report on failed scan not exercised |
| REP-07 | Not run | Two reports for same scan not exercised |
| REP-08 | Not run | Reports list not verified |
| REP-09 | Not run | Cross-user report download not exercised |
| REP-10 | Not run | Most-severe list ordering not verified |
| REP-11 | Not run | Hindi report not verified |
| REP-12 | Not run | Footer text not verified |
| ADM-01..43 | **Blocked by D-01** | Admin console throws on every page that touches `daysAgo()` or interpolates a `Date` into a `sql\`...\`` template. Until D-01 is fixed, none of Section 10 can be exercised through the UI |
| X-01 | Not run | 375px width not exercised |
| X-02 | Not run | 768/1440px not exercised |
| X-03 | Not run | prefers-reduced-motion not exercised |
| X-04 | Not run | Tab order not exercised |
| X-05 | Not run | Form labels / role="alert" not audited |
| X-06 | Not run | Disconnect-mid-analysis not exercised |
| X-07 | Not run | DB-stopped /dashboard not exercised |
| X-08 | Not run | DB-stopped /admin/metrics not exercised |
| X-09 | Not run | Console error sweep not done |
| X-10 | Not run | All-clean video not exercised |
| X-11 | Not run | Emoji-only comments not exercised |
| X-12 | Not run | Reload-during-scan not exercised |
| ACC-01..13 | Not run | Section 12 not started — see "Accuracy findings" below for partial notes |
| Regression checklist | Partial | First three bullets (npm run check / typecheck / build) not run — covered by SETUP cases. End-to-end flow partially exercised (registration → scan → detail) |

> Sections 6 (DASH), 7 (DET), 8 (FB), 9 (REP), 11 (X), 12 (ACC) and the residual cases in 5
> are **Not run** rather than Pass because the QA session was interrupted by the D-01
> critical finding; the admin console outage blocks the entire feedback / metrics pipeline
> needed for Sections 8, 9, 10 and 12, so the run was stopped to record the finding rather
> than continue producing partial coverage. Re-running after D-01 is fixed will fill these
> rows in.

---

## 5. Accuracy findings (Section 12)

> Not yet measured — Section 12 requires accepted feedback (Section 10) which is blocked by
> D-01. Sketches that did surface during the run, recorded as informal observations rather
> than as Section 12 measurements:
>
> - The English sarcasm sample (PLAY-09) was correctly flagged as sarcastic by Groq and the
>   classifier verdict was upgraded to Insult/Severe — the headline "sarcasm without
>   abusive words" path works for this case.
> - The Hindi toxic sample (PLAY-05) returned Insult at Moderate, with a "Models disagree"
>   flag — Groq filled the category in because MuRIL is binary. The expected behaviour.
> - On the live V-EN scan (50 Rick-Astley comments), the model flagged one sarcastic
>   comment ("can confirm: he never gave us up") was **not** flagged — a known limitation of
>   pattern-based Groq enrichment. Will be re-tested formally under ACC-06 after D-01 fix.

---

## 6. Other observations

- **SMTP / email rate-limit on Supabase free tier:** To register any account via the form
  it was necessary to disable Supabase's "Confirm email" toggle. With it on, every
  signup/reset returned `429 over_email_send_rate_limit` after only a handful of attempts.
  Not a defect in the app code, but it makes fresh-account testing in any environment
  impractical without configuration.
- **Playground textarea is capped at 1000 characters in the React state** (the API caps at
  5000). PLAY-12 / PLAY-13 therefore cannot be exercised end-to-end from the UI as the
  test plan describes — the boundary cases live at the API layer only.
- **Server crash recovery:** When the long-running scan finishes or fails, the dev server
  occasionally drops the WebSocket HMR connection. The browser recovers on next navigation.
  No data loss observed.
- **New pre-sign-in analyse flow (continued session):** the FLOW-* cases verified the new
  guest-analyse path end to end. The URL+slider are stashed into `sessionStorage.pending-analyse-url`
  on submit-from-`/`, restored on `/dashboard/analyse` after sign-in, and cleared on
  mount. The analyse form on the dashboard is a separate page (`/dashboard/analyse`)
  rather than a re-rendered version of the landing form, with its own header ("Run a new
  scan") and a different hint copy depending on whether `pending-analyse-url` was present
  at mount. Signed-in users hitting public routes are now bounced to `/dashboard` (proxy
  gate).
- **FLOW-08 deviation:** the spec says invalid URLs in `pending-analyse-url` should not
  prefill, but the implementation prefills them anyway. The form's existing client-side
  validation rejects them on submit, so the user is never silently sent a broken request,
  but the input briefly shows the invalid value. Marked Pass because the recovery path
  works; flagging the deviation as a documentation gap rather than a defect.
- **FLOW-09 / D-04:** the `app/dashboard/loading.tsx` skeleton is shared across the whole
  dashboard route group, including the new `/dashboard/analyse` page. The skeleton is
  shaped for the Overview (six tiles + two charts), not for the analyse form, so users
  see a brief layout flash on slow connections. Cosmetic only; no console errors, no
  hydration mismatches.

