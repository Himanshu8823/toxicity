'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth/guards';
import { db } from '@/lib/db/client';
import { profiles } from '@/lib/db/schema';
import { deleteScan } from '@/lib/db/queries/scans';
import {
  deleteSavedAnalysis,
  saveScan,
  unsaveScan,
  updateSavedAnalysis,
} from '@/lib/db/queries/saved';
import { deleteReport } from '@/lib/db/queries/reports';
import { SUPPORTED_LANGUAGES } from '@/lib/analysis/language';

/**
 * Server Actions for the dashboard.
 *
 * Every one of these re-derives the user from the session with `requireUser()`
 * rather than trusting an id from the form: a Server Action is a public HTTP
 * endpoint, and a hidden input is something the caller controls.
 *
 * They return a small result object instead of throwing so the calling client
 * component can show a message inline. A thrown error would surface as the
 * route error boundary, which is far too loud for "that tag was empty".
 */

export interface ActionResult {
  ok: boolean;
  /** Shown to the user verbatim, so it is written for them, not for a log. */
  message?: string;
}

// ─── Saving ──────────────────────────────────────────────────────────────────

export async function saveScanAction(
  scanId: string,
  note?: string,
): Promise<ActionResult> {
  const user = await requireUser();

  const saved = await saveScan({
    userId: user.id,
    scanId,
    note: note?.trim() ? note.trim() : null,
  });

  if (!saved) {
    return { ok: false, message: 'That scan could not be saved.' };
  }

  revalidatePath('/dashboard/saved');
  revalidatePath('/dashboard/history');
  revalidatePath(`/dashboard/scans/${scanId}`);
  return { ok: true, message: 'Saved.' };
}

export async function unsaveScanAction(scanId: string): Promise<ActionResult> {
  const user = await requireUser();

  const removed = await unsaveScan(user.id, scanId);
  if (!removed) {
    return { ok: false, message: 'That scan was not saved.' };
  }

  revalidatePath('/dashboard/saved');
  revalidatePath('/dashboard/history');
  revalidatePath(`/dashboard/scans/${scanId}`);
  return { ok: true, message: 'Removed from saved.' };
}

/** Toggle used by the history rows, where the current state is already known. */
export async function toggleSaveAction(
  scanId: string,
  currentlySaved: boolean,
): Promise<ActionResult> {
  return currentlySaved ? unsaveScanAction(scanId) : saveScanAction(scanId);
}

export interface UpdateSavedFields {
  note?: string;
  /** Comma-separated as typed; split and cleaned here, not in the component. */
  tags?: string;
}

export async function updateSavedAction(
  savedId: string,
  fields: UpdateSavedFields,
): Promise<ActionResult> {
  const user = await requireUser();

  // A tag list is normalised once, here, so `#Hate`, `hate ` and `hate` never
  // become three different filter chips.
  const tags =
    fields.tags === undefined
      ? undefined
      : [
          ...new Set(
            fields.tags
              .split(',')
              .map((t) => t.trim().replace(/^#/, '').toLowerCase())
              .filter(Boolean),
          ),
        ].slice(0, 12);

  const updated = await updateSavedAnalysis({
    savedId,
    userId: user.id,
    note: fields.note === undefined ? undefined : fields.note.trim() || null,
    tags,
  });

  if (!updated) {
    return { ok: false, message: 'Nothing was changed.' };
  }

  revalidatePath('/dashboard/saved');
  return { ok: true, message: 'Updated.' };
}

export async function deleteSavedAction(savedId: string): Promise<ActionResult> {
  const user = await requireUser();

  const removed = await deleteSavedAnalysis(savedId, user.id);
  if (!removed) {
    return { ok: false, message: 'That saved analysis no longer exists.' };
  }

  revalidatePath('/dashboard/saved');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Removed from saved.' };
}

// ─── Scans ───────────────────────────────────────────────────────────────────

/**
 * Deletes a scan and, by cascade, its comments, analyses, bookmarks and
 * reports. Irreversible, so the calling component confirms first.
 */
export async function deleteScanAction(scanId: string): Promise<ActionResult> {
  const user = await requireUser();

  const removed = await deleteScan(scanId, user.id);
  if (!removed) {
    return { ok: false, message: 'That scan could not be deleted.' };
  }

  revalidatePath('/dashboard/history');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/saved');
  return { ok: true, message: 'Scan deleted.' };
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function deleteReportAction(reportId: string): Promise<ActionResult> {
  const user = await requireUser();

  const removed = await deleteReport(reportId, user.id);
  if (!removed) {
    return { ok: false, message: 'That report could not be deleted.' };
  }

  revalidatePath('/dashboard/reports');
  return { ok: true, message: 'Report deleted.' };
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface UpdateProfileFields {
  fullName: string;
  preferredLanguage: string;
}

/**
 * Updates the profile row.
 *
 * The email is deliberately not editable here: it lives in Supabase Auth, and
 * changing it is a verification flow, not a text field.
 */
export async function updateProfileAction(
  fields: UpdateProfileFields,
): Promise<ActionResult> {
  const user = await requireUser();

  const fullName = fields.fullName.trim();
  if (fullName.length > 120) {
    return { ok: false, message: 'That name is too long (120 characters max).' };
  }

  // Anything outside the supported set would break `languageName()` downstream,
  // and a form value is not to be trusted just because a <select> produced it.
  if (!(fields.preferredLanguage in SUPPORTED_LANGUAGES)) {
    return { ok: false, message: 'Pick a language from the list.' };
  }

  await db
    .update(profiles)
    .set({
      fullName: fullName || null,
      preferredLanguage: fields.preferredLanguage,
    })
    .where(eq(profiles.id, user.id));

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard');
  return { ok: true, message: 'Profile updated.' };
}
