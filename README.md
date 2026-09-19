# ToxiScan

Paste a YouTube link and read the shape of its comment section: what was said,
in which language, how harmful it is, and how confident the models are about
any of that.

Built as a final-year project. The parts that make it more than a wrapper
around one model are the multilingual routing, the sarcasm and context passes,
and the evaluation surface that measures the whole thing against human
judgement.

---

## What it does

- **Analyses a video's comments**, replies included, up to 200 per scan.
- **Works in English, Hindi and Marathi**, plus code-mixed "Hinglish", and
  falls back sensibly on Spanish, French, Portuguese, Italian, Turkish and
  Russian.
- **Nine categories, five severity levels** — not a toxic/not-toxic flag.
- **Catches sarcasm and context**: "Wow, you're really a genius 🙄" contains no
  abusive word, and a reply can be harmless alone and hostile as a response.
- **Measures itself.** Users flag wrong predictions, an admin reviews them, and
  the accepted ones become ground truth for precision, recall, F1 and a
  confusion matrix per model per language.

---

## Architecture

One Next.js application. The Express backend that used to live in `backend/`
has been migrated into Route Handlers; it is kept in the repository for
reference but is no longer run.

```
frontend-next/
├── app/
│   ├── (auth)/              login, register, password reset
│   ├── admin/               admin console — separate shell, seeded access
│   ├── api/
│   │   ├── analyze/         video, text, batch
│   │   ├── scans/           history, detail, save
│   │   ├── reports/         generate and download
│   │   ├── feedback/        human-in-the-loop
│   │   └── admin/           privileged operations
│   ├── dashboard/           the signed-in user area
│   └── …                    landing, about, playground
├── lib/
│   ├── analysis/
│   │   ├── language.ts      detection and classifier routing
│   │   ├── classifiers/     MuRIL (Indic), XLM-R (European)
│   │   ├── groq.ts          sarcasm, context, severity
│   │   ├── severity.ts      banding and override rules
│   │   ├── taxonomy.ts      categories, legacy five-label view
│   │   └── pipeline.ts      detect → classify → enrich → merge
│   ├── youtube/             Data API v3
│   ├── db/                  Drizzle schema, migrations, queries
│   ├── auth/                session guards
│   ├── metrics/             precision, recall, F1, ROC-AUC
│   └── reports/             CSV, JSON, print-ready HTML
├── proxy.ts                 session refresh and route guards
└── scripts/                 migrate, seed
```

### Why two classifiers

There is no single free model that covers the required languages well.

| Model | Languages | Labels |
|---|---|---|
| `unitary/multilingual-toxic-xlm-roberta` | en, fr, es, it, pt, tr, ru | 7 categories |
| `Hate-speech-CNERG/indic-abusive-allInOne-MuRIL` | hi, mr, bn, ta, te, ur, en, code-mixed | binary |

The XLM-R model card is explicit that it should only be tested on its seven
languages — it has never seen Hindi or Marathi. MuRIL has, but can only say
"abusive or not". So each comment is routed by detected language, and Groq
supplies what the chosen model cannot express: the category for Indic text,
and sarcasm, context and severity for everything.

That the two sometimes disagree is recorded rather than hidden —
`comment_analyses.models_disagree` — and the disagreement rate is reported per
language in the admin console.

---

## Setup

Short version below. **[SETUP.md](SETUP.md) has the step-by-step**, including
where to click in each console and what to do when something fails.

### 1. Accounts and keys

All free, no card required.

| Service | Where | Used for |
|---|---|---|
| Supabase | [supabase.com](https://supabase.com) → new project | auth, database, report storage |
| Hugging Face | [settings/tokens](https://huggingface.co/settings/tokens) | both classifiers |
| Groq | [console.groq.com/keys](https://console.groq.com/keys) | sarcasm, context, severity |
| YouTube Data API v3 | [Google Cloud Console](https://console.cloud.google.com/) | fetching comments |

### 2. Configure

```bash
cd frontend-next
cp .env.example .env.local
```

Fill in `.env.local`. Every variable is documented in the example file. For
`DATABASE_URL` use Supabase's **transaction pooler** string (port 6543), not
the direct connection.

### 3. Install, migrate, seed

```bash
npm install
npm run db:migrate    # schema, RLS policies, auth trigger, storage bucket
npm run db:seed       # creates the admin account from ADMIN_SEED_*
```

### 4. Check and run

```bash
npm run check   # verifies keys, schema, RLS, storage, and both classifiers
npm run dev
```

`npm run check` is worth running first, and worth running again whenever
something stops working — it reports what is wrong and what to do about it.

- App — http://localhost:3000
- Admin — http://localhost:3000/admin/login

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | development server |
| `npm run check` | verify configuration, schema and external services |
| `npm run build` | production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:generate` | generate a migration from schema changes |
| `npm run db:migrate` | apply pending migrations |
| `npm run db:seed` | create or repair the admin account |
| `npm run db:studio` | browse the database |

---

## Roles

**User** — analyse videos, keep a history, save analyses with notes and tags,
generate reports, and flag predictions that look wrong.

**Admin** — everything under `/admin`, on its own shell with its own login.
There is no admin registration: accounts are created by `npm run db:seed`.
Admins see platform totals, every user and scan, the feedback review queue, the
evaluation metrics, model routing statistics, and an audit log of every
privileged action.

---

## Limitations

Stated plainly, because a tool like this is only useful if its limits are.

- Every score is a model's confidence, not a fact.
- Up to 200 comments per scan. On a busy video that is a sample, not a census.
- Hindi and Marathi detection leans on a binary classifier plus a language
  model. It works, but it is not as well-grounded as the English path.
- Sarcasm detection is genuinely hard and will miss cases in both directions.
- Only public videos with comments enabled can be analysed.
- ToxiScan does not moderate, report or act on YouTube. It reads.
