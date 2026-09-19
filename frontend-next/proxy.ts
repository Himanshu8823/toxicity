import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Runs before every matched request.
 *
 * Two jobs:
 *  1. Refresh the Supabase session and write rotated tokens onto the response,
 *     so Server Components always read a valid session.
 *  2. Gate the guarded route trees, redirecting before any page renders.
 *
 * Note this is `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the
 * convention. The behaviour is identical.
 */

/** Signed-in users only. */
const USER_PROTECTED = ['/dashboard'];

/** Signed-in admins only. `/admin/login` is deliberately not in here. */
const ADMIN_PROTECTED = ['/admin'];

/** Pointless to visit while already signed in. */
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

/**
 * Public marketing routes. Signed-in users land here only by following an
 * external link; their job lives inside `/dashboard`, so we bounce them
 * straight to it. The home page is intentionally included — the analyse form
 * there stashes the URL into `sessionStorage` and bounces through `/login`,
 * but a signed-in visitor who hits `/` directly is just wasting a render.
 */
const PUBLIC_ROUTES = ['/', '/about', '/playground', '/results'];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Must be getUser(), not getSession(): only getUser() revalidates the token
  // with Supabase. getSession() trusts the cookie, which a client can forge.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute =
    ADMIN_PROTECTED.some((p) => pathname.startsWith(p)) &&
    pathname !== '/admin/login';
  const isUserRoute = USER_PROTECTED.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname === '' ||
    pathname === '/';

  if (!user && (isUserRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = isAdminRoute ? '/admin/login' : '/login';
    // Remember where they were headed so login can return them there.
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute && pathname !== '/admin/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  /**
   * The role lives in our own `profiles` table rather than in the JWT, so it
   * costs a round trip to read — and this runs before every matched request.
   * Only the two paths that actually branch on the role pay for it: an admin
   * page, and the admin login (where an admin already signed in should be sent
   * straight through). Every other route skips the lookup entirely.
   */
  const needsRole = user && (isAdminRoute || pathname === '/admin/login');

  if (needsRole) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    if (isAdminRoute && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    if (pathname === '/admin/login' && isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /**
     * Everything except static assets and image files. Without this the proxy
     * would run on every CSS and JS chunk, costing a Supabase round trip per
     * asset and slowing every page down.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
