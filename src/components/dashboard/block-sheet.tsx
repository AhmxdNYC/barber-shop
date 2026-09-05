"use client";

import { useState } from "react";
import {
  deleteRecurringBlockAction,
  deleteTimeOffAction,
} from "@/app/actions/availability";
import { Button } from "@/components/ui/button";

export type SheetBlock = {
  id: string;
  kind: "break" | "timeoff";
  title: string;
  barberName: string;
  /** "1pm – 2pm", already formatted. */
  when: string;
  /** Repeating breaks affect every week, not just the day being viewed. */
  repeats: boolean;
};

/**
 * What opens when a barber taps blocked-out time.
 *
 * Blocking time was possible but undoing it was not — a mistaken drag had
 * to be fixed from the availability panel further down the page, if the
 * barber worked out that was where it lived. Tapping the block itself is
 * where anyone would look first.
 *
 * Removal asks first, and says plainly when a break repeats: deleting
 * "Lunch" from a Tuesday removes it from every Tuesday, which is not
 * obvious from a single square on one day's calendar.
 */
export function BlockSheet({
  block,
  onClose,
}: {
  block: SheetBlock;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const action =
    block.kind === "timeoff" ? deleteTimeOffAction : deleteRecurringBlockAction;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ground/70 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Blocked time: ${block.title}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[6px] border border-line bg-surface p-6 sm:rounded-[3px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xl font-bold">{block.title}</p>
            <p className="mt-1 text-bone-2">
              {block.barberName} &middot; {block.when}
            </p>
            <p className="mt-1 text-sm text-bone-3">
              {block.kind === "timeoff"
                ? "Time off — this date only."
                : "Repeating break — every week on this day."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-bone-3 hover:text-bone"
          >
            ✕
          </button>
        </div>

        {confirming ? (
          <form action={action} className="mt-6 rounded-[3px] border border-danger bg-danger-dim p-4">
            <input type="hidden" name="id" value={block.id} />
            <p className="text-sm">
              {block.repeats
                ? `Remove “${block.title}” from every week?`
                : `Remove “${block.title}”?`}{" "}
              The time opens up for bookings again.
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="submit">Yes, remove it</Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-6 grid gap-2">
            <Button variant="outline" onClick={() => setConfirming(true)}>
              Remove this block
            </Button>
            <p className="text-xs text-bone-3">
              To change the times, remove it and drag out a new one on the
              calendar.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
