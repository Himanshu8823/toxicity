'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Nav } from './Nav';

/**
 * The public nav for pages that are themselves Client Components.
 *
 * `SiteNav` is the better route — it resolves the session on the server, so
 * the correct call to action is in the first paint. But `app/page.tsx`,
 * `app/about/page.tsx` and `app/results/page.tsx` are Client Components (they
 * drive scroll-linked 3D and motion), and an async Server Component cannot be
 * rendered inside one. This reads the session in the browser instead.
 *
 * It renders the signed-out nav until the session resolves. That is a
 * deliberate choice over rendering nothing: a nav that appears late is worse
 * than one whose button label settles a moment after paint.
 */
export function ClientNav() {
  const [state, setState] = useState<{
    signedIn: boolean;
    isAdmin: boolean;
  }>({ signedIn: false, isAdmin: false });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function resolve(userId: string | undefined) {
      if (!userId) {
        if (!cancelled) setState({ signedIn: false, isAdmin: false });
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!cancelled) {
        setState({ signedIn: true, isAdmin: data?.role === 'admin' });
      }
    }

    supabase.auth.getUser().then(({ data }) => resolve(data.user?.id));

    // Keeps the nav honest when the user signs out in another tab.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => resolve(session?.user?.id)
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (!state.signedIn) {
    return <Nav ctaHref="/login" ctaLabel="Sign in" />;
  }

  return (
    <Nav
      links={[
        { href: '/#analyse-form', label: 'Analyse' },
        { href: '/playground', label: 'Playground' },
        { href: '/about', label: 'About' },
        ...(state.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
      ]}
      ctaHref="/dashboard"
      ctaLabel="Dashboard"
    />
  );
}

export default ClientNav;
