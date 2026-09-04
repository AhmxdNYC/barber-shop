import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { hasDatabase } from "@/lib/db/test-helpers";
import { liveServices } from "./live-services";
import { openingHours } from "./opening-hours";

/**
 * The website must show what the shop actually charges and when it is
 * actually open.
 *
 * Both used to come from hardcoded arrays while bookings came from the
 * database, so a price or an hour edited in the dashboard changed what could
 * be booked without changing what the site advertised. These tests exist to
 * stop that returning.
 */
const suite = hasDatabase ? describe : describe.skip;

suite("live shop content", () => {
  afterEach(async () => {
    await prisma.service.updateMany({
      where: { slug: "haircut" },
      data: { priceCents: 4000, isActive: true },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("shows the price currently in the database", async () => {
    await prisma.service.update({
      where: { slug: "haircut" },
      data: { priceCents: 4500 },
    });

    const services = await liveServices();
    expect(services.find((s) => s.slug === "haircut")?.priceCents).toBe(4500);
  });

  it("hides a service the barber has made unbookable", async () => {
    await prisma.service.update({
      where: { slug: "haircut" },
      data: { isActive: false },
    });

    const services = await liveServices();
    expect(services.some((s) => s.slug === "haircut")).toBe(false);
  });

  it("derives opening hours from the barbers who are working", async () => {
    const hours = await openingHours();
    expect(hours).toHaveLength(7);

    const [{ opens, closes }] = await prisma.workingHours.findMany({
      where: { dayOfWeek: 2, isClosed: false },
      select: { opensAtMinutes: true, closesAtMinutes: true },
    }).then((rows) => [
      {
        opens: Math.min(...rows.map((r) => r.opensAtMinutes)),
        closes: Math.max(...rows.map((r) => r.closesAtMinutes)),
      },
    ]);

    expect(hours[2].opens).toBe(opens);
    expect(hours[2].closes).toBe(closes);
  });

  /** If every barber is off, the shop is shut — not "open with no slots". */
  it("reports a day closed when nobody is working", async () => {
    const original = await prisma.workingHours.findMany({ where: { dayOfWeek: 1 } });
    await prisma.workingHours.updateMany({
      where: { dayOfWeek: 1 },
      data: { isClosed: true },
    });

    const hours = await openingHours();
    expect(hours[1].opens).toBeNull();

    for (const row of original) {
      await prisma.workingHours.update({
        where: { id: row.id },
        data: { isClosed: row.isClosed },
      });
    }
  });
});
