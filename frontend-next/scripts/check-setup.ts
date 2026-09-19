/**
 * Checks that everything the app needs is configured and reachable.
 *
 *   npm run check
 *
 * Run this before anything else when something is not working. Each check
 * reports what is wrong and what to do about it, so a missing key is a
 * one-line fix rather than a stack trace three layers deep in a model call.
 */

import { config } from 'dotenv';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

type Status = 'ok' | 'warn' | 'fail';

interface CheckResult {
  name: string;
  status: Status;
  detail: string;
  /** What the user should do, when there is something to do. */
  fix?: string;
}

const results: CheckResult[] = [];

function record(result: CheckResult) {
  results.push(result);

  const mark = result.status === 'ok' ? '✓' : result.status === 'warn' ? '!' : '✗';
  console.log(`  ${mark} ${result.name.padEnd(28)} ${result.detail}`);
  if (result.fix) console.log(`      → ${result.fix}`);
}

// ─── Environment ─────────────────────────────────────────────────────────────

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'YOUTUBE_API_KEY',
  'HF_TOKEN',
] as const;

/** The app runs without these, with reduced capability. */
const OPTIONAL = ['GROQ_API_KEY', 'ADMIN_SEED_EMAIL', 'ADMIN_SEED_PASSWORD'] as const;

function checkEnv(): boolean {
  const missing = REQUIRED.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    record({
      name: 'Environment',
      status: 'fail',
      detail: `${missing.length} required variable(s) missing: ${missing.join(', ')}`,
      fix: 'Copy .env.example to .env.local and fill them in.',
    });
    return false;
  }

  const missingOptional = OPTIONAL.filter((key) => !process.env[key]);

  record({
    name: 'Environment',
    status: missingOptional.length > 0 ? 'warn' : 'ok',
    detail:
      missingOptional.length > 0
        ? `all required present; optional missing: ${missingOptional.join(', ')}`
        : 'all variables present',
    fix: missingOptional.includes('GROQ_API_KEY')
      ? 'Without GROQ_API_KEY there is no sarcasm, context or severity refinement.'
      : undefined,
  });

  return true;
}

// ─── Database ────────────────────────────────────────────────────────────────

const EXPECTED_TABLES = [
  'profiles',
  'scans',
  'comments',
  'comment_analyses',
  'saved_analyses',
  'reports',
  'feedback',
  'model_metrics',
  'usage_events',
  'audit_log',
];

async function checkDatabase(): Promise<void> {
  const sql = postgres(process.env.DATABASE_URL!, {
    prepare: false,
    max: 1,
    connect_timeout: 10,
  });

  try {
    const tables = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public'
    `;

    const present = new Set(tables.map((t) => t.table_name));
    const missing = EXPECTED_TABLES.filter((t) => !present.has(t));

    if (missing.length > 0) {
      record({
        name: 'Database schema',
        status: 'fail',
        detail: `${missing.length} table(s) missing: ${missing.join(', ')}`,
        fix: 'Run: npm run db:migrate',
      });
      return;
    }

    record({
      name: 'Database schema',
      status: 'ok',
      detail: `all ${EXPECTED_TABLES.length} tables present`,
    });

    // Row-level security is what keeps one user's scans out of another's
    // dashboard, so a table without it is a real problem, not a nit.
    const rls = await sql<{ tablename: string; rowsecurity: boolean }[]>`
      select tablename, rowsecurity from pg_tables
      where schemaname = 'public' and tablename = any(${EXPECTED_TABLES})
    `;

    const unprotected = rls.filter((t) => !t.rowsecurity).map((t) => t.tablename);

    record({
      name: 'Row-level security',
      status: unprotected.length > 0 ? 'fail' : 'ok',
      detail:
        unprotected.length > 0
          ? `not enabled on: ${unprotected.join(', ')}`
          : 'enabled on every table',
      fix: unprotected.length > 0 ? 'Run: npm run db:migrate' : undefined,
    });

    const [{ count: adminCount }] = await sql<[{ count: string }]>`
      select count(*)::text as count from public.profiles where role = 'admin'
    `;

    record({
      name: 'Admin account',
      status: Number(adminCount) > 0 ? 'ok' : 'warn',
      detail:
        Number(adminCount) > 0
          ? `${adminCount} admin account(s)`
          : 'no admin account exists',
      fix: Number(adminCount) === 0 ? 'Run: npm run db:seed' : undefined,
    });
  } catch (error) {
    record({
      name: 'Database',
      status: 'fail',
      detail: error instanceof Error ? error.message : 'connection failed',
      fix: 'Check DATABASE_URL. Use the transaction pooler string (port 6543).',
    });
  } finally {
    await sql.end();
  }
}

// ─── Supabase storage ────────────────────────────────────────────────────────

async function checkStorage(): Promise<void> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw new Error(error.message);

    const hasReports = data.some((b) => b.name === 'reports');

    record({
      name: 'Report storage',
      status: hasReports ? 'ok' : 'fail',
      detail: hasReports ? "'reports' bucket present" : "'reports' bucket missing",
      fix: hasReports ? undefined : 'Run: npm run db:migrate',
    });
  } catch (error) {
    record({
      name: 'Report storage',
      status: 'fail',
      detail: error instanceof Error ? error.message : 'could not reach Supabase',
    });
  }
}

// ─── External services ───────────────────────────────────────────────────────

async function checkYouTube(): Promise<void> {
  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet');
    // A well-known permanent video, so a 404 means the key is the problem.
    url.searchParams.set('id', 'dQw4w9WgXcQ');
    url.searchParams.set('key', process.env.YOUTUBE_API_KEY!);

    const response = await fetch(url.toString());

    if (response.ok) {
      record({ name: 'YouTube Data API', status: 'ok', detail: 'key accepted' });
      return;
    }

    const body = await response.json().catch(() => null);
    const reason = body?.error?.errors?.[0]?.reason ?? response.status;

    record({
      name: 'YouTube Data API',
      status: 'fail',
      detail: `rejected (${reason})`,
      fix:
        reason === 'quotaExceeded'
          ? 'Daily quota used up — it resets at midnight Pacific.'
          : 'Check YOUTUBE_API_KEY and that YouTube Data API v3 is enabled for the project.',
    });
  } catch (error) {
    record({
      name: 'YouTube Data API',
      status: 'fail',
      detail: error instanceof Error ? error.message : 'unreachable',
    });
  }
}

const CLASSIFIERS = [
  {
    label: 'Classifier (Indic)',
    model: 'Hate-speech-CNERG/indic-abusive-allInOne-MuRIL',
    probe: 'नमस्ते, आप कैसे हैं',
  },
  {
    label: 'Classifier (European)',
    model: 'unitary/multilingual-toxic-xlm-roberta',
    probe: 'hello, how are you today',
  },
];

async function checkClassifiers(): Promise<void> {
  for (const { label, model, probe } of CLASSIFIERS) {
    try {
      const response = await fetch(
        `https://router.huggingface.co/hf-inference/models/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: probe,
            options: { wait_for_model: true },
          }),
        }
      );

      if (response.ok) {
        record({ name: label, status: 'ok', detail: 'model responded' });
        continue;
      }

      // 503 means the model is loading onto a worker, which resolves itself.
      record({
        name: label,
        status: response.status === 503 ? 'warn' : 'fail',
        detail:
          response.status === 503
            ? 'model is warming up — first real request may be slow'
            : `HTTP ${response.status}`,
        fix: response.status === 401 ? 'Check HF_TOKEN.' : undefined,
      });
    } catch (error) {
      record({
        name: label,
        status: 'fail',
        detail: error instanceof Error ? error.message : 'unreachable',
      });
    }
  }
}

async function checkGroq(): Promise<void> {
  if (!process.env.GROQ_API_KEY) {
    record({
      name: 'Groq enrichment',
      status: 'warn',
      detail: 'not configured',
      fix: 'Without it: no sarcasm detection, no context awareness, coarser severity.',
    });
    return;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    });

    record({
      name: 'Groq enrichment',
      status: response.ok ? 'ok' : 'fail',
      detail: response.ok ? 'key accepted' : `HTTP ${response.status}`,
      fix: response.ok ? undefined : 'Check GROQ_API_KEY at console.groq.com/keys.',
    });
  } catch (error) {
    record({
      name: 'Groq enrichment',
      status: 'fail',
      detail: error instanceof Error ? error.message : 'unreachable',
    });
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n  ToxiScan setup check\n');

  if (!checkEnv()) {
    console.log('\n  Fix the environment first — the rest cannot be checked.\n');
    process.exit(1);
  }

  await checkDatabase();
  await checkStorage();
  await checkYouTube();
  await checkClassifiers();
  await checkGroq();

  const failures = results.filter((r) => r.status === 'fail').length;
  const warnings = results.filter((r) => r.status === 'warn').length;

  console.log('');

  if (failures > 0) {
    console.log(`  ${failures} check(s) failed, ${warnings} warning(s).\n`);
    process.exit(1);
  }

  console.log(
    warnings > 0
      ? `  Ready, with ${warnings} warning(s).\n`
      : '  Everything is configured.\n'
  );
}

main().catch((error) => {
  console.error('\n  Setup check crashed:', error);
  process.exit(1);
});
