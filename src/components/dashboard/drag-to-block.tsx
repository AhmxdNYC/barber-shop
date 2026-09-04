"use client";

import { useActionState, useState } from "react";
import {
  blockTimeFromCalendarAction,
  type ActionState,
} from "@/app/actions/availability";
import { Button } from "@/components/ui/button";

export type DragRange = {
  barberId: string;
  barberName: string;
  startMinutes: number;
  endMinutes: number;
};

/** Times snap to quarter hours; nobody blocks out 11:07. */
export const SNAP_MINUTES = 15;

export function snap(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export function formatRange(startMinutes: number, endMinutes: number): string {
  return `${clock(startMinutes)} – ${clock(endMinutes)}`;
}

function clock(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

/**
 * Confirms a range dragged on the calendar.
 *
 * Dragging creates a *proposal*, not a saved block. A stray touch while
 * scrolling a calendar on a phone would otherwise silently close the shop
 * for an afternoon, and the barber would find out when someone could not
 * book. Confirming costs one tap and removes that entirely.
 */
export function DragToBlockDialog({
  range,
  date,
  onClose,
}: {
  range: DragRange;
  date: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    blockTimeFromCalendarAction,
    {},
  );

  // Confirm in place rather than closing automatically. The message may say
  // that appointments already sit inside the block, and closing the dialog
  // would take that away before it had been read.
  if (state.ok) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-ground/70 backdrop-blur-sm sm:items-center sm:p-6"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-t-[6px] border border-line bg-surface p-6 sm:rounded-[3px]"
        >
          <h2 className="font-display text-xl font-bold">Blocked out</h2>
          <p className="mt-2 text-bone-2">{state.ok}</p>
          <Button className="mt-5" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ground/70 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        action={action}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[6px] border border-line bg-surface p-6 sm:rounded-[3px]"
      >
        <input type="hidden" name="barberId" value={range.barberId} />
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="startMinutes" value={range.startMinutes} />
        <input type="hidden" name="endMinutes" value={range.endMinutes} />

        <h2 className="font-display text-xl font-bold">Block out this time?</h2>
        <p className="mt-2 text-bone-2">
          {range.barberName} &middot;{" "}
          <span className="tabular-nums">
            {formatRange(range.startMinutes, range.endMinutes)}
          </span>
        </p>

        <label className="mt-5 block">
          <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-bone-3">
            Reason
          </span>
          <input
            name="reason"
            placeholder="Lunch, appointment, finishing early"
            className="w-full rounded-[3px] border border-line bg-surface-2 px-3 py-2.5 text-sm text-bone placeholder:text-bone-3 focus:border-bone-3 focus:outline-none"
          />
        </label>

        {state.error && (
          <p role="alert" className="mt-4 rounded-[3px] border border-accent bg-accent-dim px-4 py-2.5 text-sm">
            {state.error}
          </p>
        )}

        <p className="mt-4 text-xs text-bone-3">
          Appointments already booked in this time are not cancelled &mdash;
          you&rsquo;ll be told if there are any.
        </p>

        <div className="mt-5 flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Blocking…" : "Block it out"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Never mind
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Live preview of the range while the pointer is down. */
export function DragPreview({
  topPx,
  heightPx,
  startMinutes,
  endMinutes,
}: {
  topPx: number;
  heightPx: number;
  startMinutes: number;
  endMinutes: number;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-x-1 z-30 rounded-[3px] border-2 border-dashed border-accent bg-accent-dim/70 px-2 py-1"
      style={{ top: topPx, height: Math.max(heightPx, 16) }}
    >
      <span className="text-[0.65rem] font-semibold tabular-nums text-bone">
        {formatRange(startMinutes, endMinutes)}
      </span>
    </div>
  );
}

/** Tracks a pointer drag over a calendar column and reports the range. */
export function useColumnDrag({
  pxPerMinute,
  fromMinutes,
  onComplete,
}: {
  pxPerMinute: number;
  fromMinutes: number;
  onComplete: (barberId: string, startMinutes: number, endMinutes: number) => void;
}) {
  const [drag, setDrag] = useState<{
    barberId: string;
    anchor: number;
    current: number;
  } | null>(null);

  function minutesAt(event: React.PointerEvent<HTMLElement>): number {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetPx = event.clientY - bounds.top;
    return snap(fromMinutes + offsetPx / pxPerMinute);
  }

  function onPointerDown(barberId: string) {
    return (event: React.PointerEvent<HTMLElement>) => {
      // Only a primary press on empty column space starts a drag; taps on an
      // appointment must still open it.
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest("[data-block]")) return;
      const at = minutesAt(event);
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrag({ barberId, anchor: at, current: at });
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    if (!drag) return;
    setDrag({ ...drag, current: minutesAt(event) });
  }

  function onPointerUp() {
    if (!drag) return;
    const start = Math.min(drag.anchor, drag.current);
    const end = Math.max(drag.anchor, drag.current);
    setDrag(null);
    // A tap is not a drag. Below one slot it was almost certainly a scroll.
    if (end - start >= SNAP_MINUTES) onComplete(drag.barberId, start, end);
  }

  return {
    drag,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: () => setDrag(null) },
  };
}
