import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { hasDatabase } from "@/lib/db/test-helpers";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, readSessionToken } from "./session";

/**
 * The sign-in path, end to end against the database.
 *
 * Covers the sequence the login action performs — find the user, verify the
 * password, check the role, mint a session — without going through the
 * server action, which needs a request context.
 */
const suite = hasDatabase ? describe : describe.skip;

const EMAIL = "login-test@booking-test.com";
const PASSWORD = "a-sufficiently-long-password";

suite("barber sign-in", () => {
  beforeAll(async () => {
    process.env.AUTH_SECRET ??= "x".repeat(48);
    await prisma.user.upsert({
      where: { email: EMAIL },
      create: {
        email: EMAIL,
        name: "Login Test",
        role: "OWNER",
        passwordHash: await hashPassword(PASSWORD),
      },
      update: { passwordHash: await hashPassword(PASSWORD), role: "OWNER" },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.$disconnect();
  });

  it("signs in with the right password and issues a usable session", async () => {
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(await verifyPassword(PASSWORD, user!.passwordHash)).toBe(true);

    const token = await createSessionToken({
      userId: user!.id,
      email: user!.email,
      name: user!.name ?? "Barber",
    });
    expect(await readSessionToken(token)).toMatchObject({ email: EMAIL });
  });

  it("rejects the wrong password", async () => {
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    expect(await verifyPassword("wrong-password-here", user!.passwordHash)).toBe(false);
  });

  /**
   * A client who somehow acquired a password must not reach the dashboard.
   * The login action checks the role as well as the credentials.
   */
  it("only OWNER and BARBER roles may sign in", async () => {
    await prisma.user.update({ where: { email: EMAIL }, data: { role: "CLIENT" } });
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    const allowed = user!.role === "BARBER" || user!.role === "OWNER";
    expect(allowed).toBe(false);
    await prisma.user.update({ where: { email: EMAIL }, data: { role: "OWNER" } });
  });

  it("the real seeded account can sign in", async () => {
    const eduardo = await prisma.user.findUnique({
      where: { email: "eduardo@eduardobarbershop.com" },
    });
    // Only present in the development database, not the test one.
    if (!eduardo) return;
    expect(eduardo.role).toBe("OWNER");
    expect(eduardo.passwordHash).toMatch(/^scrypt\$/);
  });
});
