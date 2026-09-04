"use client";

import { useActionState, useEffect, useState } from "react";
import {
  rescheduleByTokenAction,
  rescheduleOptionsAction,
  type RescheduleOption,
  type RescheduleState,
} from "@/app/actions/manage-booking";
import { Button } from "@/components/ui/button";

/** Fourteen days from today, the same horizon the booking flow offers. */
function nextDays(count = 14) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: String(d.getDate()),
    };
  });
}

/**
 * Moving an existing booking.
 *
 * Same barber, same service — only the time changes. The appointment is
 * updated in place rather than cancelled and rebooked, so a client cannot
 * end up with no appointment because someone took the new slot mid-move.
 */
export function ReschedulePanel({
  token,
  onDone,
}: {
  token: string;
  onDone: () => void;
}) {
  const days = nextDays();
  const [date, setDate] = useState(days[0].date);
  const [options, setOptions] = useState<RescheduleOption[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [state, action, pending] = useActionState<RescheduleState, FormData>(
    rescheduleByTokenAction,
    {},
  );

  useEffect(() => {
    let cancelled = false;
    rescheduleOptionsAction(token, date).then((next) => {
      if (!cancelled) setOptions(next);
    });
    return () => {
      cancelled = true;
    };
  }, [token, date]);

  /** Changing the day invalidates the loaded times, so clear them here. */
  function pickDate(next: string) {
    setOptions(null);
    setChosen(null);
    setDate(next);
  }

  useEffect(() => {
    if (state.moved) onDone();
  }, [state.moved, onDone]);

  return (
    <form action={action} className="mt-4 rounded-[3px] border border-line bg-surface p-5">
      <input type="hidden" name="token" value={token} />
      {chosen && <input type="hidden" name="start" value={chosen} />}

      <h2 className="font-display text-lg font-bold">Pick a new time</h2>
      <p className="mt-1 text-sm text-bone-3">
        Same barber, same service. Only the time changes.
      </p>

      <div className="mt-4 -mx-5 overflow-x-auto px-5">
        <div className="flex gap-2 pb-2">
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => pickDate(d.date)}
              className={`flex w-14 shrink-0 flex-col items-center rounded-[3px] border py-2 transition-colors ${
                d.date === date
                  ? "border-accent bg-accent-dim"
                  : "border-line hover:border-line-strong"
              }`}
            >
              <span className="text-[0.6rem] uppercase tracking-[0.1em] text-bone-3">
                {d.weekday}
              </span>
              <span className="font-display font-bold tabular-nums">{d.dayNum}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {options === null ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-[3px] border border-line bg-surface-2" />
            ))}
          </div>
        ) : options.length === 0 ? (
          <p className="rounded-[3px] border border-line bg-surface-2 p-4 text-center text-sm text-bone-2">
            Nothing open that day.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {options.map((o) => (
              <button
                key={o.start}
                type="button"
                onClick={() => setChosen(o.start)}
                className={`h-10 rounded-[3px] border text-sm font-semibold tabular-nums transition-colors ${
                  chosen === o.start
                    ? "border-accent bg-accent text-bone"
                    : "border-line hover:border-bone-3"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-[3px] border border-danger bg-danger-dim px-4 py-2.5 text-sm">
          {state.error}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <Button type="submit" disabled={!chosen || pending}>
          {pending ? "Moving…" : "Move my booking"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Never mind
        </Button>
      </div>
    </form>
  );
}
