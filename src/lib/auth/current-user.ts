import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  STAFF_HINT_COOKIE,
  STAFF_HINT_COOKIE_OPTIONS,
  createSessionToken,
  readSessionToken,
  type SessionPayload,
} from "./session";

/** The signed-in barber, or null. */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Guards a barber-only page.
 *
 * Middleware already redirects unauthenticated requests, but this runs the
 * check again at the point the data is actually read. Middleware can be
 * bypassed by configuration mistakes; a check next to the query cannot.
 */
export async function requireBarber(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Roll the session forward, so a barber who opens the dashboard during any
  // given month never has to sign in again. Without this the cookie would
  // expire on a fixed date regardless of use, and he would be locked out
  // mid-shift for no reason.
  await refreshSession(user);

  return user;
}

async function refreshSession(user: SessionPayload): Promise<void> {
  try {
    const token = await createSessionToken(user);
    const store = await cookies();
    store.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    store.set(STAFF_HINT_COOKIE, "1", STAFF_HINT_COOKIE_OPTIONS);
  } catch {
    // Refresh is a convenience; a failure here must never block the page.
  }
}
