import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Reads the session from cookies and refreshes it when needed, writing the
 * rotated tokens back. Server Components cannot set cookies, so the write is
 * allowed to fail there — `proxy.ts` refreshes the session on every request,
 * which is what actually keeps it alive.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to swallow: the proxy already refreshed the session.
          }
        },
      },
    }
  );
}

/**
 * Service-role client. Bypasses row-level security entirely.
 *
 * Only for work that is legitimately not on behalf of one user: admin queries
 * that span every account, the seed script, and background jobs. Never expose
 * a handle on this to the browser, and never build one from user input — if a
 * request can reach it, check `requireAdmin()` first.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set — admin operations are unavailable.'
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
