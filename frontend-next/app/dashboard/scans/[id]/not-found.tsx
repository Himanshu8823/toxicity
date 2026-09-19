import { EmptyState } from '@/components/dashboard/EmptyState';

/**
 * Where a scan id that does not resolve lands.
 *
 * `getScanDetail` is scoped to the signed-in user, so "deleted", "mistyped"
 * and "belongs to somebody else" all arrive here as the same 404 — and that is
 * deliberate: distinguishing them would confirm to a stranger that a given
 * uuid exists on another account. The copy therefore names every possibility
 * without claiming which one happened, rather than guessing and being wrong.
 */
export default function ScanNotFound() {
  return (
    <EmptyState
      title="That scan is not here"
      description="It may have been deleted, the link may be mistyped, or it may belong to a different account. Your own scans are all in your history."
      action={{ href: '/dashboard/history', label: 'Back to history' }}
      secondaryAction={{ href: '/#analyse-form', label: 'Analyse a video' }}
    >
      <p className="caption text-muted">
        Scans are private to the account that ran them — nothing you analyse is
        reachable from anyone else&rsquo;s link.
      </p>
    </EmptyState>
  );
}
