import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Sign out. POST only — a GET would let any `<img src="/auth/signout">` on a
 * third-party page log our users out.
 *
 * 303 rather than the default 307 so the browser follows with a GET; a 307
 * would replay the POST against `/` and 405.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Clears the cookies on the response via the SSR client's setAll, even if
  // the token was already revoked server-side.
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
