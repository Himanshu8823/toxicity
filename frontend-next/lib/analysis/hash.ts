import { createHash } from 'node:crypto';

/**
 * The cache key for an analysed comment.
 *
 * Normalised before hashing so that trivially different copies of the same
 * comment — extra whitespace, different casing — share one cache entry. Both
 * are extremely common in comment sections, where the same reply is pasted
 * dozens of times.
 */
export function hashText(text: string): string {
  const normalised = text.trim().toLowerCase().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalised, 'utf8').digest('hex');
}
