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
import {
  MAGIC_LINK_LIMITS,
  isMagicLinkRateLimited,
  issueMagicLink,
} from "@/lib/auth/magic-link";
import { sendBarberSignInLink } from "@/lib/notifications/send";

const Credentials = z.object({
  email: z.string().email().max(200),
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
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Verify even when the user is missing, so the response time does not
  // reveal whether the address exists.
  const ok = await verifyPassword(password, user?.passwordHash ?? null);

  if (!user || !ok || (user.role !== "BARBER" && user.role !== "OWNER")) {
    return { error: "That email and password do not match." };
  }

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


export type MagicLinkState = { sent?: boolean; error?: string };

/**
 * Emails a sign-in link.
 *
 * The answer is the same whether or not the address belongs to a barber, so
 * this cannot be used to discover who works at the shop.
 */
export async function requestMagicLinkAction(
  _previous: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = z
    .object({ email: z.string().trim().email().max(200) })
    .safeParse({ email: formData.get("email") });

  if (!parsed.success) return { sent: true };

  const email = parsed.data.email.toLowerCase();

  if (await isMagicLinkRateLimited(email)) {
    return { error: "Too many sign-in links requested. Try again shortly." };
  }

  const issued = await issueMagicLink(email);
  if (issued) {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    await sendBarberSignInLink(email, {
      name: issued.name,
      url: `${base}/login/verify?token=${issued.token}`,
      expiryMinutes: MAGIC_LINK_LIMITS.EXPIRY_MINUTES,
    });
  }

  return { sent: true };
}
