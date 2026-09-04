import Link from "next/link";
import { appointmentsForDay, dayStats } from "@/lib/dashboard/queries";
import { prisma } from "@/lib/db/client";
import { formatPrice } from "@/lib/shop";
import { StatTile } from "@/components/dashboard/stat-tile";
import { AppointmentRow } from "@/components/dashboard/appointment-row";

/**
 * The day view — the only screen a working barber has time to look at.
 *
 * Ordered by what he needs between cuts: who is next, then the numbers.
 * Anything requiring interpretation belongs further in.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date();

  const [appointments, stats, settings] = await Promise.all([
    appointmentsForDay(date),
    dayStats(date),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
  ]);

  const timeZone = settings?.timezone ?? "America/New_York";
  const heading = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(date);

  const shift = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return `/dashboard?date=${d.toISOString().slice(0, 10)}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Today</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
            {heading}
          </h1>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link href={shift(-1)} className="rounded-[3px] border border-line-strong px-4 py-2 hover:border-bone-3">
            &larr; Prev
          </Link>
          <Link href="/dashboard" className="rounded-[3px] border border-line-strong px-4 py-2 hover:border-bone-3">
            Today
          </Link>
          <Link href={shift(1)} className="rounded-[3px] border border-line-strong px-4 py-2 hover:border-bone-3">
            Next &rarr;
          </Link>
        </nav>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Booked today" value={String(stats.booked)} />
        <StatTile label="Completed today" value={String(stats.completed)} />
        <StatTile
          label="Revenue, 7 days"
          value={formatPrice(stats.revenueThisWeekCents)}
          hint="Completed appointments only"
        />
        <StatTile
          label="No-shows, 7 days"
          value={String(stats.noShowsThisWeek)}
          tone={stats.noShowsThisWeek > 0 ? "warn" : "neutral"}
        />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">The day</h2>
        {appointments.length === 0 ? (
          <p className="mt-4 rounded-[3px] border border-line bg-surface p-8 text-center text-bone-2">
            Nothing booked. Walk-ins welcome.
          </p>
        ) : (
          <ul className="mt-4 border-t border-line">
            {appointments.map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                timeZone={timeZone}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
