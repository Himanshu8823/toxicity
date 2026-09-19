import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { requireAdminApi } from '@/lib/auth/guards';
import { clientIp, recordAudit, type AuditAction } from '@/lib/admin/audit';
import { db } from '@/lib/db/client';
import { profiles, userRoleEnum } from '@/lib/db/schema';
import { countOtherAdmins, getUserById } from '@/lib/db/queries/admin';

/**
 * `PATCH /api/admin/users/[id]` — change someone's role or suspend them.
 *
 * The two most dangerous buttons in the product, so the ordering here matters:
 * guard, then validate, then refuse the two ways this can go irreversibly
 * wrong, and only then write. `/admin/users` is the only caller today, but the
 * route is reachable with curl by anyone who can sign in, so none of those
 * checks may live in the page.
 */

export const runtime = 'nodejs';

const paramsSchema = z.object({
  id: z.string().uuid('That is not a valid user id.'),
});

const bodySchema = z
  .object({
    role: z.enum(userRoleEnum.enumValues).optional(),
    isSuspended: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.isSuspended !== undefined,
    {
      message:
        'Nothing to change — send at least one of `role` or `isSuspended`.',
    }
  );

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;

  const { user: admin } = auth;

  // Next 16: params is a Promise. Validated as a uuid before it reaches the
  // query so a malformed id fails as a 400 rather than a Postgres cast error.
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return Response.json(
      { error: parsedParams.error.issues[0]?.message ?? 'Invalid user id.' },
      { status: 400 }
    );
  }

  const { id } = parsedParams.data;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? (error.issues[0]?.message ?? 'Invalid request.')
        : 'Invalid request body.';
    return Response.json({ error: message }, { status: 400 });
  }

  /**
   * Self-management is refused outright rather than only for the dangerous
   * direction. Demoting or suspending yourself takes effect on your next
   * request, which means the console you did it from is now closed to you and
   * there is no screen left that can undo it — only a database edit.
   */
  if (id === admin.id) {
    return Response.json(
      {
        error:
          'You cannot change your own role or suspend your own account. Ask another administrator to do it.',
      },
      { status: 400 }
    );
  }

  const target = await getUserById(id);
  if (!target) {
    return Response.json({ error: 'No such user.' }, { status: 404 });
  }

  const nextRole = body.role ?? target.role;
  const nextSuspended = body.isSuspended ?? target.isSuspended;

  /**
   * The last-admin check. `countOtherAdmins` counts active admins other than
   * the target, so if this change would stop the target counting as one and
   * nobody else does, the console has no way back in.
   */
  const wasEffectiveAdmin = target.role === 'admin' && !target.isSuspended;
  const staysEffectiveAdmin = nextRole === 'admin' && !nextSuspended;

  if (wasEffectiveAdmin && !staysEffectiveAdmin) {
    const remaining = await countOtherAdmins(id);
    if (remaining === 0) {
      return Response.json(
        {
          error:
            'This is the only active administrator. Promote another account first, then retry.',
        },
        { status: 409 }
      );
    }
  }

  // Nothing actually differs — say so rather than writing a no-op audit row
  // that reads like a change nobody can find.
  if (nextRole === target.role && nextSuspended === target.isSuspended) {
    return Response.json(
      {
        error: `That account is already ${target.role}${target.isSuspended ? ' and suspended' : ' and active'}.`,
      },
      { status: 409 }
    );
  }

  try {
    const [updated] = await db
      .update(profiles)
      .set({ role: nextRole, isSuspended: nextSuspended })
      .where(eq(profiles.id, id))
      .returning();

    /**
     * One row per distinct change: a request that both demotes and suspends is
     * two things that happened, and the audit page filters by action. The ip is
     * read once and passed in — `recordAudit` would otherwise look the headers
     * up again per call.
     */
    const ip = await clientIp();
    const actions: AuditAction[] = [];

    if (nextRole !== target.role) actions.push('user.role_changed');
    if (nextSuspended !== target.isSuspended) {
      actions.push(nextSuspended ? 'user.suspended' : 'user.unsuspended');
    }

    for (const action of actions) {
      await recordAudit({
        actorId: admin.id,
        action,
        entity: 'profile',
        entityId: id,
        metadata: {
          targetEmail: target.email,
          from: { role: target.role, isSuspended: target.isSuspended },
          to: { role: nextRole, isSuspended: nextSuspended },
        },
        ip,
      });
    }

    return Response.json({
      user: {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.role,
        isSuspended: updated.isSuspended,
        createdAt: updated.createdAt,
        lastSeenAt: updated.lastSeenAt,
      },
      message:
        nextRole !== target.role
          ? `${updated.email} is now ${nextRole === 'admin' ? 'an administrator' : 'a standard user'}.`
          : nextSuspended
            ? `${updated.email} is suspended and will be blocked on their next request.`
            : `${updated.email} can sign in again.`,
    });
  } catch (error) {
    console.error('[admin/users]', error);
    return Response.json(
      { error: 'Could not update that account.' },
      { status: 500 }
    );
  }
}
