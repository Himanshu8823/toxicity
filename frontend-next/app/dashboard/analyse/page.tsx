import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/guards';
import { DashboardAnalyse } from './AnalyseClient';

export const metadata: Metadata = {
  title: 'Analyse — ToxiScan',
};

export default async function DashboardAnalysePage() {
  await requireUser();
  return <DashboardAnalyse />;
}
