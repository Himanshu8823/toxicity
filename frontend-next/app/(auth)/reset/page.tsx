import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Choose a new password — ToxiScan',
  description: 'Set a new password for your ToxiScan account.',
  robots: { index: false, follow: false },
};

export default function ResetPage() {
  return <ResetPasswordForm />;
}
