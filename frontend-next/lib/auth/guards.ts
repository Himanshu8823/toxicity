import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/client';
import { profiles, type Profile } from '@/lib/db/schema';

/**
 * Session helpers for Server Components, Server Actions and Route Handlers.
 *
 * `proxy.ts` already redirects unauthenticated traffic away from the guarded
 * trees, but that is a routing concern and can be bypassed by a direct call to
 * a Route Handler. These are the real checks: every server entry point that
 * touches user data calls one of them.
 */

export interface SessionUser {
  id: string;
  email: string;
  profile: Profile;
}

/**
 * The signed-in user, or `null`. Does not redirect — use it where being logged
 * out is a legitimate state, such as a page that renders differently for
 * guests.
 *
 * Wrapped in React's `cache()`, which deduplicates per request: a layout, its
 * page and any Server Component below them all call a guard, and without this
 * each call would repeat a Supabase auth round trip plus a profile query. On a
 * remote database at ~50ms a hop that is most of a page's time spent
 * re-answering a question already answered.
 *
 * The cache lives for one request only, so a signed-out user never sees a
 * cached session and a role change takes effect on the next navigation.
 */
export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  // Auth succeeded but the profile row is missing — the trigger did not fire,
  // or the row was deleted. Treat as signed out rather than crashing.
  if (!profile) return null;

  return { id: user.id, email: user.email ?? profile.email, profile };
});

/**
 * The signed-in user, or a redirect to login. Use at the top of every guarded
 * page and in every Route Handler that reads or writes user-owned rows.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  if (user.profile.isSuspended) redirect('/login?error=suspended');

  return user;
}

/**
 * The signed-in admin, or a redirect to the admin login.
 *
 * Deliberately sends a non-admin to `/dashboard` rather than to the admin
 * login: they are signed in, just not privileged, and a login form would only
 * invite them to try again.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login');

  if (user.profile.role !== 'admin') redirect('/dashboard');
  if (user.profile.isSuspended) redirect('/admin/login?error=suspended');

  return user;
}

/**
 * Guard for Route Handlers, which must return a response rather than redirect.
 * Returns the user, or the 401/403 to send back.
 */
export async function requireUserApi(): Promise<
  { user: SessionUser; response?: never } | { user?: never; response: Response }
> {
  const user = await getSessionUser();

  if (!user) {
    return {
      response: Response.json(
        { error: 'You must be signed in to do that.' },
        { status: 401 }
      ),
    };
  }

  if (user.profile.isSuspended) {
    return {
      response: Response.json(
        { error: 'This account has been suspended.' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/** As `requireUserApi`, but also demands the admin role. */
export async function requireAdminApi(): Promise<
  { user: SessionUser; response?: never } | { user?: never; response: Response }
> {
  const result = await requireUserApi();
  if (result.response) return result;

  if (result.user.profile.role !== 'admin') {
    return {
      response: Response.json(
        { error: 'Administrator access is required.' },
        { status: 403 }
      ),
    };
  }

  return result;
}
