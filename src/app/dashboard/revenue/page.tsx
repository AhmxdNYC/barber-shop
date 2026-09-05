import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { revenueReport } from "@/lib/dashboard/revenue";
import { formatPrice } from "@/lib/shop";
import { StatTile } from "@/components/dashboard/stat-tile";
import { RevenueBars } from "@/components/dashboard/revenue-bars";

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = RANGES.some((r) => String(r.days) === daysParam)
    ? Number(daysParam)
    : 7;

  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const report = await revenueReport(days, settings?.timezone ?? "America/New_York");

  const change =
    report.previousTotalCents > 0
      ? Math.round(
          ((report.totalCents - report.previousTotalCents) /
            report.previousTotalCents) *
            100,
        )
      : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Takings</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
            Revenue
          </h1>
        </div>
        <nav className="flex gap-2 text-sm">
          {RANGES.map((range) => (
            <Link
              key={range.days}
              href={`/dashboard/revenue?days=${range.days}`}
              className={`rounded-[3px] border px-4 py-2 ${
                range.days === days
                  ? "border-accent bg-accent-dim"
                  : "border-line-strong hover:border-bone-3"
              }`}
            >
              {range.label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-bone-3">
        Completed appointments only. Bookings that have not happened yet are
        not counted &mdash; this is what came in, not what is expected.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={`Taken, ${days} days`}
          value={formatPrice(report.totalCents)}
          hint={
            change === null
              ? undefined
              : `${change >= 0 ? "+" : ""}${change}% vs the ${days} before`
          }
        />
        <StatTile label="Cuts" value={String(report.cuts)} />
        <StatTile
          label="Average cut"
          value={report.cuts ? formatPrice(report.averageCents) : "—"}
        />
        <StatTile
          label="Lost to no-shows"
          value={formatPrice(report.noShowCents)}
          hint={`${report.noShowCount} missed · ${report.cancelledCount} cancelled`}
          tone={report.noShowCents > 0 ? "warn" : "neutral"}
        />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Day by day</h2>
        {report.busiestDay && (
          <p className="mt-1 text-sm text-bone-3">
            Best day was {report.busiestDay.label} at{" "}
            {formatPrice(report.busiestDay.cents)}.
          </p>
        )}
        <div className="mt-4">
          <RevenueBars
            points={report.daily}
            totalCents={report.totalCents}
            cuts={report.cuts}
          />
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Breakdown
          title="By service"
          hint="What actually earns."
          rows={report.byService}
          total={report.totalCents}
        />
        <Breakdown
          title="By barber"
          hint="Who took what."
          rows={report.byBarber}
          total={report.totalCents}
        />
      </div>

      {report.noShowCents > 0 && (
        <p className="mt-10 rounded-[3px] border border-accent bg-accent-dim px-5 py-4 text-sm">
          <strong className="font-semibold">
            {formatPrice(report.noShowCents)}
          </strong>{" "}
          was lost to {report.noShowCount} no-show
          {report.noShowCount === 1 ? "" : "s"} in the last {days} days. A
          deposit taken at booking would have covered part of that &mdash; see{" "}
          <Link href="/dashboard/clients" className="underline underline-offset-2">
            who is missing appointments
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Breakdown({
  title,
  hint,
  rows,
  total,
}: {
  title: string;
  hint: string;
  rows: { name: string; cents: number; cuts: number }[];
  total: number;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm text-bone-3">{hint}</p>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-[3px] border border-line bg-surface px-4 py-5 text-sm text-bone-3">
          Nothing completed yet.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[3px] border border-line">
          {rows.map((row) => (
            <li key={row.name} className="bg-surface px-4 py-3">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold">{row.name}</span>
                <span className="tabular-nums text-bone-2">
                  {formatPrice(row.cents)}
                  <span className="ml-2 text-bone-3">
                    {row.cuts} cut{row.cuts === 1 ? "" : "s"}
                  </span>
                </span>
              </div>
              <div className="mt-2 h-1 rounded-full bg-line">
                <div
                  className="h-1 rounded-full bg-brass"
                  style={{ width: `${total ? (row.cents / total) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
