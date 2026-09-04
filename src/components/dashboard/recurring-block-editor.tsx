"use client";

import { useActionState } from "react";
import {
  addRecurringBlockAction,
  deleteRecurringBlockAction,
  type ActionState,
} from "@/app/actions/availability";
import { minutesToTimeInput } from "@/lib/shop";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type BlockRow = {
  id: string;
  dayOfWeek: number;
  startAtMinutes: number;
  endAtMinutes: number;
  label: string;
};

/** Repeating gaps in the week — lunch, a standing commitment. */
export function RecurringBlockEditor({
  barberId,
  rows,
}: {
  barberId: string;
  rows: BlockRow[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addRecurringBlockAction,
    {},
  );

  return (
    <div>
      <form action={action} className="rounded-[3px] border border-line bg-surface p-4">
        <input type="hidden" name="barberId" value={barberId} />
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className={LABEL}>Day</span>
            <select name="dayOfWeek" className={INPUT} defaultValue="2">
              {DAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL}>From</span>
            <input type="time" name="startAt" defaultValue="12:00" className={INPUT} required />
          </label>
          <label className="block">
            <span className={LABEL}>Until</span>
            <input type="time" name="endAt" defaultValue="13:00" className={INPUT} required />
          </label>
          <label className="block">
            <span className={LABEL}>Label</span>
            <input name="label" defaultValue="Lunch" className={INPUT} required />
          </label>
        </div>

        {state.error && <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="mt-3 text-sm text-brass">{state.ok}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-[3px] border border-line-strong px-5 py-2 text-sm font-semibold transition-colors hover:border-bone-3 disabled:opacity-40"
        >
          {pending ? "Adding…" : "Add block"}
        </button>
      </form>

      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-[3px] border border-line">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 bg-surface px-4 py-3 text-sm">
              <span>
                <span className="font-semibold">{DAYS[row.dayOfWeek]}</span>
                <span className="ml-2 tabular-nums text-bone-2">
                  {minutesToTimeInput(row.startAtMinutes)}&ndash;{minutesToTimeInput(row.endAtMinutes)}
                </span>
                <span className="ml-2 text-bone-3">{row.label}</span>
              </span>
              <form action={deleteRecurringBlockAction}>
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
