"use client";

import { useActionState } from "react";
import { saveShopHoursAction, type ActionState } from "@/app/actions/availability";
import { minutesToTimeInput } from "@/lib/shop";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type ShopHoursRow = {
  dayOfWeek: number;
  opensAtMinutes: number;
  closesAtMinutes: number;
  isClosed: boolean;
};

/**
 * When the shop itself is open.
 *
 * Nothing can be booked outside these times, whatever a barber's own hours
 * say — so marking a day closed here shuts the whole shop without editing
 * four separate schedules. These are also the hours the website advertises.
 */
export function ShopHoursEditor({ rows }: { rows: ShopHoursRow[] }) {
  return (
    <div className="overflow-hidden rounded-[3px] border border-line">
      {DAYS.map((label, dayOfWeek) => (
        <ShopDayRow
          key={dayOfWeek}
          dayOfWeek={dayOfWeek}
          label={label}
          row={rows.find((r) => r.dayOfWeek === dayOfWeek)}
        />
      ))}
    </div>
  );
}

function ShopDayRow({
  dayOfWeek,
  label,
  row,
}: {
  dayOfWeek: number;
  label: string;
  row?: ShopHoursRow;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveShopHoursAction,
    {},
  );

  return (
    <form
      action={action}
      className={`flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 last:border-b-0 ${
        row?.isClosed ? "opacity-60" : ""
      }`}
    >
      <input type="hidden" name="dayOfWeek" value={dayOfWeek} />
      <span className="w-24 shrink-0 text-sm font-semibold">{label}</span>

      <input
        type="time"
        name="opensAt"
        defaultValue={minutesToTimeInput(row?.opensAtMinutes ?? 600)}
        className={TIME}
      />
      <span className="text-bone-3">to</span>
      <input
        type="time"
        name="closesAt"
        defaultValue={minutesToTimeInput(row?.closesAtMinutes ?? 1170)}
        className={TIME}
      />

      <label className="flex items-center gap-2 text-sm text-bone-2">
        <input
          type="checkbox"
          name="isClosed"
          defaultChecked={row?.isClosed ?? false}
          className="h-4 w-4 accent-[var(--color-accent)]"
        />
        Shop closed
      </label>

      <button
        type="submit"
        disabled={pending}
        className="ml-auto rounded-[3px] border border-line-strong px-3 py-1.5 text-xs font-semibold transition-colors hover:border-bone-3 disabled:opacity-40"
      >
        {pending ? "Saving…" : "Save"}
      </button>

      {state.error && <span role="alert" className="w-full text-xs text-danger">{state.error}</span>}
      {state.ok && <span className="w-full text-xs text-brass">{state.ok}</span>}
    </form>
  );
}

const TIME =
  "rounded-[3px] border border-line bg-surface-2 px-2.5 py-1.5 text-sm tabular-nums text-bone focus:border-bone-3 focus:outline-none";
