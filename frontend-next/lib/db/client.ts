import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * The Drizzle client, server-only.
 *
 * Supabase pools connections through PgBouncer in transaction mode, which does
 * not support prepared statements — hence `prepare: false`. The connection
 * count is kept low because serverless invocations each hold their own pool.
 *
 * In development Next.js reloads modules on every edit, which would otherwise
 * open a new pool each time until Postgres refuses more connections, so the
 * client is cached on `globalThis`.
 */

declare global {
  // eslint-disable-next-line no-var
  var __toxiscanDb: ReturnType<typeof createClient> | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and fill in ' +
        'your Supabase connection string (Project Settings → Database → ' +
        'Connection string → Transaction pooler).'
    );
  }

  const sql = postgres(url, {
    prepare: false,
    /**
     * Production runs serverless, where each invocation holds its own pool and
     * a single connection is the right shape. Development is one long-lived
     * process serving a whole browser session: a dashboard page fans out into
     * six or seven queries at once, and with a small pool the rest queue
     * behind them. At ~50ms per round trip to a remote Supabase region, that
     * queueing is what turns a fast page into a slow one.
     */
    max: process.env.NODE_ENV === 'production' ? 1 : 20,
    idle_timeout: 20,
    connect_timeout: 15,
  });

  return drizzle(sql, { schema, casing: 'snake_case' });
}

export const db = globalThis.__toxiscanDb ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__toxiscanDb = db;
}

export { schema };
export type Db = typeof db;
