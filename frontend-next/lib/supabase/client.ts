'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components.
 *
 * Only ever sees the anon key, so every query it makes is subject to row-level
 * security — a browser client can read exactly what the signed-in user is
 * allowed to read and nothing more.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
