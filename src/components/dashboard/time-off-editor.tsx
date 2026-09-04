"use client";

import { useActionState } from "react";
import {
  addTimeOffAction,
  deleteTimeOffAction,
  type ActionState,
} from "@/app/actions/availability";

export type TimeOffRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

/**
 * One-off blocks: vacation, an appointment, closing early.
 *
 * Adding time off never cancels existing bookings. Silently dropping
 * someone's haircut is worse than telling the barber there is a clash and
 * letting him decide — so the action reports the number of appointments
 * caught in the window instead.
 */
export function TimeOffEditor({
  barberId,
  rows,
  timeZone,
  defaultStart,
}: {
  barberId: string;
  rows: TimeOffRow[];
  timeZone: string;
  defaultStart: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addTimeOffAction,
    {},
  );

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div>
      <form action={action} className="rounded-[3px] border border-line bg-surface p-4">
        <input type="hidden" name="barberId" value={barberId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>From</span>
            <input type="datetime-local" name="start" defaultValue={defaultStart} className={INPUT} required />
          </label>
          <label className="block">
            <span className={LABEL}>Until</span>
            <input type="datetime-local" name="end" defaultValue={defaultStart} className={INPUT} required />
          </label>
          <label className="block sm:col-span-2">
            <span className={LABEL}>Reason</span>
            <input name="reason" placeholder="Vacation, appointment, closing early" className={INPUT} />
          </label>
        </div>

        {state.error && <p role="alert" className="mt-3 text-sm text-accent">{state.error}</p>}
        {state.ok && <p className="mt-3 text-sm text-brass">{state.ok}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-[3px] bg-accent px-5 py-2 text-sm font-semibold text-bone transition-colors hover:bg-accent-bright disabled:opacity-40"
        >
          {pending ? "Adding…" : "Add time off"}
        </button>
      </form>

      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-[3px] border border-line">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 bg-surface px-4 py-3 text-sm">
              <span>
                <span className="font-semibold tabular-nums">
                  {fmt.format(row.startsAt)} &ndash; {fmt.format(row.endsAt)}
                </span>
                {row.reason && <span className="ml-2 text-bone-2">{row.reason}</span>}
              </span>
              <form action={deleteTimeOffAction}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" className="text-xs text-bone-3 hover:text-accent">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const LABEL = "mb-1 block text-xs uppercase tracking-[0.1em] text-bone-3";
const INPUT =
  "w-full rounded-[3px] border border-line bg-surface-2 px-3 py-2 text-sm text-bone focus:border-bone-3 focus:outline-none";
