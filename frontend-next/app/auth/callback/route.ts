import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Landing point for Supabase email links — signup confirmations and any OAuth
 * provider we add later.
 *
 * Supabase sends a one-time `code`; trading it for a session here rather than
 * in the browser means the session cookies are set server-side by the SSR
 * client, so the very first render after the redirect already sees the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Only same-site paths: `next` arrives in a link we may not have composed.
  const requestedNext = searchParams.get('next');
  const next =
    requestedNext && requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
