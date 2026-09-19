import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guards';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { avatarInitial } from '@/components/dashboard/format';

export const metadata: Metadata = {
  title: 'Dashboard — ToxiScan',
  description: 'Your scans, saved analyses and reports.',
};

/**
 * The signed-in shell.
 *
 * `requireUser()` runs here as well as on each page, not instead of it:
 * `proxy.ts` gates the route, but a layout is the only place that can supply
 * the user chip, and a page reached some other way still needs its own check.
 *
 * The sidebar is fixed rather than a flex sibling so page content can scroll
 * the window — which keeps `position: sticky` filter bars working inside the
 * pages without every one of them managing its own scroll container.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const name = user.profile.fullName?.trim() || user.email;

  return (
    <div className="min-h-screen bg-canvas">
      <DashboardNav
        userName={name}
        userEmail={user.email}
        initial={avatarInitial(user.profile.fullName, user.email)}
      />

      <div className="lg:pl-[264px]">
        <main
          id="dashboard-content"
          className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
