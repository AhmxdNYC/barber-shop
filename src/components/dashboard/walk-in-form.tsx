"use client";

import { useActionState, useState } from "react";
import { createWalkInAction, type WalkInState } from "@/app/actions/appointments";
import { BARBERS, SERVICES, formatPrice } from "@/lib/shop";
import { Button } from "@/components/ui/button";

/**
 * Adds someone who walked in or phoned.
 *
 * Collapsed by default: the day view is for reading between cuts, and this
 * is only needed when someone is actually standing there.
 */
export function WalkInForm({ defaultStart }: { defaultStart: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<WalkInState, FormData>(
    createWalkInAction,
    {},
  );

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        + Add walk-in
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-[3px] border border-line bg-surface p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Add a booking</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-bone-3 hover:text-bone"
        >
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Barber">
          <select name="barberSlug" className={SELECT} defaultValue={BARBERS[0].slug}>
            {BARBERS.map((b) => (
              <option key={b.slug} value={b.slug}>{b.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Service">
          <select name="serviceSlug" className={SELECT} defaultValue={SERVICES[0].slug}>
            {SERVICES.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name} — {formatPrice(s.priceCents)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Start">
          <input type="datetime-local" name="start" defaultValue={defaultStart} className={SELECT} required />
        </Field>

        <Field label="How they booked">
          <select name="source" className={SELECT} defaultValue="WALK_IN">
            <option value="WALK_IN">Walk-in</option>
            <option value="PHONE">Phone</option>
          </select>
        </Field>

        <Field label="Name">
          <input name="name" className={SELECT} required minLength={2} placeholder="Client name" />
        </Field>

        <Field label="Email">
          <input type="email" name="email" className={SELECT} required placeholder="For their reminder" />
        </Field>

        <Field label="Phone">
          <input type="tel" name="phone" className={SELECT} placeholder="Optional" />
        </Field>
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-[3px] border border-accent bg-accent-dim px-4 py-2.5 text-sm">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-4 rounded-[3px] border border-brass-dim bg-brass-dim px-4 py-2.5 text-sm text-brass">
          Added to the day.
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-4">
        {pending ? "Adding…" : "Add to the day"}
      </Button>
    </form>
  );
}

const SELECT =
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
