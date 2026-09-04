"use client";

import { useActionState, useState } from "react";
import {
  saveBarberAction,
  toggleBarberAction,
  type BarberState,
} from "@/app/actions/barbers";
import { Button } from "@/components/ui/button";

export type BarberRow = {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  yearsExperience: number;
  isActive: boolean;
  upcomingCount: number;
};

export function BarberEditor({ barbers }: { barbers: BarberRow[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="grid gap-3">
        {barbers.map((barber) => (
          <BarberCard key={barber.id} barber={barber} />
        ))}
      </div>

      <div className="mt-4">
        {adding ? (
          <BarberForm onDone={() => setAdding(false)} />
        ) : (
          <Button variant="outline" onClick={() => setAdding(true)}>
            + Add a barber
          </Button>
        )}
      </div>
    </div>
  );
}

function BarberCard({ barber }: { barber: BarberRow }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <BarberForm barber={barber} onDone={() => setEditing(false)} />;
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-4 rounded-[3px] border border-line bg-surface p-4 ${
        barber.isActive ? "" : "opacity-60"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="font-display font-bold">
          {barber.name}
          {!barber.isActive && (
            <span className="ml-2 text-xs font-normal text-bone-3">hidden</span>
          )}
        </p>
        <p className="text-sm text-accent">{barber.specialty}</p>
        {barber.upcomingCount > 0 && (
          <p className="mt-0.5 text-xs text-bone-3">
            {barber.upcomingCount} upcoming appointment
            {barber.upcomingCount === 1 ? "" : "s"}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-[3px] border border-line-strong px-4 py-2 text-xs font-semibold transition-colors hover:border-bone-3"
      >
        Edit
      </button>

      <form action={toggleBarberAction}>
        <input type="hidden" name="id" value={barber.id} />
        <button
          type="submit"
          className="rounded-[3px] border border-line px-4 py-2 text-xs font-semibold text-bone-3 transition-colors hover:border-bone-3 hover:text-bone"
        >
          {barber.isActive ? "Hide" : "Show"}
        </button>
      </form>
    </div>
  );
}

function BarberForm({
  barber,
  onDone,
}: {
  barber?: BarberRow;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<BarberState, FormData>(
    saveBarberAction,
    {},
  );

  if (state.ok) {
    return (
      <div className="rounded-[3px] border border-brass-dim bg-brass-dim/40 p-4">
        <p className="text-sm text-brass">{state.ok}</p>
        <Button variant="ghost" className="mt-2" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-[3px] border border-line bg-surface p-5">
      {barber && <input type="hidden" name="id" value={barber.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Name</span>
          <input name="name" defaultValue={barber?.name} required minLength={2} className={INPUT} placeholder="Their name" />
        </label>

        <label className="block">
          <span className={LABEL}>Known for</span>
          <input name="specialty" defaultValue={barber?.specialty} required className={INPUT} placeholder="Fades & tapers" />
        </label>

        <label className="block">
          <span className={LABEL}>Years cutting</span>
          <input name="yearsExperience" type="number" min="0" max="70" defaultValue={barber?.yearsExperience ?? 0} className={`${INPUT} tabular-nums`} />
        </label>

        {barber && (
          <label className="flex items-center gap-2 pt-6 text-sm text-bone-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={barber.isActive}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Taking bookings
          </label>
        )}

      </div>

      {state.error && <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p>}

      <div className="mt-4 flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : barber ? "Save" : "Add barber"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>

      {!barber && (
        <p className="mt-3 text-xs text-bone-3">
          They&rsquo;ll start on the shop&rsquo;s opening hours. Adjust their
          own hours on the calendar afterwards.
        </p>
      )}
    </form>
  );
}

const LABEL = "mb-1 block text-[0.65rem] uppercase tracking-[0.1em] text-bone-3";
const INPUT =
  "w-full rounded-[3px] border border-line bg-surface-2 px-3 py-2 text-sm text-bone placeholder:text-bone-3 focus:border-bone-3 focus:outline-none";
