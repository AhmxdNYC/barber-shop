import Link from "next/link";
import { appointmentsForDay, dayStats } from "@/lib/dashboard/queries";
import { prisma } from "@/lib/db/client";
import { formatPrice } from "@/lib/shop";
import { StatTile } from "@/components/dashboard/stat-tile";
import { AppointmentRow } from "@/components/dashboard/appointment-row";
import { WalkInForm } from "@/components/dashboard/walk-in-form";
import { DayCalendar } from "@/components/dashboard/day-calendar";
import { scheduleForDay, upcomingTimeOff } from "@/lib/dashboard/day-schedule";

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

  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const timeZone = settings?.timezone ?? "America/New_York";

  const [appointments, stats, schedule, timeOff] = await Promise.all([
    appointmentsForDay(date),
    dayStats(date),
    scheduleForDay(date, timeZone),
    upcomingTimeOff(),
  ]);

  const todayIso = new Date().toDateString();
  const isToday = date.toDateString() === todayIso;
  const nowParts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const nowMinutes =
    Number(nowParts.find((p) => p.type === "hour")?.value ?? 0) * 60 +
    Number(nowParts.find((p) => p.type === "minute")?.value ?? 0);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">The day</h2>
            <p className="mt-0.5 text-sm text-bone-3">
              Gaps are free time. Tap a name below to mark it done.
            </p>
          </div>
          <WalkInForm defaultStart={defaultWalkInStart(date, timeZone)} />
        </div>

        <div className="mt-4">
          <DayCalendar days={schedule} nowMinutes={nowMinutes} isToday={isToday} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Appointments</h2>
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
      {timeOff.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold">Time off coming up</h2>
          <ul className="mt-4 divide-y divide-line rounded-[3px] border border-line">
            {timeOff.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 bg-surface px-4 py-3 text-sm">
                <span className="font-semibold">{t.barber.name}</span>
                <span className="tabular-nums text-bone-2">
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  }).format(t.startsAt)}
                  {" – "}
                  {new Intl.DateTimeFormat("en-US", {
                    timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                  }).format(t.endsAt)}
                </span>
                <span className="text-bone-3">{t.reason ?? "Time off"}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/dashboard/availability"
            className="mt-3 inline-block text-sm text-bone-2 hover:text-bone"
          >
            Schedule more time off &rarr;
          </Link>
        </section>
      )}
    </div>
  );
}

/** Prefills the walk-in form with the next quarter hour, shop-local. */
function defaultWalkInStart(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const minutes = Math.ceil(Number(get("minute")) / 15) * 15;
  const hour = minutes === 60 ? String(Number(get("hour")) + 1).padStart(2, "0") : get("hour");
  const minute = String(minutes === 60 ? 0 : minutes).padStart(2, "0");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${minute}`;
}
