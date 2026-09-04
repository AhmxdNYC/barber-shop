"use client";

import { useActionState, useState } from "react";
import {
  recoverBookingLinkAction,
  type RecoverState,
} from "@/app/actions/manage-booking";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";

export function RecoverBookingForm({ shopPhone }: { shopPhone: string }) {
  const [state, action, pending] = useActionState<RecoverState, FormData>(
    recoverBookingLinkAction,
    {},
  );
  const [email, setEmail] = useState("");

  if (state.sent) {
    return (
      <div className="mt-8 rounded-[3px] border border-line bg-surface p-6">
        <p className="text-bone">
          If we have a booking for that address, the link is on its way.
        </p>
        <p className="mt-3 text-sm text-bone-3">
          It replaces any earlier link, so use the newest email. Nothing
          arrived? Call the shop on {shopPhone}.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 grid gap-4">
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        placeholder="The address you booked with"
      />
      <input type="hidden" name="email" value={email} />

      {state.error && (
        <p role="alert" className="rounded-[3px] border border-accent bg-accent-dim px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending || !email}>
        {pending ? "Sending…" : "Send me the link"}
      </Button>
    </form>
  );
}
