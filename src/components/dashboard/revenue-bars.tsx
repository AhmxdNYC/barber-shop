import { formatPrice } from "@/lib/shop";
import type { RevenuePoint } from "@/lib/dashboard/revenue";

/**
 * Daily takings as bars.
 *
 * Plain CSS heights rather than a charting library: it is one series of
 * small numbers, and a dependency would cost more in bundle size than the
 * chart is worth. Days with nothing are drawn as an empty column rather than
 * skipped, because a quiet Monday is information.
 */
export function RevenueBars({ points }: { points: RevenuePoint[] }) {
  const max = Math.max(...points.map((p) => p.cents), 1);

  return (
    <div className="overflow-x-auto rounded-[3px] border border-line bg-surface p-5">
      <div className="flex min-w-[520px] items-end gap-1.5" style={{ height: 160 }}>
        {points.map((point) => {
          const heightPercent = (point.cents / max) * 100;
          return (
            <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[0.6rem] tabular-nums text-bone-3">
                {point.cents > 0 ? formatPrice(point.cents) : ""}
              </span>
              <div
                className={`w-full rounded-t-[2px] ${
                  point.cents > 0 ? "bg-accent" : "bg-line"
                }`}
                style={{ height: `${Math.max(heightPercent, point.cents > 0 ? 4 : 1)}%` }}
                title={`${point.label}: ${formatPrice(point.cents)} from ${point.cuts} cut${point.cuts === 1 ? "" : "s"}`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex min-w-[520px] gap-1.5">
        {points.map((point) => (
          <span
            key={point.date}
            className="min-w-0 flex-1 truncate text-center text-[0.6rem] text-bone-3"
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}
