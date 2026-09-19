import 'server-only';

import { headers } from 'next/headers';
import { db } from '@/lib/db/client';
import { auditLog } from '@/lib/db/schema';

/**
 * The audit trail for privileged actions.
 *
 * Every admin mutation goes through here. The point is not compliance theatre:
 * an admin can change another account's role and suspend people, and a change
 * nobody can trace back to an actor is indistinguishable from a compromise.
 *
 * The actor id is always the session user, never anything the client sent.
 */

/**
 * Action names, kept as a closed union so a typo cannot quietly create a
 * category of events that no filter on the audit page will ever show.
 */
export type AuditAction =
  | 'user.role_changed'
  | 'user.suspended'
  | 'user.unsuspended'
  | 'feedback.accepted'
  | 'feedback.rejected'
  | 'metrics.recomputed';

export interface RecordAuditInput {
  /** The signed-in admin. Derived from the session by the caller — never from the body. */
  actorId: string;
  action: AuditAction;
  /** The table or concept acted on, e.g. `profile`, `feedback`. */
  entity: string;
  entityId?: string | null;
  /** Before/after values, filter state, whatever makes the row readable later. */
  metadata?: Record<string, unknown>;
  /** Pass a value to skip the header lookup; otherwise it is read from the request. */
  ip?: string | null;
}

/**
 * Best-effort client IP from the proxy headers.
 *
 * These headers are client-controllable in principle, so this is evidence
 * rather than proof — which is fine, because authorisation never depends on
 * it. It exists to make a log line reconstructable.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();

  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    // Left-most entry is the original client; the rest are proxies.
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return h.get('x-real-ip') ?? h.get('cf-connecting-ip') ?? null;
}

/**
 * Writes one audit row.
 *
 * Never throws. A failed audit write must not roll back the action the admin
 * took — they would retry, and the retry would be just as unlogged. The error
 * goes to the server log where it can be noticed.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  try {
    const ip = input.ip !== undefined ? input.ip : await clientIp();

    await db.insert(auditLog).values({
      actorId: input.actorId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? null,
      ip,
    });
  } catch (error) {
    console.error('[audit] failed to record admin action', input.action, error);
  }
}
