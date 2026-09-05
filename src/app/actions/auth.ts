"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  STAFF_HINT_COOKIE,
  STAFF_HINT_COOKIE_OPTIONS,
  createSessionToken,
} from "@/lib/auth/session";
import { isLoginThrottled, recordLoginAttempt } from "@/lib/auth/throttle";

const Credentials = z.object({
  /** An address, or just the part before the @ — see resolveAccount. */
  email: z.string().trim().min(1).max(200),
  password: z.string().min(1).max(200),
  next: z.string().max(200).optional(),
});

export type LoginState = { error?: string };

/**
 * Signs a barber in.
 *
 * Failures are deliberately indistinguishable: an unknown email and a wrong
 * password produce the same message, so this cannot be used to discover
 * which addresses have accounts.
 */
export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = Credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: "Enter an email address and password." };
  }

  const { email, password, next } = parsed.data;

  // Guessing is what breaks a password, so the number of guesses is capped
  // before anything else happens.
  if (await isLoginThrottled(email)) {
    return {
      error: "Too many attempts. Wait a few minutes and try again.",
    };
  }

  const user = await resolveAccount(email);

  // Verify even when the user is missing, so the response time does not
  // reveal whether the address exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? null);

  if (!user || !ok || (user.role !== "BARBER" && user.role !== "OWNER")) {
    await recordLoginAttempt(email, false);
    return { error: "That email and password do not match." };
  }

  await recordLoginAttempt(email, true);

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name ?? "Barber",
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  store.set(STAFF_HINT_COOKIE, "1", STAFF_HINT_COOKIE_OPTIONS);

  redirect(next?.startsWith("/dashboard") ? next : "/dashboard");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(STAFF_HINT_COOKIE);
  redirect("/login");
}

/**
 * Finds an account by address, or by the name in front of the @.
 *
 * "eduardo" is easier to type on a phone than a full address, and a shop
 * with four staff does not need the ceremony. A bare name is only accepted
 * when it matches exactly one account, so it can never quietly sign someone
 * into the wrong one — and only outside production, where the identifier is
 * one of two things an attacker has to supply.
 */
async function resolveAccount(input: string) {
  const value = input.trim().toLowerCase();

  if (value.includes("@")) {
    return prisma.user.findUnique({ where: { email: value } });
  }

  if (process.env.NODE_ENV === "production") return null;

  const matches = await prisma.user.findMany({
    where: { email: { startsWith: `${value}@` } },
    take: 2,
  });
  return matches.length === 1 ? matches[0] : null;
}
