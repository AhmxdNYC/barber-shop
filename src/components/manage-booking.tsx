"use client";

import { useActionState } from "react";
import {
  cancelByTokenAction,
  type CancelState,
  type ManagedBooking,
} from "@/app/actions/manage-booking";
import { formatPrice } from "@/lib/shop";
import { Button, ButtonLink } from "@/components/ui/button";
import { useState } from "react";

export function ManageBooking({
  booking,
  token,
  shopPhone,
}: {
  booking: ManagedBooking;
  token: string;
  shopPhone: string;
}) {
  const [state, action, pending] = useActionState<CancelState, FormData>(
    cancelByTokenAction,
    {},
  );
  const [confirming, setConfirming] = useState(false);

  const when = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(booking.startsAt);

  if (state.cancelled || booking.status === "CANCELLED") {
    return (
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Booking cancelled
        </h1>
        <p className="mt-3 text-bone-2">
          That slot is free again. Book another time whenever you like.
        </p>
        <ButtonLink href="/book" className="mt-8">
          Book again
        </ButtonLink>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Your booking
      </h1>

      <dl className="mt-6 divide-y divide-line rounded-[3px] border border-line bg-surface">
        <Row label="When" value={when} />
        <Row label="Service" value={booking.serviceName} />
        <Row label="Barber" value={booking.barberName} />
        <Row label="Name" value={booking.contactName} />
        <Row label="Price" value={formatPrice(booking.priceCents)} />
      </dl>

      {state.error && (
        <p role="alert" className="mt-4 rounded-[3px] border border-accent bg-accent-dim px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      {booking.canCancel ? (
        <div className="mt-8">
          {!confirming ? (
            <Button variant="outline" onClick={() => setConfirming(true)}>
              Cancel this booking
            </Button>
          ) : (
            /* A form POST, never a link — mail scanners follow links. */
            <form action={action} className="rounded-[3px] border border-line bg-surface p-5">
              <p className="text-sm text-bone-2">
                Cancel your {booking.serviceName} on {when}?
              </p>
              <input type="hidden" name="token" value={token} />
              <div className="mt-4 flex gap-3">
                <Button type="submit" disabled={pending}>
                  {pending ? "Cancelling…" : "Yes, cancel it"}
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Keep it
                </Button>
              </div>
            </form>
          )}
          <p className="mt-4 text-sm text-bone-3">
            Free to cancel more than {booking.cancellationWindowHours} hours
            ahead. Need to change the time? Call the shop on {shopPhone}.
          </p>
        </div>
      ) : (
        <p className="mt-8 text-sm text-bone-3">
          This booking can no longer be changed online. Call the shop on{" "}
          {shopPhone}.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3 text-sm">
      <dt className="text-bone-3">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
