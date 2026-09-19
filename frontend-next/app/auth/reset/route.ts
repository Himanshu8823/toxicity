import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Landing point for password-recovery emails.
 *
 * `ForgotPasswordForm` points Supabase here rather than straight at `/reset`
 * because a recovery link carries a one-time `code` that has to be exchanged
 * for a session before any password can be changed. Once that is done we hand
 * off to the form at `/reset`, which finds a live session waiting.
 *
 * Links from older Supabase flows arrive with tokens in the URL fragment
 * instead, which never reaches the server — those fall through to `/reset` and
 * the browser client picks them up itself.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
    }
  }

  return NextResponse.redirect(`${origin}/reset`);
}
