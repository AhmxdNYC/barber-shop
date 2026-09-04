import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { consumeMagicLink } from "@/lib/auth/magic-link";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  STAFF_HINT_COOKIE,
  STAFF_HINT_COOKIE_OPTIONS,
  createSessionToken,
} from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

/**
 * Completes a sign-in link.
 *
 * The token is consumed here — a link works once, so one left in browser
 * history or followed by a mail scanner cannot sign anyone in later.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const account = token ? await consumeMagicLink(token) : null;

  if (account) {
    const session = await createSessionToken(account);
    const store = await cookies();
    store.set(SESSION_COOKIE, session, SESSION_COOKIE_OPTIONS);
    store.set(STAFF_HINT_COOKIE, "1", STAFF_HINT_COOKIE_OPTIONS);
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md px-5 py-24">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        That link didn&rsquo;t work
      </h1>
      <p className="mt-3 text-bone-2">
        Sign-in links expire after 15 minutes and work only once. Request a
        fresh one.
      </p>
      <Link
        href="/login"
        className="mt-8 inline-block rounded-[3px] bg-accent px-6 py-3 text-sm font-semibold text-bone transition-colors hover:bg-accent-bright"
      >
        Back to sign in
      </Link>
    </div>
  );
}
