import { categoryMeta } from '@/lib/analysis/taxonomy';
import type { ToxicityCategory } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

export interface CategoryBadgeProps {
  category: ToxicityCategory;
  /** Adds the category's one-line description as a native tooltip. */
  withTitle?: boolean;
  className?: string;
}

/**
 * The category label as a pill.
 *
 * Colour comes from `CATEGORY_META` and lands on the *text* only — the fill
 * stays `surface-strong`. A saturated red pill would shout at the reader on
 * behalf of a model that is only ever reporting a probability.
 */
export function CategoryBadge({
  category,
  withTitle = false,
  className,
}: CategoryBadgeProps) {
  const meta = categoryMeta(category);

  return (
    <span
      className={cn(
        'caption-uppercase inline-flex items-center rounded-[var(--radius-pill)] bg-surface-strong px-2.5 py-1',
        className,
      )}
      style={{ color: meta.ink }}
      title={withTitle ? meta.description : undefined}
    >
      {meta.display}
    </span>
  );
}

export default CategoryBadge;
