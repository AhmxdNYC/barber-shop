"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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

/**
 * What a tap means.
 *
 * Requiring a drag before anything happened made a tap feel broken — the
 * calendar simply did nothing and gave no reason. A tap now proposes half an
 * hour from that point, which the dialog lets you adjust, so the quick
 * gesture works and the precise one still does too.
 */
export const TAP_BLOCK_MINUTES = 30;

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
  const [startMinutes, setStartMinutes] = useState(range.startMinutes);
  const [endMinutes, setEndMinutes] = useState(range.endMinutes);
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
        <input type="hidden" name="startMinutes" value={startMinutes} />
        <input type="hidden" name="endMinutes" value={endMinutes} />

        <h2 className="font-display text-xl font-bold">Block out this time?</h2>
        <p className="mt-2 text-bone-2">{range.barberName}</p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label>
            <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-bone-3">
              From
            </span>
            <input
              type="time"
              step={SNAP_MINUTES * 60}
              value={toTimeValue(startMinutes)}
              onChange={(e) => setStartMinutes(fromTimeValue(e.target.value, startMinutes))}
              className={TIME_INPUT}
            />
          </label>
          <label>
            <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-bone-3">
              Until
            </span>
            <input
              type="time"
              step={SNAP_MINUTES * 60}
              value={toTimeValue(endMinutes)}
              onChange={(e) => setEndMinutes(fromTimeValue(e.target.value, endMinutes))}
              className={TIME_INPUT}
            />
          </label>
          <span className="pb-2 text-sm tabular-nums text-bone-3">
            {lengthInWords(endMinutes - startMinutes)}
          </span>
        </div>

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
          <p role="alert" className="mt-4 rounded-[3px] border border-danger bg-danger-dim px-4 py-2.5 text-sm">
            {state.error}
          </p>
        )}

        <p className="mt-4 text-xs text-bone-3">
          Appointments already booked in this time are not cancelled &mdash;
          you&rsquo;ll be told if there are any.
        </p>

        <div className="mt-5 flex gap-3">
          <Button type="submit" disabled={pending || endMinutes <= startMinutes}>
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

/**
 * How long a finger must rest before a drag begins.
 *
 * A calendar column is most of a phone screen, so the same downward swipe
 * means both "scroll the page" and "block out an hour". The browser decides
 * which the moment the finger moves, and it always chose scrolling — so
 * blocking time out by touch was a fight the barber usually lost.
 *
 * Resting first says which one is meant, the way it does on every phone
 * calendar. A swipe scrolls, a hold draws.
 */
const HOLD_MS = 320;

/** Movement before the hold fires that means this was a scroll, not a hold. */
const HOLD_SLOP_PX = 8;

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

  /** A touch that is down but has not yet earned a drag. */
  const held = useRef<{
    timer: ReturnType<typeof setTimeout>;
    barberId: string;
    at: number;
    x: number;
    y: number;
  } | null>(null);

  function cancelHold() {
    if (!held.current) return;
    clearTimeout(held.current.timer);
    held.current = null;
  }

  // Once a drag is under way the page must hold still, and touch-action
  // cannot say so: the browser fixes a touch's meaning when the finger lands,
  // and the class on the column has already promised it may scroll. A
  // non-passive listener can still refuse each move, which is what keeps the
  // page from sliding out from under a block being stretched.
  useEffect(() => {
    if (!drag) return;
    const hold = (event: TouchEvent) => event.preventDefault();
    document.addEventListener("touchmove", hold, { passive: false });
    return () => document.removeEventListener("touchmove", hold);
  }, [drag]);

  useEffect(() => cancelHold, []);

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

      // A mouse has a scroll wheel and cannot be mistaken for one, so it
      // draws immediately.
      if (event.pointerType === "mouse") {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ barberId, anchor: at, current: at });
        return;
      }

      const column = event.currentTarget;
      const pointerId = event.pointerId;
      cancelHold();
      held.current = {
        barberId,
        at,
        x: event.clientX,
        y: event.clientY,
        timer: setTimeout(() => {
          held.current = null;
          column.setPointerCapture(pointerId);
          setDrag({ barberId, anchor: at, current: at });
        }, HOLD_MS),
      };
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    // Moving before the hold lands means a scroll was meant. Let it go.
    const waiting = held.current;
    if (waiting) {
      const moved =
        Math.abs(event.clientX - waiting.x) + Math.abs(event.clientY - waiting.y);
      if (moved > HOLD_SLOP_PX) cancelHold();
      return;
    }
    if (!drag) return;
    setDrag({ ...drag, current: minutesAt(event) });
  }

  function onPointerUp() {
    // Let go before the hold landed: a tap, which proposes a default length
    // rather than doing nothing — doing nothing read as the calendar being
    // broken.
    const waiting = held.current;
    if (waiting) {
      cancelHold();
      onComplete(waiting.barberId, waiting.at, waiting.at + TAP_BLOCK_MINUTES);
      return;
    }

    if (!drag) return;
    const start = Math.min(drag.anchor, drag.current);
    const dragged = Math.max(drag.anchor, drag.current) - start;
    setDrag(null);
    const end = dragged >= SNAP_MINUTES ? start + dragged : start + TAP_BLOCK_MINUTES;
    onComplete(drag.barberId, start, end);
  }

  function onPointerCancel() {
    cancelHold();
    setDrag(null);
  }

  return {
    drag,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}


const TIME_INPUT =
  "rounded-[3px] border border-line bg-surface-2 px-3 py-2 text-sm tabular-nums text-bone focus:border-bone-3 focus:outline-none";

function toTimeValue(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function fromTimeValue(value: string, fallback: number): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return fallback;
  return Number(match[1]) * 60 + Number(match[2]);
}

function lengthInWords(minutes: number): string {
  if (minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hours}h ${rest}m`;
}
