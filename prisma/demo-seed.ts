import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash, randomBytes } from "node:crypto";
import { fromZonedTime } from "date-fns-tz";

/**
 * Realistic demo data.
 *
 * Kept separate from the real seed, which loads the shop's actual content.
 * This invents clients and appointments so the dashboard can be judged with
 * something in it — an empty day view and a revenue page reading zero say
 * nothing about whether either is any good.
 *
 *   npm run db:demo        fill
 *   npm run db:demo -- --clear   remove it again
 *
 * Everything it writes is recognisable: client emails all end in
 * @demo.example, so clearing it cannot touch a real booking.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEMO_DOMAIN = "@demo.example";
let SHOP_TZ = "America/New_York";

/**
 * Start times on the half hour, from opening at 10:30 to the last cut at
 * 18:30. Sixty minutes apart, matching a sixty-minute service with no
 * cleanup buffer, so bookings sit back to back and breaks can be placed at
 * times a person would actually say out loud.
 */
const START_MINUTES = [630, 690, 750, 810, 870, 930, 990, 1050, 1110];

/**
 * Each client has a rhythm and a reliability, because the two screens this
 * data exists to demonstrate both depend on patterns rather than volume.
 *
 * `missRate` is the chance a given booking becomes a no-show. Scattering
 * no-shows evenly across everyone — which the first version did — produces a
 * shop where nobody is a problem and the no-show column is noise. A couple
 * of consistent offenders is what the barber actually recognises.
 *
 * `overdue` clients have no upcoming booking and a last visit pushed past
 * their usual gap, so the "due a cut" group has someone in it worth ringing.
 */
type DemoClient = {
  name: string;
  every: number;
  missRate: number;
  overdue?: boolean;
  note?: string | null;
};

const CLIENTS: DemoClient[] = [
  { name: "Marcus Webb", every: 21, missRate: 0, note: "Skin fade #1, tight on the sides." },
  { name: "Danny Ortiz", every: 28, missRate: 0.05, note: "Talks football. Leave the top long." },
  { name: "Ray Castillo", every: 14, missRate: 0 },
  // The two the barber would think of by name.
  { name: "Sam Whitfield", every: 21, missRate: 0.45, note: "Misses a lot. Worth ringing the day before." },
  { name: "Jerome Baptiste", every: 28, missRate: 0.35, note: "Second no-show this year." },
  { name: "Tomas Herrera", every: 35, missRate: 0, note: "Sensitive skin — no aftershave." },
  { name: "Andre Mensah", every: 21, missRate: 0.05 },
  // Regulars who have quietly stopped coming.
  { name: "Luis Peralta", every: 28, missRate: 0, overdue: true, note: "Books for his two boys as well." },
  { name: "Chris Nolan", every: 21, missRate: 0, overdue: true },
  { name: "Nico Ferrante", every: 14, missRate: 0, overdue: true, note: "Used to be in every fortnight." },
  { name: "Owen Blake", every: 30, missRate: 0.1 },
  { name: "Victor Salas", every: 21, missRate: 0 },
  { name: "Elias Mendoza", every: 21, missRate: 0 },
  { name: "Rashid Karim", every: 28, missRate: 0.05 },
  { name: "Gio Battaglia", every: 14, missRate: 0 },
  { name: "Malik Osei", every: 35, missRate: 0 },
  { name: "Diego Navarro", every: 21, missRate: 0.1 },
  { name: "Curtis Lang", every: 28, missRate: 0 },
  { name: "Bilal Rahman", every: 21, missRate: 0 },
  { name: "Frankie DeLuca", every: 42, missRate: 0.05 },
  { name: "Omar Haddad", every: 14, missRate: 0 },
  { name: "Trey Donovan", every: 28, missRate: 0 },
  { name: "Kofi Boateng", every: 21, missRate: 0 },
  { name: "Sal Vitale", every: 35, missRate: 0 },
];

/**
 * A stretch the shop is genuinely rammed.
 *
 * The rhythm-based history above produces a believable diary but a quiet
 * one — each client only appears every few weeks, so no single day looks
 * like a working Saturday. This fills a named window almost solid, which is
 * what actually demonstrates a calendar: gaps only mean something when
 * there is something around them.
 */
const BUSY_FROM = "2026-09-03";
const BUSY_TO = "2026-09-12";
const BUSY_FILL = 0.88;

/**
 * Breaks, staggered so the shop is never empty at once.
 *
 * Each occupies one bookable slot, and the slot is reserved before any
 * appointment is placed. Creating breaks afterwards — which the first
 * version did — dropped an hour of lunch on top of bookings that were
 * already there, so the calendar showed a barber cutting hair through his
 * own break.
 */
const BREAKS = [
  // Lunches are staggered so the shop is never empty at once.
  { chair: 0, label: "Lunch", startMinutes: 750, length: 60, days: [1, 2, 3, 4, 5] },
  { chair: 1, label: "Lunch", startMinutes: 810, length: 60, days: [1, 2, 3, 4, 5, 6] },
  { chair: 2, label: "Lunch", startMinutes: 690, length: 60, days: [2, 3, 4, 5, 6] },
  { chair: 3, label: "Lunch", startMinutes: 870, length: 60, days: [0, 2, 3, 4, 5] },
  // The shorter, more particular ones that make a week look like a week.
  { chair: 0, label: "School run", startMinutes: 990, length: 60, days: [3] },
  { chair: 1, label: "College", startMinutes: 630, length: 60, days: [2, 4] },
  { chair: 2, label: "Gym", startMinutes: 630, length: 60, days: [1, 3, 5] },
  { chair: 3, label: "Supplier run", startMinutes: 1110, length: 60, days: [5] },
] as const;

function emailFor(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, ".") + DEMO_DOMAIN;
}

function phoneFor(index: number): string {
  return `914-555-${String(1000 + index * 7).slice(-4)}`;
}

/**
 * A calendar date, as "YYYY-MM-DD" in the shop's timezone.
 *
 * The previous version built days from the machine's local midnight and
 * added minutes to it. That is wrong even when the machine happens to be in
 * the shop's timezone — arithmetic on a Date is arithmetic on an instant,
 * and adding 630 minutes to midnight does not reliably land on 10:30 local
 * across a DST boundary. It produced appointments hours outside opening
 * hours, which then collided with time the calendar was drawing as free.
 *
 * Everything is now built the way the application builds it: a wall-clock
 * time in the shop's timezone, converted once.
 */
function dayKey(offsetDays: number): string {
  const now = new Date();
  const shopToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = shopToday.split("-").map(Number);
  // Built in UTC so the arithmetic cannot slip an hour, then read back as
  // plain calendar parts.
  const shifted = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return shifted.toISOString().slice(0, 10);
}

/** A shop-local wall-clock time on that date, as a real instant. */
function at(date: string, minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return fromZonedTime(`${date}T${hh}:${mm}:00`, SHOP_TZ);
}

/** Day of week for a calendar date, without going through a local Date. */
function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function clear() {
  const clients = await prisma.client.findMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
    select: { id: true },
  });
  const ids = clients.map((c) => c.id);

  await prisma.notification.deleteMany({
    where: { appointment: { clientId: { in: ids } } },
  });
  await prisma.appointment.deleteMany({ where: { clientId: { in: ids } } });
  await prisma.client.deleteMany({ where: { id: { in: ids } } });
  await prisma.timeOff.deleteMany({ where: { reason: { startsWith: "[demo]" } } });
  await prisma.recurringBlock.deleteMany({ where: { label: { startsWith: "[demo]" } } });

  console.log(`Removed ${ids.length} demo clients and everything attached.`);
}

async function main() {
  if (process.argv.includes("--clear")) {
    await clear();
    return;
  }

  await clear();

  const [barbers, services, settings] = await Promise.all([
    prisma.barber.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.service.findMany({ where: { isActive: true } }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
  ]);

  if (barbers.length === 0 || services.length === 0 || !settings) {
    throw new Error("Run `npm run db:seed` first — there is no shop to book into.");
  }
  SHOP_TZ = settings.timezone;
  // Narrowing does not survive into the closures below.
  const bufferMinutes = settings.bufferMinutes;

  const workingHours = await prisma.workingHours.findMany();
  const openOn = new Set(
    workingHours.filter((w) => !w.isClosed).map((w) => `${w.barberId}:${w.dayOfWeek}`),
  );

  // Clients, each with their own rhythm so the "due a cut" grouping has
  // something real to sort.
  const clients: { id: string; name: string | null; email: string; phone: string | null }[] = await Promise.all(
    CLIENTS.map((c, i) =>
      prisma.client.create({
        data: {
          email: emailFor(c.name),
          name: c.name,
          phone: phoneFor(i),
          notes: c.note,
        },
      }),
    ),
  );

  /**
   * Appointments are generated per client rather than by filling the diary
   * at random.
   *
   * Random filling produces a busy-looking shop where every client has one
   * visit and nobody has a history — so cadence cannot be worked out, the
   * "due a cut" grouping has nothing to sort, and no-shows belong to nobody
   * in particular. Walking each client backwards along their own rhythm
   * gives every one of them a recognisable pattern.
   */
  const taken = new Set<string>();
  const usualBarber = new Map<string, string>();

  /**
   * Breaks first, so the diary is generated around them.
   *
   * Every slot a break covers is marked taken before a single appointment
   * is placed, which is the only way a break and a booking cannot end up on
   * top of each other.
   */
  for (const brk of BREAKS) {
    const barber = barbers[brk.chair];
    if (!barber) continue;

    for (const dayOfWeek of brk.days) {
      if (!openOn.has(`${barber.id}:${dayOfWeek}`)) continue;

      await prisma.recurringBlock.create({
        data: {
          barberId: barber.id,
          dayOfWeek,
          startAtMinutes: brk.startMinutes,
          endAtMinutes: brk.startMinutes + brk.length,
          label: `[demo] ${brk.label}`,
        },
      });
    }
  }

  /** Slots a recurring break covers on a given date. */
  function breakSlots(date: string, barberId: string): number[] {
    const dayOfWeek = weekdayOf(date);
    const index = barbers.findIndex((b) => b.id === barberId);
    return BREAKS.filter(
      (brk) => brk.chair === index && (brk.days as readonly number[]).includes(dayOfWeek),
    ).flatMap((brk) =>
      START_MINUTES.filter(
        (slot) =>
          slot < brk.startMinutes + brk.length && brk.startMinutes < slot + 60,
      ),
    );
  }

  /**
   * Anything already booked, so generated appointments slot around it.
   *
   * The set used to track only what this run had placed, which assumed an
   * empty diary. A single appointment left behind by anything else — a real
   * booking, a stray test row — collided with the exclusion constraint and
   * failed the whole seed partway through, leaving the data half written.
   */
  const existing = await prisma.appointment.findMany({
    where: { status: { not: "CANCELLED" } },
    select: { barberId: true, startsAt: true },
  });
  for (let offset = -130; offset <= 70; offset++) {
    const date = dayKey(offset);
    for (const barber of barbers) {
      for (const slot of breakSlots(date, barber.id)) {
        taken.add(`${barber.id}:${date}:${slot}`);
      }
    }
  }

  for (const appointment of existing) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: SHOP_TZ,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(appointment.startsAt);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    const date = `${get("year")}-${get("month")}-${get("day")}`;
    const minutes = Number(get("hour")) * 60 + Number(get("minute"));
    // Block the whole run of starts an existing booking could overlap.
    for (const slot of START_MINUTES) {
      if (Math.abs(slot - minutes) < 60) {
        taken.add(`${appointment.barberId}:${date}:${slot}`);
      }
    }
  }

  type Row = {
    clientId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string | null;
    barberId: string;
    serviceId: string;
    startsAt: Date;
    endsAt: Date;
    status: "COMPLETED" | "NO_SHOW" | "CANCELLED" | "CONFIRMED";
    priceCents: number;
  };
  const rows: Row[] = [];

  /** A free start on this day for this barber, or null if the day is full. */
  function freeSlot(date: string, barberId: string): number | null {
    if (!openOn.has(`${barberId}:${weekdayOf(date)}`)) return null;
    const options = START_MINUTES.filter(
      (m) => !taken.has(`${barberId}:${date}:${m}`),
    );
    if (options.length === 0) return null;
    return pick(options);
  }

  /** Places one visit near a target day, drifting a little as people do. */
  function place(
    client: (typeof clients)[number],
    trait: DemoClient,
    targetOffset: number,
    status: Row["status"],
  ): boolean {
    // A client keeps to one barber unless that chair is full.
    const preferred = usualBarber.get(client.id) ?? pick(barbers).id;
    usualBarber.set(client.id, preferred);

    for (const drift of [0, 1, -1, 2, -2, 3]) {
      const date = dayKey(targetOffset + drift);
      for (const barberId of [preferred, ...barbers.map((b) => b.id)]) {
        const minutes = freeSlot(date, barberId);
        if (minutes === null) continue;

        taken.add(`${barberId}:${date}:${minutes}`);
        const service = pick(services);
        const startsAt = at(date, minutes);

        rows.push({
          clientId: client.id,
          clientName: client.name ?? "Client",
          clientEmail: client.email,
          clientPhone: client.phone,
          barberId,
          serviceId: service.id,
          startsAt,
          endsAt: new Date(
            startsAt.getTime() +
              (service.durationMinutes + bufferMinutes) * 60_000,
          ),
          status,
          priceCents: service.priceCents,
        });
        return true;
      }
    }
    return false;
  }

  for (const [index, client] of clients.entries()) {
    const trait = CLIENTS[index];

    // Someone who has drifted away last came a good while past their usual
    // gap; everyone else was in recently.
    const lastVisitOffset = trait.overdue
      ? -Math.round(trait.every * (1.9 + Math.random() * 0.8))
      : -Math.round(Math.random() * trait.every * 0.8);

    // Walk backwards through their history.
    for (let visit = 0; visit < 10; visit++) {
      const offset = lastVisitOffset - visit * trait.every;
      if (offset < -120) break;

      const roll = Math.random();
      const status: Row["status"] =
        roll < trait.missRate ? "NO_SHOW" : roll < trait.missRate + 0.05 ? "CANCELLED" : "COMPLETED";

      place(client, trait, offset, status);
    }

    // Anyone still in the habit has their next one booked. The overdue do
    // not, which is exactly what puts them in front of the barber.
    if (!trait.overdue && Math.random() < 0.75) {
      place(client, trait, Math.round(Math.random() * 12) + 1, "CONFIRMED");
    }
  }

  // Fill the busy window. Runs after the histories so it only takes slots
  // those left free, and every booking still belongs to a real client with
  // a real past rather than a name invented on the spot.
  const today = dayKey(0);
  const busyDates: string[] = [];
  for (let offset = -120; offset <= 60; offset++) {
    const date = dayKey(offset);
    if (date >= BUSY_FROM && date <= BUSY_TO) busyDates.push(date);
  }

  for (const date of busyDates) {
    const dayOfWeek = weekdayOf(date);
    const past = date < today;

    for (const barber of barbers) {
      if (!openOn.has(`${barber.id}:${dayOfWeek}`)) continue;

      for (const minutes of START_MINUTES) {
        if (taken.has(`${barber.id}:${date}:${minutes}`)) continue;
        if (Math.random() > BUSY_FILL) continue;

        const client = pick(clients);
        const service = pick(services);
        const startsAt = at(date, minutes);

        taken.add(`${barber.id}:${date}:${minutes}`);
        rows.push({
          clientId: client.id,
          clientName: client.name ?? "Client",
          clientEmail: client.email,
          clientPhone: client.phone,
          barberId: barber.id,
          serviceId: service.id,
          startsAt,
          endsAt: new Date(
            startsAt.getTime() +
              (service.durationMinutes + bufferMinutes) * 60_000,
          ),
          status: past
            ? Math.random() < 0.07
              ? "NO_SHOW"
              : "COMPLETED"
            : "CONFIRMED",
          priceCents: service.priceCents,
        });
      }
    }
  }

  // A few walk-ins from people who never came back, so the client list is
  // not made entirely of regulars.
  for (const [i, name] of ["Pete Hollis", "Ken Adeyemi", "Marco Ruiz"].entries()) {
    const walkIn = await prisma.client.create({
      data: { email: emailFor(name), name, phone: phoneFor(20 + i) },
    });
    clients.push(walkIn);
    place(walkIn, { name, every: 30, missRate: 0 }, -Math.round(20 + Math.random() * 60), "COMPLETED");
  }

  for (const [i, row] of rows.entries()) {
    await prisma.appointment.create({
      data: {
        barberId: row.barberId,
        clientId: row.clientId,
        serviceId: row.serviceId,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: row.status,
        source: Math.random() < 0.2 ? "WALK_IN" : "ONLINE",
        priceCents: row.priceCents,
        depositCents: 0,
        contactName: row.clientName,
        contactEmail: row.clientEmail,
        contactPhone: row.clientPhone,
        clientNotes: Math.random() < 0.1 ? "Going shorter than last time." : null,
        manageTokenHash: createHash("sha256")
          .update(randomBytes(16).toString("hex") + i)
          .digest("hex"),
        cancelledAt: row.status === "CANCELLED" ? row.startsAt : null,
        cancelledBy: row.status === "CANCELLED" ? "guest_token" : null,
      },
    });
  }

  // Roll the client counters up to match, the way completing an appointment
  // does in the app.
  for (const client of clients) {
    const [completed, noShows] = await Promise.all([
      prisma.appointment.findMany({
        where: { clientId: client.id, status: "COMPLETED" },
        orderBy: { startsAt: "desc" },
        select: { priceCents: true, startsAt: true },
      }),
      prisma.appointment.count({ where: { clientId: client.id, status: "NO_SHOW" } }),
    ]);

    await prisma.client.update({
      where: { id: client.id },
      data: {
        visitCount: completed.length,
        noShowCount: noShows,
        totalSpentCents: completed.reduce((sum, a) => sum + a.priceCents, 0),
        lastVisitAt: completed[0]?.startsAt ?? null,
      },
    });
  }

  // An afternoon off next week, so the calendar has a gap that is neither
  // a break nor simply unbooked.
  const eduardo = barbers[0];
  const off = dayKey(5);
  await prisma.timeOff.create({
    data: {
      barberId: eduardo.id,
      startsAt: at(off, 900),
      endsAt: at(off, 1170),
      reason: "[demo] Dentist",
    },
  });

  const counts = await prisma.appointment.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log(`Seeded ${clients.length} clients and ${rows.length} appointments:`);
  for (const c of counts) console.log(`  ${c.status.padEnd(16)} ${c._count}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
