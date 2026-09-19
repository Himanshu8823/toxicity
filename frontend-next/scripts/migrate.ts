/**
 * Applies every migration in `lib/db/migrations`, in filename order.
 *
 *   npm run db:migrate
 *
 * Drizzle's own migrator only understands the SQL it generated, and this
 * project also has hand-written migrations for the things Drizzle cannot
 * express — the auth trigger, row-level security, storage buckets. This runner
 * applies both kinds and records what it has done in `__migrations`.
 *
 * Each file runs inside a transaction: a migration that fails partway leaves
 * the database exactly as it was.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const MIGRATIONS_DIR = join(process.cwd(), 'lib', 'db', 'migrations');

async function migrate() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error(
      '\n  ✗ DATABASE_URL is not set. Copy .env.example to .env.local first.\n'
    );
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false, max: 1 });

  try {
    await sql`
      create table if not exists public.__migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `;

    const applied = await sql<{ name: string }[]>`
      select name from public.__migrations
    `;
    const done = new Set(applied.map((r) => r.name));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('\n  No migration files found.\n');
      return;
    }

    let ran = 0;

    for (const file of files) {
      if (done.has(file)) {
        console.log(`  · ${file} (already applied)`);
        continue;
      }

      const contents = await readFile(join(MIGRATIONS_DIR, file), 'utf8');

      process.stdout.write(`  → ${file} … `);

      await sql.begin(async (tx) => {
        // `unsafe` because the file is trusted SQL from this repo, not input.
        await tx.unsafe(contents);
        await tx`insert into public.__migrations (name) values (${file})`;
      });

      console.log('done');
      ran++;
    }

    console.log(
      ran === 0
        ? '\n  ✓ Database already up to date.\n'
        : `\n  ✓ Applied ${ran} migration(s).\n`
    );
  } finally {
    await sql.end();
  }
}

migrate().catch((error) => {
  console.error('\n  ✗ Migration failed:', error);
  process.exit(1);
});
