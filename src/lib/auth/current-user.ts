import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSessionToken, type SessionPayload } from "./session";

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
  return user;
}
