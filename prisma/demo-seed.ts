import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHash, randomBytes } from "node:crypto";

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
const DAY = 24 * 60 * 60 * 1000;

/**
 * Start times an hour and ten minutes apart — a sixty-minute cut plus the
 * shop's ten-minute buffer — so generated bookings never collide with the
 * exclusion constraint.
 */
const START_MINUTES = [630, 700, 770, 840, 910, 980, 1050, 1120];

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
];

function emailFor(name: string): string {
  return name.toLowerCase().replace(/[^a-z]+/g, ".") + DEMO_DOMAIN;
}

function phoneFor(index: number): string {
  return `914-555-${String(1000 + index * 7).slice(-4)}`;
}

/** Local midnight, so a day's slots land where the shop expects them. */
function dayStart(offsetDays: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

function at(day: Date, minutes: number): Date {
  return new Date(day.getTime() + minutes * 60_000);
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
  function freeSlot(day: Date, barberId: string): number | null {
    const dayOfWeek = day.getDay();
    if (!openOn.has(`${barberId}:${dayOfWeek}`)) return null;
    const options = START_MINUTES.filter(
      (m) => !taken.has(`${barberId}:${day.toDateString()}:${m}`),
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
      const day = dayStart(targetOffset + drift);
      for (const barberId of [preferred, ...barbers.map((b) => b.id)]) {
        const minutes = freeSlot(day, barberId);
        if (minutes === null) continue;

        taken.add(`${barberId}:${day.toDateString()}:${minutes}`);
        const service = pick(services);
        const startsAt = at(day, minutes);

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

  // A lunch break for the owner, and an afternoon off next week, so the
  // calendar has gaps that are not simply unbooked.
  const eduardo = barbers[0];
  for (const dayOfWeek of [2, 3, 4, 5]) {
    await prisma.recurringBlock.create({
      data: {
        barberId: eduardo.id,
        dayOfWeek,
        startAtMinutes: 840,
        endAtMinutes: 900,
        label: "[demo] Lunch",
      },
    });
  }

  const off = dayStart(5);
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
