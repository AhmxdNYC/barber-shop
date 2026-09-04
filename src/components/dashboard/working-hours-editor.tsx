"use client";

import { useActionState } from "react";
import { saveWorkingHoursAction, type ActionState } from "@/app/actions/availability";
import { minutesToTimeInput } from "@/lib/shop";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type HoursRow = {
  dayOfWeek: number;
  opensAtMinutes: number;
  closesAtMinutes: number;
  isClosed: boolean;
};

/**
 * One row per weekday, each its own form.
 *
 * Separate forms rather than one big save: a barber changing Thursday should
 * not have to re-submit the whole week, and a validation error on one day
 * should not block the rest.
 */
export function WorkingHoursEditor({
  barberId,
  rows,
}: {
  barberId: string;
  rows: HoursRow[];
}) {
  return (
    <div className="overflow-hidden rounded-[3px] border border-line">
      {DAYS.map((label, dayOfWeek) => {
        const row = rows.find((r) => r.dayOfWeek === dayOfWeek);
        return (
          <DayRow
            key={dayOfWeek}
            barberId={barberId}
            dayOfWeek={dayOfWeek}
            label={label}
            row={row}
          />
        );
      })}
    </div>
  );
}

function DayRow({
  barberId,
  dayOfWeek,
  label,
  row,
}: {
  barberId: string;
  dayOfWeek: number;
  label: string;
  row?: HoursRow;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveWorkingHoursAction,
    {},
  );

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 last:border-b-0"
    >
      <input type="hidden" name="barberId" value={barberId} />
      <input type="hidden" name="dayOfWeek" value={dayOfWeek} />

      <span className="w-24 shrink-0 text-sm font-semibold">{label}</span>

      <input
        type="time"
        name="opensAt"
        defaultValue={minutesToTimeInput(row?.opensAtMinutes ?? 600)}
        className={TIME_INPUT}
      />
      <span className="text-bone-3">to</span>
      <input
        type="time"
        name="closesAt"
        defaultValue={minutesToTimeInput(row?.closesAtMinutes ?? 1170)}
        className={TIME_INPUT}
      />

      <label className="flex items-center gap-2 text-sm text-bone-2">
        <input
          type="checkbox"
          name="isClosed"
          defaultChecked={row?.isClosed ?? false}
          className="h-4 w-4 accent-[var(--color-accent)]"
        />
        Closed
      </label>

      <button
        type="submit"
        disabled={pending}
        className="ml-auto rounded-[3px] border border-line-strong px-3 py-1.5 text-xs font-semibold transition-colors hover:border-bone-3 disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save"}
      </button>

      {state.error && (
        <span role="alert" className="w-full text-xs text-accent">{state.error}</span>
      )}
      {state.ok && <span className="w-full text-xs text-brass">{state.ok}</span>}
    </form>
  );
}

const TIME_INPUT =
  "rounded-[3px] border border-line bg-surface-2 px-2.5 py-1.5 text-sm tabular-nums text-bone focus:border-bone-3 focus:outline-none";
