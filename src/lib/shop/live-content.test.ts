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

  it("publishes the shop's own opening hours", async () => {
    const hours = await openingHours();
    expect(hours).toHaveLength(7);

    const tuesday = await prisma.shopHours.findUnique({ where: { dayOfWeek: 2 } });
    expect(hours[2].opens).toBe(tuesday!.opensAtMinutes);
    expect(hours[2].closes).toBe(tuesday!.closesAtMinutes);
  });

  it("shows a day as closed when the shop is marked closed", async () => {
    const original = await prisma.shopHours.findUnique({ where: { dayOfWeek: 1 } });
    await prisma.shopHours.update({
      where: { dayOfWeek: 1 },
      data: { isClosed: true },
    });

    expect((await openingHours())[1].opens).toBeNull();

    await prisma.shopHours.update({
      where: { dayOfWeek: 1 },
      data: { isClosed: original!.isClosed },
    });
  });
});
