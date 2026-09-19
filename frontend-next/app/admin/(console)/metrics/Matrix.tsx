import { CATEGORY_META } from '@/lib/analysis/taxonomy';
import type { ConfusionMatrix } from '@/lib/metrics/confusion';
import type { ToxicityCategory } from '@/lib/db/schema';
import { formatCount } from '@/components/admin/console';

/**
 * A confusion matrix, drawn as a real table.
 *
 * Rows are truth, columns are prediction — the convention every paper uses, and
 * `ConfusionMatrix` is already stored that way, so nothing is transposed here.
 * A `<th scope="row">` and `<th scope="col">` on every axis is what lets a
 * screen reader announce "actual insult, predicted threat, 3" when it lands on
 * a cell; a grid of bare `<td>`s would be an unreadable wall of integers.
 *
 * Shading is the diagonal's friend: the deeper a cell, the more of the row it
 * holds. Off-diagonal darkness is therefore the thing to look for, which is
 * exactly the reading the matrix exists to support.
 */

/** Cells are shaded relative to their own row, not the whole matrix: a rare
 *  class with three observations would otherwise render as uniformly blank
 *  next to a majority class with three hundred. */
function shade(value: number, rowTotal: number): string | undefined {
  if (value === 0 || rowTotal === 0) return undefined;
  const share = value / rowTotal;
  // Capped well below opaque so the figure stays legible on top of the tint.
  return `rgba(41, 37, 36, ${(0.06 + share * 0.34).toFixed(3)})`;
}

export function CategoryMatrix({
  matrix,
  caption,
}: {
  matrix: ConfusionMatrix<ToxicityCategory>;
  caption: string;
}) {
  if (matrix.total === 0) {
    return (
      <p className="py-6 text-center text-[12.5px] text-muted-soft">
        No labelled observations in this slice.
      </p>
    );
  }

  const rowTotals = matrix.matrix.map((row) =>
    row.reduce((sum, v) => sum + v, 0)
  );

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="caption-uppercase border-b border-hairline px-2 py-1.5 text-[9.5px] font-semibold text-muted-soft"
            >
              Actual \ Predicted
            </th>
            {matrix.labels.map((label) => (
              <th
                key={label}
                scope="col"
                className="border-b border-hairline px-1.5 py-1.5 text-center text-[10px] font-semibold whitespace-nowrap"
                style={{ color: CATEGORY_META[label].ink }}
                title={CATEGORY_META[label].display}
              >
                {abbreviate(label)}
              </th>
            ))}
            <th
              scope="col"
              className="caption-uppercase border-b border-hairline px-2 py-1.5 text-right text-[9.5px] font-semibold text-muted-soft"
            >
              Support
            </th>
          </tr>
        </thead>
        <tbody>
          {matrix.labels.map((actual, i) => (
            <tr key={actual}>
              <th
                scope="row"
                className="border-b border-hairline-soft px-2 py-1.5 text-[11.5px] font-medium whitespace-nowrap"
                style={{ color: CATEGORY_META[actual].ink }}
              >
                {CATEGORY_META[actual].display}
              </th>
              {matrix.labels.map((predicted, j) => {
                const value = matrix.matrix[i][j];
                const onDiagonal = i === j;
                return (
                  <td
                    key={predicted}
                    className={[
                      'border-b border-hairline-soft px-1.5 py-1.5 text-center font-mono text-[11.5px] tabular-nums',
                      onDiagonal ? 'font-semibold text-ink' : 'text-body',
                      value === 0 ? 'text-muted-soft' : '',
                    ].join(' ')}
                    style={{ backgroundColor: shade(value, rowTotals[i]) }}
                    title={`Actual ${CATEGORY_META[actual].display}, predicted ${CATEGORY_META[predicted].display}: ${value}`}
                  >
                    {value === 0 ? '·' : value}
                  </td>
                );
              })}
              <td className="border-b border-hairline-soft px-2 py-1.5 text-right font-mono text-[11.5px] tabular-nums text-muted">
                {formatCount(rowTotals[i])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The harmful/clean matrix, laid out as the familiar 2×2 with the four counts
 * named. An examiner reads TP/FP/FN/TN off this directly rather than deriving
 * them, and the names are what the precision and recall formulas below refer to.
 */
export function BinaryMatrix({
  counts,
  caption,
}: {
  counts: {
    truePositives: number;
    falsePositives: number;
    trueNegatives: number;
    falseNegatives: number;
  };
  caption: string;
}) {
  return (
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th
            scope="col"
            className="caption-uppercase border-b border-hairline px-2 py-1.5 text-[9.5px] font-semibold text-muted-soft"
          >
            Actual \ Predicted
          </th>
          <th
            scope="col"
            className="caption-uppercase border-b border-hairline px-2 py-1.5 text-center text-[9.5px] font-semibold text-muted"
          >
            Harmful
          </th>
          <th
            scope="col"
            className="caption-uppercase border-b border-hairline px-2 py-1.5 text-center text-[9.5px] font-semibold text-muted"
          >
            Clean
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th
            scope="row"
            className="caption-uppercase border-b border-hairline-soft px-2 py-2 text-[9.5px] font-semibold text-muted"
          >
            Harmful
          </th>
          <Cell value={counts.truePositives} name="TP" emphasis />
          <Cell value={counts.falseNegatives} name="FN" />
        </tr>
        <tr>
          <th
            scope="row"
            className="caption-uppercase border-b border-hairline-soft px-2 py-2 text-[9.5px] font-semibold text-muted"
          >
            Clean
          </th>
          <Cell value={counts.falsePositives} name="FP" />
          <Cell value={counts.trueNegatives} name="TN" emphasis />
        </tr>
      </tbody>
    </table>
  );
}

function Cell({
  value,
  name,
  emphasis = false,
}: {
  value: number;
  name: string;
  emphasis?: boolean;
}) {
  return (
    <td className="border-b border-hairline-soft px-2 py-2 text-center">
      <span
        className={[
          'block font-mono tabular-nums',
          emphasis ? 'text-[17px] text-ink' : 'text-[17px] text-body',
        ].join(' ')}
      >
        {formatCount(value)}
      </span>
      <span className="mt-0.5 block font-mono text-[9.5px] text-muted-soft">
        {name}
      </span>
    </td>
  );
}

/** Nine full category names will not fit across a matrix header. */
function abbreviate(category: ToxicityCategory): string {
  return category
    .split('_')
    .map((part) => part.slice(0, 3))
    .join('·');
}
