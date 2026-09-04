"use client";

import { useActionState, useState } from "react";
import { createWalkInAction, type WalkInState } from "@/app/actions/appointments";
import { BARBERS, SERVICES, formatPrice } from "@/lib/shop";
import { Button } from "@/components/ui/button";

/**
 * Adds someone who walked in or phoned.
 *
 * Collapsed by default: the day view is for reading between cuts, and this
 * is only needed when someone is standing there. On success it closes itself
 * and confirms — leaving the filled-in form open made it look like the
 * booking had not gone through, and invited adding the same person twice.
 */
export function WalkInForm({ defaultStart }: { defaultStart: string }) {
  const [wantOpen, setWantOpen] = useState(false);
  const [state, action, pending] = useActionState<WalkInState, FormData>(
    createWalkInAction,
    {},
  );

  /**
   * Which success message has already been acknowledged.
   *
   * useActionState returns a fresh object per run, so comparing identity
   * distinguishes "just succeeded" from "succeeded earlier and the barber
   * has since reopened the form". Deriving the panel's visibility this way
   * avoids syncing two pieces of state through an effect.
   */
  const [acknowledged, setAcknowledged] = useState<WalkInState | null>(null);

  const justAdded = state.ok === true && state !== acknowledged;
  const open = wantOpen && !justAdded;

  function reopen() {
    setAcknowledged(state);
    setWantOpen(true);
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={reopen}>
          + Add walk-in
        </Button>
        {justAdded && (
          <span
            role="status"
            className="rounded-[3px] border border-brass-dim bg-brass-dim px-3 py-1.5 text-sm text-brass"
          >
            Added to the day.
          </span>
        )}
      </div>
    );
  }

  return (
    <form
      action={action}
      className="w-full rounded-[3px] border border-line bg-surface p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Add a booking</h3>
        <button
          type="button"
          onClick={() => setWantOpen(false)}
          className="text-sm text-bone-3 hover:text-bone"
        >
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Barber">
          <select name="barberSlug" className={INPUT} defaultValue={BARBERS[0].slug}>
            {BARBERS.map((b) => (
              <option key={b.slug} value={b.slug}>{b.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Service">
          <select name="serviceSlug" className={INPUT} defaultValue={SERVICES[0].slug}>
            {SERVICES.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name} — {formatPrice(s.priceCents)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Start">
          <input type="datetime-local" name="start" defaultValue={defaultStart} className={INPUT} required />
        </Field>

        <Field label="How they booked">
          <select name="source" className={INPUT} defaultValue="WALK_IN">
            <option value="WALK_IN">Walk-in</option>
            <option value="PHONE">Phone</option>
          </select>
        </Field>

        <Field label="Name">
          <input name="name" className={INPUT} required minLength={2} placeholder="Client name" />
        </Field>

        <Field label="Email">
          <input type="email" name="email" className={INPUT} required placeholder="For their reminder" />
        </Field>

        <Field label="Phone">
          <input type="tel" name="phone" className={INPUT} required placeholder="In case you need to call" />
        </Field>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-[3px] border border-danger bg-danger-dim px-4 py-2.5 text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-4">
        {pending ? "Adding…" : "Add to the day"}
      </Button>
    </form>
  );
}

const INPUT =
  "w-full rounded-[3px] border border-line bg-surface-2 px-3 py-2.5 text-sm text-bone focus:border-bone-3 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-bone-3">
        {label}
      </span>
      {children}
    </label>
  );
}
