import Link from "next/link";
import { requireBarber } from "@/lib/auth/current-user";
import { DeviceLink } from "@/components/dashboard/device-link";
import { logoutAction } from "@/app/actions/auth";

export default async function SettingsPage() {
  const barber = await requireBarber();

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <span className="eyebrow">Account</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
        Settings
      </h1>
      <p className="mt-2 text-bone-2">Signed in as {barber.email}.</p>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold">Poster for the shop</h2>
        <p className="mt-1 max-w-xl text-sm text-bone-3">
          A printable sheet with a code clients scan to book. Put it on the
          window, the mirror or the counter — any phone camera opens it, with
          no app to install.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/poster"
            className="rounded-[3px] bg-bone px-5 py-2.5 text-sm font-semibold text-ground transition-colors hover:bg-white"
          >
            Open the poster
          </Link>
          <span className="text-sm text-bone-3">
            Scan a printed copy before running off a stack.
          </span>
        </div>
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-xl font-bold">Your devices</h2>
        <p className="mt-1 max-w-xl text-sm text-bone-3">
          You stay signed in for a month on each device you use, so this is
          rarely needed &mdash; only when adding a new phone or tablet.
        </p>
        <div className="mt-4">
          <DeviceLink />
        </div>
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="font-display text-xl font-bold">Sign out</h2>
        <p className="mt-1 max-w-xl text-sm text-bone-3">
          Ends the session on this device only. If a phone is lost, sign out
          from it if you can &mdash; otherwise rotate AUTH_SECRET, which ends
          every session everywhere.
        </p>
        <form action={logoutAction} className="mt-4">
          <button
            type="submit"
            className="rounded-[3px] border border-line-strong px-5 py-2.5 text-sm font-semibold transition-colors hover:border-danger hover:text-danger"
          >
            Sign out of this device
          </button>
        </form>
      </section>
    </div>
  );
}
