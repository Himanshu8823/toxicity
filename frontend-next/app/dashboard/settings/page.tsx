import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guards';
import { ProfileForm } from '@/components/dashboard/ProfileForm';
import { PasswordForm } from '@/components/dashboard/PasswordForm';
import { formatDate } from '@/components/dashboard/format';

export const metadata: Metadata = {
  title: 'Settings — ToxiScan',
};

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hairline-card p-5 sm:p-6">
      <h2 className="title-md text-ink">{title}</h2>
      <p className="caption mt-1 max-w-[60ch] text-muted">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <>
      <header className="mb-8">
        <p className="caption-uppercase text-muted">Settings</p>
        <h1 className="display-lg mt-2 text-ink">Your account</h1>
        <p className="body-md mt-3 max-w-[60ch] text-body">
          Member since{' '}
          <time dateTime={new Date(user.profile.createdAt).toISOString()}>
            {formatDate(user.profile.createdAt)}
          </time>
          .
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <Panel
          title="Profile"
          description="How you are addressed, and which language the playground assumes when detection is uncertain."
        >
          <ProfileForm
            email={user.email}
            initialFullName={user.profile.fullName ?? ''}
            initialLanguage={user.profile.preferredLanguage}
          />
        </Panel>

        <Panel
          title="Password"
          description="Changing this signs you out of nothing — existing sessions stay valid until they expire."
        >
          <PasswordForm />
        </Panel>

        <Panel
          title="Your email"
          description="Email is managed by the sign-in provider, not here. Changing it is a verification flow rather than a text field, so it is not editable on this page."
        >
          <p className="body-md text-ink">{user.email}</p>
        </Panel>
      </div>
    </>
  );
}
