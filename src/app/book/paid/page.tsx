import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { hasDatabaseUrl } from "@/lib/db/available";
import { SHOP, formatPrice } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Deposit paid",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Where Stripe sends the client back to.
 *
 * This page reports; it does not decide. Confirmation happens in the
 * webhook, because this URL is one anybody could type and the browser
 * returning here proves nothing about whether money moved.
 *
 * The webhook is usually here first, but not always, so a booking still
 * showing as pending is described as pending rather than as a failure.
 */
export default async function DepositPaidPage({
  searchParams,
}: {
  searchParams: Promise<{ appointment?: string }>;
}) {
  const { appointment: id } = await searchParams;

  const settings = hasDatabaseUrl
    ? await prisma.shopSettings.findUnique({
        where: { id: 1 },
        select: { timezone: true },
      })
    : null;
  const timeZone = settings?.timezone ?? "America/New_York";

  const appointment =
    hasDatabaseUrl && id
      ? await prisma.appointment.findUnique({
          where: { id },
          select: {
            status: true,
            priceCents: true,
            depositCents: true,
            startsAt: true,
            barber: { select: { name: true } },
            service: { select: { name: true } },
          },
        })
      : null;

  const confirmed = appointment?.status === "CONFIRMED";
  const balanceCents = appointment
    ? Math.max(appointment.priceCents - appointment.depositCents, 0)
    : 0;

  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <span className="eyebrow">{confirmed ? "You're booked" : "Payment received"}</span>
      <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
        {confirmed ? "That's the chair yours." : "Thanks — just finishing up."}
      </h1>

      {appointment ? (
        <>
          <p className="mt-4 text-bone-2">
            {appointment.service.name} with {appointment.barber.name},{" "}
            {new Intl.DateTimeFormat("en-US", {
              timeZone,
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }).format(appointment.startsAt)}
            .
          </p>

          {balanceCents > 0 && (
            <p className="mt-5 rounded-[3px] border border-line bg-surface px-4 py-3 text-bone-2">
              <span className="font-semibold text-bone">
                {formatPrice(balanceCents)} to pay in the shop.
              </span>{" "}
              Your {formatPrice(appointment.depositCents)} deposit comes off
              the price — it is not on top of it.
            </p>
          )}

          {confirmed ? (
            <p className="mt-5 text-bone-2">
              Your confirmation is on its way by email, with a link to cancel
              if something changes.
            </p>
          ) : (
            <p className="mt-5 text-bone-2">
              Your payment went through and we&rsquo;re waiting on the last
              word from the card network — usually seconds. The confirmation
              email lands when it arrives; nothing more is needed from you.
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-bone-2">
          Your payment went through. If the confirmation email has not arrived
          in a few minutes, call the shop on {SHOP.phone} and we&rsquo;ll sort
          it out.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-[3px] border border-line-strong px-4 py-2.5 text-sm font-semibold transition-colors hover:border-bone-3"
        >
          Back to the shop
        </Link>
        <a
          href={`tel:${SHOP.phone.replace(/[^\d+]/g, "")}`}
          className="rounded-[3px] border border-line px-4 py-2.5 text-sm font-semibold text-bone-2 transition-colors hover:border-line-strong hover:text-bone"
        >
          Call {SHOP.phone}
        </a>
      </div>
    </div>
  );
}
