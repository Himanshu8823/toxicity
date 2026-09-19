# Setting up ToxiScan

Step by step, from a fresh clone to a running app. Everything used here is on
a free tier and none of it asks for a card.

---

## 1. Accounts and keys

### Supabase — auth, database, report storage

1. [supabase.com](https://supabase.com) → **New project**
2. Choose a region near you and set a database password (save it — you need it
   in step 2)
3. Wait for the project to finish provisioning, then collect:
   - **Project Settings → API** → *Project URL* and *anon public* key
   - **Project Settings → API** → *service_role* key (under "Project API keys",
     you will have to reveal it)
   - **Project Settings → Database → Connection string → Transaction pooler**
     — the one on **port 6543**, not the direct connection

> Use the pooler string. Serverless functions open a connection per
> invocation and will exhaust the direct connection limit quickly.

### Hugging Face — the two classifiers

1. [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. **New token** → *Read* access is enough
3. Copy it

### Groq — sarcasm, context and severity

1. [console.groq.com/keys](https://console.groq.com/keys)
2. **Create API Key**
3. Copy it

Free tier is 30 requests/minute and 14,400/day, which is comfortably more than
this app needs. Without this key the app still runs — you lose sarcasm
detection, context awareness, and the category for Hindi/Marathi text.

### YouTube Data API v3 — fetching comments

1. [Google Cloud Console](https://console.cloud.google.com/) → **New project**
2. **APIs & Services → Library** → search "YouTube Data API v3" → **Enable**
3. **APIs & Services → Credentials → Create credentials → API key**
4. Copy it

Free quota is 10,000 units/day. A page of comments costs 1 unit, so a 200-comment
scan costs about 3.

---

## 2. Configure

```bash
cd frontend-next
cp .env.example .env.local
```

Open `.env.local` and fill in everything. Each variable is documented in the
file. The admin block at the bottom:

```
ADMIN_SEED_EMAIL=you@example.com
ADMIN_SEED_PASSWORD=pick-something-at-least-12-characters
ADMIN_SEED_NAME=Your Name
```

There is no admin registration page. This is how the admin account is created.

---

## 3. Install and set up the database

```bash
npm install
npm run db:migrate
npm run db:seed
```

`db:migrate` applies two migrations in order:

- **`0000_init.sql`** — the ten tables, their enums, indexes and foreign keys
- **`0001_auth_and_rls.sql`** — the link to Supabase Auth, the trigger that
  creates a profile on sign-up, row-level security on every table, and the
  private `reports` storage bucket

It records what it has applied in a `__migrations` table, so running it again
is safe and does nothing.

`db:seed` creates the admin account from your `ADMIN_SEED_*` values. Running it
again resets that account's password, which is how you recover a forgotten one.

---

## 4. Check everything

```bash
npm run check
```

This verifies, one line each: every required variable is present, the database
is reachable, all ten tables exist, row-level security is on, the reports
bucket exists, an admin account exists, the YouTube key is accepted, both
classifiers respond, and the Groq key works.

Anything wrong is reported with what to do about it. Run this first whenever
something misbehaves.

---

## 5. Run

```bash
npm run dev
```

- **App** — http://localhost:3000
- **Admin** — http://localhost:3000/admin/login

Register a normal account through `/register` to see the user side; sign in at
`/admin/login` with your seeded credentials to see the console.

---

## Troubleshooting

**`DATABASE_URL is not set`**
`.env.local` is missing or in the wrong directory. It belongs in
`frontend-next/`, not the repository root.

**Database connection times out**
You are probably using the direct connection string. Switch to the transaction
pooler (port 6543) from Project Settings → Database.

**Admin login says "does not have administrator access"**
The seed did not run, or ran against a different database. Run `npm run check`
— it reports how many admin accounts exist.

**First analysis is very slow, then fine**
Hugging Face loads a model onto a worker on first use. The client waits this
out and retries; subsequent calls are fast.

**`quotaExceeded` from YouTube**
The 10,000-unit daily quota is used up. It resets at midnight Pacific time.

**No sarcasm flags on any comment**
`GROQ_API_KEY` is missing or rejected. `npm run check` will say which.

**Everything works but Hindi comments look mis-scored**
Worth knowing rather than fixing: Hindi and Marathi go through a binary
classifier plus a language model, which is a less well-grounded path than the
English one. The admin metrics page reports accuracy per language, so you can
see exactly how much less.
