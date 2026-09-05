import { formatPrice } from "@/lib/shop";
import type { RevenuePoint } from "@/lib/dashboard/revenue";

/**
 * Daily takings.
 *
 * The first version put a price above every bar, which works for a week and
 * falls apart at ninety days: ninety tiny numbers overlap into a grey smear
 * and the shape of the trend — the thing a chart is for — disappears behind
 * them.
 *
 * Numbers are now shown only when there is room for them. Beyond that the
 * chart carries a scale line, an average, and labels on a readable subset,
 * so the shape reads at any range and exact figures stay one hover away.
 */
export function RevenueBars({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(...points.map((p) => p.cents), 1);
  const earning = points.filter((p) => p.cents > 0);
  const average = earning.length
    ? Math.round(earning.reduce((sum, p) => sum + p.cents, 0) / earning.length)
    : 0;

  // Below this, every bar can carry its own figure; above it they collide.
  const showValues = points.length <= 10;
  // Keep roughly ten labels along the axis whatever the range.
  const labelEvery = Math.max(1, Math.ceil(points.length / 10));

  const best = earning.reduce<RevenuePoint | null>(
    (top, p) => (!top || p.cents > top.cents ? p : top),
    null,
  );

  return (
    <div className="rounded-[3px] border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-bone-3">
          Busiest day{" "}
          <span className="tabular-nums text-bone">
            {best ? formatPrice(best.cents) : "—"}
          </span>
        </span>
        <span className="text-bone-3">
          Average of days worked{" "}
          <span className="tabular-nums text-bone">{formatPrice(average)}</span>
        </span>
      </div>

      <div className="relative mt-5" style={{ height: 190 }}>
        {/* A line at the average, so a day reads as good or bad at a glance
            rather than only relative to the tallest bar. */}
        {average > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line-strong"
            style={{ bottom: `${(average / max) * 100}%` }}
          >
            <span className="absolute -top-2 right-0 bg-surface pl-2 text-[0.6rem] text-bone-3">
              avg
            </span>
          </div>
        )}

        <div className="flex h-full items-end gap-[3px]">
          {points.map((point) => {
            const height = (point.cents / max) * 100;
            const isBest = best !== null && point.date === best.date;
            return (
              <div
                key={point.date}
                className="group relative flex h-full min-w-0 flex-1 items-end"
                title={`${point.label}: ${formatPrice(point.cents)} from ${point.cuts} cut${point.cuts === 1 ? "" : "s"}`}
              >
                {showValues && point.cents > 0 && (
                  <span
                    className="absolute inset-x-0 text-center text-[0.6rem] tabular-nums text-bone-3"
                    style={{ bottom: `calc(${height}% + 4px)` }}
                  >
                    {formatPrice(point.cents)}
                  </span>
                )}
                <div
                  className={`w-full rounded-t-[2px] transition-colors ${
                    point.cents === 0
                      ? "bg-line"
                      : isBest
                        ? "bg-bone"
                        : "bg-accent group-hover:bg-accent-bright"
                  }`}
                  style={{
                    height: `${Math.max(height, point.cents > 0 ? 3 : 1)}%`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-[3px]">
        {points.map((point, index) => (
          <span
            key={point.date}
            className="min-w-0 flex-1 truncate text-center text-[0.6rem] text-bone-3"
          >
            {index % labelEvery === 0 ? point.label : ""}
          </span>
        ))}
      </div>

      <p className="mt-4 border-t border-line pt-3 text-xs text-bone-3">
        Empty bars are days with no completed work — a closed day looks the
        same as a quiet one, so check the calendar before reading too much
        into a gap.
      </p>
    </div>
  );
}
