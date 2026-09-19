/**
 * Seeds the admin account.
 *
 * Admins are not self-service — there is no admin registration page, by
 * design. This script is the only way one comes into existence.
 *
 *   npm run db:seed
 *
 * Idempotent: running it again promotes and updates the existing account
 * rather than failing or creating a duplicate.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_SEED_NAME ?? 'ToxiScan Administrator';

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

function checkEnv() {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!DATABASE_URL) missing.push('DATABASE_URL');
  if (!ADMIN_EMAIL) missing.push('ADMIN_SEED_EMAIL');
  if (!ADMIN_PASSWORD) missing.push('ADMIN_SEED_PASSWORD');

  if (missing.length > 0) {
    fail(
      `Missing environment variables:\n    ${missing.join('\n    ')}\n\n` +
        '  Copy .env.example to .env.local and fill these in.'
    );
  }

  if (ADMIN_PASSWORD!.length < 12) {
    fail('ADMIN_SEED_PASSWORD must be at least 12 characters.');
  }
}

async function seed() {
  checkEnv();

  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sql = postgres(DATABASE_URL!, { prepare: false, max: 1 });

  try {
    console.log('\n  Seeding ToxiScan…\n');

    // ── Find or create the auth user ──────────────────────────────────────
    const { data: list, error: listError } =
      await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (listError) fail(`Could not list users: ${listError.message}`);

    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === ADMIN_EMAIL!.toLowerCase()
    );

    let userId: string;

    if (existing) {
      userId = existing.id;
      console.log(`  • Admin auth user already exists (${ADMIN_EMAIL})`);

      // Reset the password so a forgotten one is recoverable by re-seeding.
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: ADMIN_PASSWORD!,
        email_confirm: true,
      });
      if (error) fail(`Could not update admin password: ${error.message}`);
      console.log('  • Password reset to ADMIN_SEED_PASSWORD');
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL!,
        password: ADMIN_PASSWORD!,
        // No inbox round trip for a seeded account.
        email_confirm: true,
        user_metadata: { full_name: ADMIN_NAME },
      });

      if (error || !data.user) {
        fail(`Could not create admin user: ${error?.message ?? 'unknown error'}`);
      }

      userId = data.user.id;
      console.log(`  • Created admin auth user (${ADMIN_EMAIL})`);
    }

    // ── Ensure the profile row exists and carries the admin role ──────────
    // The trigger creates it on sign-up, but this script may run against a
    // database where that has not fired, so insert defensively.
    await sql`
      insert into public.profiles (id, email, full_name, role)
      values (${userId}, ${ADMIN_EMAIL!}, ${ADMIN_NAME}, 'admin')
      on conflict (id) do update
        set role = 'admin',
            full_name = excluded.full_name,
            email = excluded.email,
            is_suspended = false
    `;

    console.log('  • Profile promoted to role=admin');

    const [{ count }] = await sql<[{ count: string }]>`
      select count(*)::text as count from public.profiles
    `;

    console.log(`\n  ✓ Done. ${count} profile(s) in the database.`);
    console.log(`\n    Sign in at /admin/login as ${ADMIN_EMAIL}\n`);
  } finally {
    await sql.end();
  }
}

seed().catch((error) => {
  console.error('\n  ✗ Seed failed:', error);
  process.exit(1);
});
