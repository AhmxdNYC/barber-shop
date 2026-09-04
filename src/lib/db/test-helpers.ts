import { prisma } from "./client";

/**
 * Integration-test helpers.
 *
 * Suites share one database, so nothing here truncates reference data. Tests
 * clean up only the rows they create, which keeps them order-independent —
 * a suite that truncated Barber once destroyed the seed a later suite relied
 * on, and the failure only appeared on the *second* run.
 */

const url = process.env.DATABASE_URL ?? "";

export const hasDatabase = Boolean(url);

if (url && !/_test(\?|$)/.test(url)) {
  throw new Error(
    `Refusing to run integration tests against "${url}".\n` +
      "These tests write and delete rows. Point DATABASE_URL at a database " +
      "whose name ends in _test (see .env.test).",
  );
}

/** Removes only what a test created. Safe to call between tests. */
export async function clearAppointments() {
  await prisma.payment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.appointment.deleteMany();
}

/** A client row to hang test appointments off, created on demand. */
export async function ensureTestClient(email = "test@example.com") {
  return prisma.client.upsert({
    where: { email },
    create: { email, name: "Test Client" },
    update: {},
  });
}

export async function barberIdBySlug(slug: string): Promise<string> {
  const barber = await prisma.barber.findUnique({ where: { slug } });
  if (!barber) throw new Error(`Seed is missing barber "${slug}".`);
  return barber.id;
}

export async function serviceIdBySlug(slug: string): Promise<string> {
  const service = await prisma.service.findUnique({ where: { slug } });
  if (!service) throw new Error(`Seed is missing service "${slug}".`);
  return service.id;
}
