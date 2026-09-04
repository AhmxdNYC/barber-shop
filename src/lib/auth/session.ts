import { SignJWT, jwtVerify } from "jose";

/**
 * Barber sessions.
 *
 * A signed JWT in an httpOnly cookie rather than a session table: there is
 * one barber, sessions are short, and nothing here needs server-side
 * revocation that changing the secret would not also achieve.
 *
 * `jose` is used rather than node:crypto because this must also verify
 * inside Next middleware, which runs on the edge runtime where node:crypto
 * is not fully available.
 */
export const SESSION_COOKIE = "barbershop_session";

/**
 * Thirty days, refreshed on every dashboard visit.
 *
 * The original twelve hours meant the barber typed a password every single
 * morning, which is exactly the kind of friction that ends with him not
 * opening the app. A rolling month means he signs in about as often as he
 * changes his phone, and stays signed in as long as he keeps using it.
 *
 * The trade is that a lost phone stays signed in until the cookie expires
 * or the secret is rotated. For a dashboard on a barber's own phone that is
 * the right balance; "Sign out" is there when it is not.
 */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set to at least 32 characters. " +
        "Generate one with: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(value);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function readSessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    // Expired, tampered with, or signed by a rotated secret.
    return null;
  }
}

/**
 * A cosmetic marker that a barber session exists.
 *
 * The session itself is httpOnly, so client JavaScript cannot see it — which
 * is correct, and also means a statically-rendered page has no way to know
 * whether to offer a "Dashboard" link. Reading the real cookie in the layout
 * would make every public page dynamic, slowing the site for every client to
 * help one barber.
 *
 * This carries no identity, no token and no claim. Forging it shows someone
 * a link, which then redirects them to sign in. It exists purely so the
 * header can render one extra link without giving up static rendering.
 */
export const STAFF_HINT_COOKIE = "barbershop_staff";

export const STAFF_HINT_COOKIE_OPTIONS = {
  httpOnly: false,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
  secure: process.env.NODE_ENV === "production",
};
