import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { clearAppointments, hasDatabase } from "@/lib/db/test-helpers";

/**
 * Undoing a completed or no-show mark.
 *
 * Marking is one tap by design, so it is one tap to get wrong — and a
 * no-show is not a neutral mistake. It sits on the client's record and, once
 * deposits exist, decides whether they lose money. The counters have to come
 * back with it, or undoing the status leaves the client's history wrong in a
 * way nobody would think to check.
 */
const suite = hasDatabase ? describe : describe.skip;
const EMAIL = "reopen@booking-test.com";

suite("reopening an appointment", () => {
  afterEach(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: EMAIL } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seed(status: "COMPLETED" | "NO_SHOW") {
    const [barber, service] = await Promise.all([
      prisma.barber.findUniqueOrThrow({ where: { slug: "eduardo" } }),
      prisma.service.findUniqueOrThrow({ where: { slug: "adult-haircut" } }),
    ]);
    const startsAt = new Date(Date.now() - 3 * 86_400_000);
    const client = await prisma.client.create({
      data: {
        email: EMAIL,
        name: "Reopen Test",
        visitCount: status === "COMPLETED" ? 1 : 0,
        noShowCount: status === "NO_SHOW" ? 1 : 0,
        totalSpentCents: status === "COMPLETED" ? service.priceCents : 0,
        lastVisitAt: status === "COMPLETED" ? startsAt : null,
      },
    });
    const appointment = await prisma.appointment.create({
      data: {
        barberId: barber.id,
        clientId: client.id,
        serviceId: service.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 70 * 60_000),
        status,
        priceCents: service.priceCents,
        depositCents: 0,
        contactName: "Reopen Test",
        contactEmail: EMAIL,
        manageTokenHash: `reopen-${Date.now()}`,
      },
    });
    return { client, appointment, service };
  }

  /** Mirrors reopenAppointmentAction without the request context it needs. */
  async function reopen(id: string) {
    const appointment = await prisma.appointment.findUniqueOrThrow({
      where: { id },
      select: { clientId: true, priceCents: true, status: true },
    });
    const wasCompleted = appointment.status === "COMPLETED";

    await prisma.appointment.update({ where: { id }, data: { status: "CONFIRMED" } });
    await prisma.client.update({
      where: { id: appointment.clientId },
      data: wasCompleted
        ? {
            visitCount: { decrement: 1 },
            totalSpentCents: { decrement: appointment.priceCents },
          }
        : { noShowCount: { decrement: 1 } },
    });
    if (wasCompleted) {
      const latest = await prisma.appointment.findFirst({
        where: { clientId: appointment.clientId, status: "COMPLETED" },
        orderBy: { startsAt: "desc" },
        select: { startsAt: true },
      });
      await prisma.client.update({
        where: { id: appointment.clientId },
        data: { lastVisitAt: latest?.startsAt ?? null },
      });
    }
  }

  it("takes the no-show off the client's record", async () => {
    const { client, appointment } = await seed("NO_SHOW");
    await reopen(appointment.id);

    const after = await prisma.client.findUniqueOrThrow({ where: { id: client.id } });
    expect(after.noShowCount).toBe(0);
    const reopened = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
    });
    expect(reopened.status).toBe("CONFIRMED");
  });

  it("takes back the visit and the money when undoing a completion", async () => {
    const { client, appointment, service } = await seed("COMPLETED");
    await reopen(appointment.id);

    const after = await prisma.client.findUniqueOrThrow({ where: { id: client.id } });
    expect(after.visitCount).toBe(0);
    expect(after.totalSpentCents).toBe(0);
    expect(service.priceCents).toBeGreaterThan(0);
  });

  /** Otherwise the client list would still claim they were in last week. */
  it("clears the last visit when there is nothing left to point at", async () => {
    const { client, appointment } = await seed("COMPLETED");
    await reopen(appointment.id);

    const after = await prisma.client.findUniqueOrThrow({ where: { id: client.id } });
    expect(after.lastVisitAt).toBeNull();
  });
});
