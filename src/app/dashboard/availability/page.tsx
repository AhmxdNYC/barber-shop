import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { toDateTimeLocal } from "@/lib/shop";
import { WorkingHoursEditor } from "@/components/dashboard/working-hours-editor";
import { TimeOffEditor } from "@/components/dashboard/time-off-editor";
import { RecurringBlockEditor } from "@/components/dashboard/recurring-block-editor";

/**
 * Availability for one chair.
 *
 * Each barber keeps their own hours, blocks and time off — that is the whole
 * reason the schema is barber-scoped rather than shop-scoped. A barber
 * selector sits at the top rather than a combined view, because the barber
 * using this is editing his own week, not auditing everyone's.
 */
export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string }>;
}) {
  const { barber: requestedSlug } = await searchParams;

  const barbers = await prisma.barber.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true },
  });
  if (barbers.length === 0) notFound();

  const selected =
    barbers.find((b) => b.slug === requestedSlug) ?? barbers[0];

  const [settings, hours, timeOff, blocks] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
    prisma.workingHours.findMany({
      where: { barberId: selected.id },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.timeOff.findMany({
      where: { barberId: selected.id, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.recurringBlock.findMany({
      where: { barberId: selected.id, isActive: true },
      orderBy: [{ dayOfWeek: "asc" }, { startAtMinutes: "asc" }],
    }),
  ]);

  const timeZone = settings?.timezone ?? "America/New_York";

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <span className="eyebrow">Schedule</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
        Availability
      </h1>
      <p className="mt-2 max-w-2xl text-bone-2">
        Hours, lunch breaks and time off. Changes take effect on the booking
        page immediately.
      </p>

      <nav className="mt-8 flex flex-wrap gap-2">
        {barbers.map((b) => (
          <Link
            key={b.slug}
            href={`/dashboard/availability?barber=${b.slug}`}
            className={`rounded-[3px] border px-4 py-2 text-sm font-semibold transition-colors ${
              b.id === selected.id
                ? "border-accent bg-accent-dim text-bone"
                : "border-line text-bone-2 hover:border-line-strong"
            }`}
          >
            {b.name}
          </Link>
        ))}
      </nav>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Weekly hours</h2>
        <p className="mt-1 text-sm text-bone-3">
          The normal week. Individual days can be overridden with time off.
        </p>
        <div className="mt-4">
          <WorkingHoursEditor barberId={selected.id} rows={hours} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold">Repeating breaks</h2>
        <p className="mt-1 text-sm text-bone-3">
          Gaps that happen every week, like lunch.
        </p>
        <div className="mt-4">
          <RecurringBlockEditor barberId={selected.id} rows={blocks} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-bold">Time off</h2>
        <p className="mt-1 text-sm text-bone-3">
          One-off blocks. Existing bookings are never cancelled automatically
          &mdash; you&rsquo;ll be told if any clash.
        </p>
        <div className="mt-4">
          <TimeOffEditor
            barberId={selected.id}
            rows={timeOff}
            timeZone={timeZone}
            defaultStart={toDateTimeLocal(new Date(), timeZone)}
          />
        </div>
      </section>
    </div>
  );
}
