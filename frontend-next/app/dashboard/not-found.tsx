import { EmptyState } from '@/components/dashboard/EmptyState';

/**
 * The catch-all for unmatched dashboard URLs.
 *
 * It sits inside the dashboard layout, so the person keeps their nav and can
 * leave by any route they were already heading for — which is more use than a
 * stock 404 that strands them on a bare page with only the back button.
 */
export default function DashboardNotFound() {
  return (
    <EmptyState
      title="There is nothing at that address"
      description="This page does not exist in your dashboard. Your scans, the ones you saved and the reports you generated are all still where you left them."
      action={{ href: '/dashboard', label: 'Go to overview' }}
      secondaryAction={{ href: '/dashboard/history', label: 'Browse your scans' }}
    />
  );
}
