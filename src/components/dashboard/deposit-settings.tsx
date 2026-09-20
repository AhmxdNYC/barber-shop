"use client";

import { useActionState, useState } from "react";
import {
  updateDepositsAction,
  type DepositState,
} from "@/app/actions/deposits";
import { Button } from "@/components/ui/button";

/**
 * The deposit switch.
 *
 * Deliberately blunt about what it does. Turning this on changes what a
 * client meets at the end of booking — a card form instead of a
 * confirmation — and that is the kind of change a barber should make on
 * purpose, having read a sentence about it, rather than by flipping
 * something labelled "deposits".
 */
export function DepositSettings({
  enabled,
  amountCents,
  priceCents,
  connected,
  testMode,
}: {
  enabled: boolean;
  amountCents: number;
  priceCents: number;
  /** Whether Stripe keys are present at all. */
  connected: boolean;
  testMode: boolean;
}) {
  const [on, setOn] = useState(enabled);
  const [amount, setAmount] = useState((amountCents / 100).toFixed(2));
  const [state, action, pending] = useActionState<DepositState, FormData>(
    updateDepositsAction,
    {},
  );

  const dollars = Number(amount) || 0;
  const balance = Math.max(priceCents / 100 - dollars, 0);
  // Stripe's US card rate. Worth showing on the amount being set, because
  // the percentage on a small deposit is not the one people have in mind.
  const fee = dollars > 0 ? dollars * 0.029 + 0.3 : 0;

  return (
    <form action={action}>
      <input type="hidden" name="enabled" value={on ? "on" : "off"} />

      {!connected && (
        <p className="mb-4 rounded-[3px] border border-line bg-surface-2 px-4 py-3 text-sm text-bone-2">
          Stripe is not connected yet. Deposits stay off until the keys are
          in place &mdash; bookings confirm straight away in the meantime.
        </p>
      )}

      {connected && testMode && (
        <p className="mb-4 rounded-[3px] border border-off/45 bg-off-dim px-4 py-3 text-sm text-off">
          Test mode. Cards are fake, nothing is charged and no money arrives.
          Use 4242 4242 4242 4242 with any future date to try it.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={!connected}
          onClick={() => setOn((v) => !v)}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-40 ${
            on ? "border-brass bg-brass-dim" : "border-line bg-surface-2"
          }`}
        >
          <span
            className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all ${
              on ? "left-6 bg-brass" : "left-0.5 bg-bone-3"
            }`}
          />
        </button>
        <span className="text-sm">
          {on ? "Deposits on" : "Deposits off"}
          <span className="ml-2 text-bone-3">
            {on
              ? "clients pay part now, the rest in the shop"
              : "online bookings confirm straight away"}
          </span>
        </span>
      </div>

      <label className="mt-5 block max-w-xs">
        <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-bone-3">
          Deposit
        </span>
        <div className="flex items-center gap-2">
          <span className="text-bone-3">$</span>
          <input
            name="depositCents"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-[3px] border border-line bg-surface-2 px-3 py-2 text-sm tabular-nums text-bone focus:border-bone-3 focus:outline-none"
          />
        </div>
      </label>

      {dollars > 0 && (
        <p className="mt-3 text-sm text-bone-3">
          On an adult cut: <span className="text-bone-2">${dollars.toFixed(2)}</span>{" "}
          online, <span className="text-bone-2">${balance.toFixed(2)}</span> in
          the chair. Stripe takes{" "}
          <span className="tabular-nums text-bone-2">${fee.toFixed(2)}</span> of
          the deposit.
        </p>
      )}

      {state.error && (
        <p role="alert" className="mt-4 rounded-[3px] border border-danger bg-danger-dim px-4 py-2.5 text-sm">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-4 rounded-[3px] border border-brass bg-brass-dim px-4 py-2.5 text-sm">
          {state.ok}
        </p>
      )}

      <Button type="submit" className="mt-5" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
