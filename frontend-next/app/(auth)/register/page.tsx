import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create an account — ToxiScan',
  description: 'Create a ToxiScan account to save scans and export reports.',
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
