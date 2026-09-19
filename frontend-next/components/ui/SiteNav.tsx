import { getSessionUser } from '@/lib/auth/guards';
import { Nav } from './Nav';

/**
 * The public site's nav, resolved against the session.
 *
 * `Nav` is a Client Component and stays one — it owns the scroll state and the
 * animated active underline. This wrapper is the Server Component that reads
 * the session and hands it the right call to action, so a signed-in visitor
 * lands on their dashboard rather than being asked to sign in again.
 */
export async function SiteNav() {
  const user = await getSessionUser();

  if (!user) {
    return <Nav ctaHref="/login" ctaLabel="Sign in" />;
  }

  const isAdmin = user.profile.role === 'admin';

  return (
    <Nav
      links={[
        { href: '/#analyse-form', label: 'Analyse' },
        { href: '/playground', label: 'Playground' },
        { href: '/about', label: 'About' },
        ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
      ]}
      ctaHref="/dashboard"
      ctaLabel="Dashboard"
    />
  );
}

export default SiteNav;
