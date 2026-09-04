import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { clearAppointments, hasDatabase } from "@/lib/db/test-helpers";
import { clientBook } from "./clients";
import { revenueReport } from "./revenue";

/**
 * The client book and the revenue report.
 *
 * Both answer questions the barber has rather than listing rows, so the
 * behaviour worth testing is the judgement: who counts as overdue, and what
 * counts as money.
 */
const suite = hasDatabase ? describe : describe.skip;

const EMAIL = "book@booking-test.com";
const DAY = 24 * 60 * 60 * 1000;

suite("client book", () => {
  afterEach(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: EMAIL } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /** Visits every 14 days, the most recent `lastAgo` days back. */
  async function clientWithHistory(gaps: number[], lastAgo: number) {
    const client = await prisma.client.create({
      data: {
        email: EMAIL,
        name: "Regular Client",
        visitCount: gaps.length + 1,
        lastVisitAt: new Date(Date.now() - lastAgo * DAY),
      },
    });
    const [barber, service] = await Promise.all([
      prisma.barber.findUniqueOrThrow({ where: { slug: "eduardo" } }),
      prisma.service.findUniqueOrThrow({ where: { slug: "haircut" } }),
    ]);

    let offset = lastAgo;
    const dates = [offset];
    for (const gap of gaps) {
      offset += gap;
      dates.push(offset);
    }

    for (const [i, ago] of dates.entries()) {
      const startsAt = new Date(Date.now() - ago * DAY);
      await prisma.appointment.create({
        data: {
          barberId: barber.id,
          clientId: client.id,
          serviceId: service.id,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 40 * 60_000),
          status: "COMPLETED",
          priceCents: 4000,
          depositCents: 0,
          contactName: "Regular Client",
          contactEmail: EMAIL,
          manageTokenHash: `book-test-${i}-${Date.now()}`,
        },
      });
    }
    return client;
  }

  it("works out how often someone comes", async () => {
    await clientWithHistory([14, 14, 14], 7);
    const book = await clientBook();
    const entry = book.find((c) => c.email === EMAIL);
    expect(entry?.averageGapDays).toBe(14);
    expect(entry?.usualService).toBe("Haircut");
    expect(entry?.usualBarber).toBe("Eduardo");
  });

  /** The row worth surfacing: a regular who is late and has nothing booked. */
  it("flags a regular who is past their usual gap", async () => {
    await clientWithHistory([14, 14, 14], 30);
    const entry = (await clientBook()).find((c) => c.email === EMAIL);
    expect(entry?.isDue).toBe(true);
  });

  it("does not flag someone who is only slightly late", async () => {
    await clientWithHistory([14, 14, 14], 15);
    const entry = (await clientBook()).find((c) => c.email === EMAIL);
    expect(entry?.isDue).toBe(false);
  });

  it("never flags someone who already has an appointment booked", async () => {
    const client = await clientWithHistory([14, 14, 14], 30);
    const [barber, service] = await Promise.all([
      prisma.barber.findUniqueOrThrow({ where: { slug: "eduardo" } }),
      prisma.service.findUniqueOrThrow({ where: { slug: "haircut" } }),
    ]);
    const soon = new Date(Date.now() + 2 * DAY);
    await prisma.appointment.create({
      data: {
        barberId: barber.id,
        clientId: client.id,
        serviceId: service.id,
        startsAt: soon,
        endsAt: new Date(soon.getTime() + 40 * 60_000),
        status: "CONFIRMED",
        priceCents: 4000,
        depositCents: 0,
        contactName: "Regular Client",
        contactEmail: EMAIL,
        manageTokenHash: `book-upcoming-${Date.now()}`,
      },
    });

    const entry = (await clientBook()).find((c) => c.email === EMAIL);
    expect(entry?.isDue).toBe(false);
    expect(entry?.nextAppointmentAt).not.toBeNull();
  });

  it("claims no rhythm from a single visit", async () => {
    await clientWithHistory([], 10);
    const entry = (await clientBook()).find((c) => c.email === EMAIL);
    expect(entry?.averageGapDays).toBeNull();
    expect(entry?.isDue).toBe(false);
  });
});

suite("revenue report", () => {
  afterEach(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: EMAIL } });
  });

  async function appointment(status: string, agoDays: number, priceCents = 4000) {
    const [barber, service] = await Promise.all([
      prisma.barber.findUniqueOrThrow({ where: { slug: "eduardo" } }),
      prisma.service.findUniqueOrThrow({ where: { slug: "haircut" } }),
    ]);
    const client = await prisma.client.upsert({
      where: { email: EMAIL },
      create: { email: EMAIL, name: "Revenue Client" },
      update: {},
    });
    const startsAt = new Date(Date.now() - agoDays * DAY);
    await prisma.appointment.create({
      data: {
        barberId: barber.id,
        clientId: client.id,
        serviceId: service.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 40 * 60_000),
        status: status as "COMPLETED",
        priceCents,
        depositCents: 0,
        contactName: "Revenue Client",
        contactEmail: EMAIL,
        manageTokenHash: `rev-${status}-${agoDays}-${Date.now()}`,
      },
    });
  }

  it("counts completed work and nothing else", async () => {
    await appointment("COMPLETED", 2, 4000);
    await appointment("CONFIRMED", 1, 9900); // booked, not yet done
    await appointment("CANCELLED", 1, 9900);

    const report = await revenueReport(7, "America/New_York");
    expect(report.totalCents).toBe(4000);
    expect(report.cuts).toBe(1);
    expect(report.cancelledCount).toBe(1);
  });

  /** Money lost is reported separately, never folded into earnings. */
  it("reports no-shows as lost rather than earned", async () => {
    await appointment("COMPLETED", 2, 4000);
    await appointment("NO_SHOW", 3, 4500);

    const report = await revenueReport(7, "America/New_York");
    expect(report.totalCents).toBe(4000);
    expect(report.noShowCount).toBe(1);
    expect(report.noShowCents).toBe(4500);
  });

  it("ignores anything outside the window", async () => {
    await appointment("COMPLETED", 40, 4000);
    const report = await revenueReport(7, "America/New_York");
    expect(report.totalCents).toBe(0);
  });

  it("returns one point per day so quiet days still show", async () => {
    const report = await revenueReport(7, "America/New_York");
    expect(report.daily).toHaveLength(7);
  });
});
