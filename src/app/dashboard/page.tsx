import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { appointmentsForDay, dayStats } from "@/lib/dashboard/queries";
import { scheduleForDay, upcomingTimeOff } from "@/lib/dashboard/day-schedule";
import { formatPrice } from "@/lib/shop";
import { StatTile } from "@/components/dashboard/stat-tile";
import { DayCalendar } from "@/components/dashboard/day-calendar";
import { WalkInForm } from "@/components/dashboard/walk-in-form";
import { ShopHoursEditor } from "@/components/dashboard/shop-hours-editor";
import { WorkingHoursEditor } from "@/components/dashboard/working-hours-editor";
import { TimeOffEditor } from "@/components/dashboard/time-off-editor";
import { RecurringBlockEditor } from "@/components/dashboard/recurring-block-editor";
import { Disclosure } from "@/components/ui/disclosure";
import type { SheetAppointment } from "@/components/dashboard/appointment-sheet";

/**
 * The barber's whole day on one page.
 *
 * Schedule editing used to live behind a separate Hours page, which meant
 * leaving the calendar to answer a question the calendar had just raised —
 * "I need Thursday afternoon off" happens while looking at Thursday. The
 * controls are collapsed rather than absent, so the day stays the thing you
 * see first.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; barber?: string }>;
}) {
  const { date: dateParam, barber: barberParam } = await searchParams;
  const date = dateParam ? new Date(`${dateParam}T12:00:00`) : new Date();

  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const timeZone = settings?.timezone ?? "America/New_York";

  const [appointments, stats, schedule, timeOff, barbers, shopHours] =
    await Promise.all([
      appointmentsForDay(date),
      dayStats(date),
      scheduleForDay(date, timeZone),
      upcomingTimeOff(),
      prisma.barber.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, slug: true, name: true },
      }),
      prisma.shopHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
    ]);

  const selectedBarber =
    barbers.find((b) => b.slug === barberParam) ?? barbers[0];

  const [barberHours, blocks] = await Promise.all([
    selectedBarber
      ? prisma.workingHours.findMany({
          where: { barberId: selectedBarber.id },
          orderBy: { dayOfWeek: "asc" },
        })
      : [],
    selectedBarber
      ? prisma.recurringBlock.findMany({
          where: { barberId: selectedBarber.id, isActive: true },
          orderBy: [{ dayOfWeek: "asc" }, { startAtMinutes: "asc" }],
        })
      : [],
  ]);

  const isToday = date.toDateString() === new Date().toDateString();
  const nowMinutes = minutesNow(timeZone);

  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone, hour: "numeric", minute: "2-digit",
  });

  // Everything the tapped-appointment sheet needs, prepared on the server.
  const sheetData: Record<string, SheetAppointment> = Object.fromEntries(
    appointments.map((a) => [
      a.id,
      {
        id: a.id,
        clientName: a.contactName,
        serviceName: a.service.name,
        barberName: a.barber.name,
        phone: a.contactPhone,
        notes: a.clientNotes,
        status: a.status,
        time: timeFmt.format(a.startsAt),
        priceLabel: formatPrice(a.priceCents),
        noShowCount: a.client?.noShowCount ?? 0,
        visitCount: a.client?.visitCount ?? 0,
      },
    ]),
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">{relativeDay(date)}</span>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
            {new Intl.DateTimeFormat("en-US", {
              weekday: "long", month: "long", day: "numeric", timeZone,
            }).format(date)}
          </h1>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link href={shift(date, -1)} className={NAV_BUTTON}>&larr; Prev</Link>
          <Link href="/dashboard" className={NAV_BUTTON}>Today</Link>
          <Link href={shift(date, 1)} className={NAV_BUTTON}>Next &rarr;</Link>
        </nav>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Booked" value={String(stats.booked)} />
        <StatTile label="Completed" value={String(stats.completed)} />
        <StatTile
          label="Revenue, 7 days"
          value={formatPrice(stats.revenueThisWeekCents)}
          hint="Completed only"
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
              Tap an appointment to mark it done, move it, or cancel it.
            </p>
          </div>
          <WalkInForm defaultStart={defaultWalkInStart(date, timeZone)} />
        </div>

        <div className="mt-4">
          <DayCalendar
            days={schedule}
            nowMinutes={nowMinutes}
            isToday={isToday}
            appointments={sheetData}
            rescheduleDays={nextDays()}
          />
        </div>
      </section>

      <section className="mt-12 grid gap-3">
        <h2 className="font-display text-xl font-bold">Schedule</h2>

        <Disclosure
          title="Shop opening hours"
          hint="When the shop is open. Nothing can be booked outside these times."
        >
          <ShopHoursEditor rows={shopHours} />
        </Disclosure>

        <Disclosure
          title="Time off"
          hint="Holidays, appointments, closing early. Existing bookings are never cancelled automatically."
        >
          <TimeOffEditor
            barbers={barbers}
            rows={timeOff.map((t) => ({
              id: t.id,
              startsAt: t.startsAt,
              endsAt: t.endsAt,
              reason: t.reason,
              barberName: t.barber.name,
            }))}
            timeZone={timeZone}
            defaultStart={defaultWalkInStart(date, timeZone)}
          />
        </Disclosure>

        {selectedBarber && (
          <Disclosure
            title={`${selectedBarber.name}'s hours`}
            hint="When this barber works, inside the shop's opening hours."
          >
            <nav className="mb-4 flex flex-wrap gap-2">
              {barbers.map((b) => (
                <Link
                  key={b.slug}
                  href={`/dashboard?barber=${b.slug}`}
                  className={`rounded-[3px] border px-3 py-1.5 text-sm ${
                    b.id === selectedBarber.id
                      ? "border-accent bg-accent-dim"
                      : "border-line text-bone-2 hover:border-line-strong"
                  }`}
                >
                  {b.name}
                </Link>
              ))}
            </nav>
            <WorkingHoursEditor barberId={selectedBarber.id} rows={barberHours} />
            <h4 className="mt-6 font-display font-bold">Repeating breaks</h4>
            <div className="mt-3">
              <RecurringBlockEditor barberId={selectedBarber.id} rows={blocks} />
            </div>
          </Disclosure>
        )}
      </section>
    </div>
  );
}

const NAV_BUTTON =
  "rounded-[3px] border border-line-strong px-4 py-2 hover:border-bone-3";

function shift(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return `/dashboard?date=${d.toISOString().slice(0, 10)}`;
}

/** Minutes from midnight right now, shop-local. */
function minutesNow(timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** Two weeks of dates offered when moving an appointment. */
function nextDays(count = 14) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: String(d.getDate()),
    };
  });
}

/**
 * "Today", "Tomorrow", "Yesterday", or the weekday.
 *
 * This heading used to say "Today" whatever day was open, so paging back
 * through the week still claimed to be today — the one label a barber
 * glancing at the screen actually relies on.
 */
function relativeDay(date: Date): string {
  const startOf = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  };
  const days = Math.round(
    (startOf(date) - startOf(new Date())) / (24 * 60 * 60 * 1000),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 7) return `In ${days} days`;
  if (days < -1 && days > -7) return `${Math.abs(days)} days ago`;
  return date.toLocaleDateString("en-US", { weekday: "long" });
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
