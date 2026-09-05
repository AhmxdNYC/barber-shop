"use client";

import { useActionState, useState } from "react";
import {
  barberRescheduleAction,
  barberRescheduleOptionsAction,
  cancelAppointmentAction,
  completeAppointmentAction,
  markNoShowAction,
  reopenAppointmentAction,
  type BarberRescheduleState,
} from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";

export type SheetAppointment = {
  id: string;
  clientName: string;
  serviceName: string;
  barberName: string;
  phone: string | null;
  notes: string | null;
  status: string;
  time: string;
  priceLabel: string;
  noShowCount: number;
  visitCount: number;
};

/**
 * What opens when a barber taps an appointment on the calendar.
 *
 * Cancelling asks first. Everything else is one tap, because "done" and
 * "no-show" are what he presses all day and a confirmation on each would be
 * friction on the common path. Cancelling is rarer, irreversible from his
 * side, and sends the client an email — so it earns the extra tap.
 */
export function AppointmentSheet({
  appointment,
  days,
  onClose,
}: {
  appointment: SheetAppointment;
  /** Dates offered when rescheduling. */
  days: { date: string; weekday: string; dayNum: string }[];
  onClose: () => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const finished =
    appointment.status === "COMPLETED" || appointment.status === "NO_SHOW";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ground/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Appointment for ${appointment.clientName}`}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-[6px] border border-line bg-surface p-6 sm:rounded-[3px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-2xl font-extrabold tracking-tight">
              {appointment.clientName}
            </p>
            <p className="mt-1 text-bone-2">
              {appointment.time} &middot; {appointment.serviceName} &middot;{" "}
              {appointment.priceLabel}
            </p>
            <p className="text-sm text-bone-3">with {appointment.barberName}</p>
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

        {(appointment.noShowCount > 0 || appointment.visitCount > 0) && (
          <p className="mt-3 text-sm">
            {appointment.visitCount > 0 && (
              <span className="text-bone-2">
                {appointment.visitCount} previous visit
                {appointment.visitCount === 1 ? "" : "s"}
              </span>
            )}
            {appointment.noShowCount > 0 && (
              <span className="ml-3 text-accent">
                {appointment.noShowCount} no-show
                {appointment.noShowCount === 1 ? "" : "s"}
              </span>
            )}
          </p>
        )}

        {appointment.phone && (
          <a
            href={`tel:${appointment.phone.replace(/\D/g, "")}`}
            className="mt-4 block rounded-[3px] border border-line-strong px-4 py-2.5 text-center text-sm font-semibold transition-colors hover:border-bone-3"
          >
            Call {appointment.phone}
          </a>
        )}

        {appointment.notes && (
          <p className="mt-4 rounded-[3px] border border-line bg-surface-2 px-4 py-3 text-sm text-bone-2">
            {appointment.notes}
          </p>
        )}

        {finished ? (
          <div className="mt-6">
            <p
              className={`rounded-[3px] border px-4 py-3 text-sm ${
                appointment.status === "NO_SHOW"
                  ? "border-danger bg-danger-dim text-bone"
                  : "border-brass bg-brass-dim text-bone"
              }`}
            >
              {appointment.status === "COMPLETED"
                ? "Marked done."
                : "Marked as a no-show — it is on their record."}
            </p>
            {/* One tap to mark, so one tap to unmark. A no-show follows a
                client around and should never be stuck after a misfire. */}
            <form action={reopenAppointmentAction} className="mt-3">
              <input type="hidden" name="id" value={appointment.id} />
              <button
                type="submit"
                className={`${ACTION} border-line-strong hover:border-bone-3`}
              >
                Undo &mdash; put it back to booked
              </button>
            </form>
          </div>
        ) : rescheduling ? (
          <RescheduleBlock
            id={appointment.id}
            days={days}
            onCancel={() => setRescheduling(false)}
            onDone={onClose}
          />
        ) : confirmingCancel ? (
          <form action={cancelAppointmentAction} className="mt-6 rounded-[3px] border border-danger bg-danger-dim p-4">
            <input type="hidden" name="id" value={appointment.id} />
            <p className="text-sm">
              Cancel {appointment.clientName}&rsquo;s {appointment.serviceName}?
              They&rsquo;ll be emailed.
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="submit">Yes, cancel it</Button>
              <Button variant="ghost" onClick={() => setConfirmingCancel(false)}>
                Keep it
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <form action={completeAppointmentAction}>
              <input type="hidden" name="id" value={appointment.id} />
              <button type="submit" className={`${ACTION} border-brass text-brass hover:bg-brass-dim`}>
                Mark done
              </button>
            </form>

            <form action={markNoShowAction}>
              <input type="hidden" name="id" value={appointment.id} />
              <button type="submit" className={`${ACTION} border-accent text-accent hover:bg-accent-dim`}>
                No-show
              </button>
            </form>

            <button
              type="button"
              onClick={() => setRescheduling(true)}
              className={`${ACTION} border-line-strong hover:border-bone-3`}
            >
              Move to another time
            </button>

            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className={`${ACTION} border-line text-bone-3 hover:border-accent hover:text-accent`}
            >
              Cancel booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ACTION =
  "w-full rounded-[3px] border px-4 py-2.5 text-sm font-semibold transition-colors";

function RescheduleBlock({
  id,
  days,
  onCancel,
  onDone,
}: {
  id: string;
  days: { date: string; weekday: string; dayNum: string }[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(days[0].date);
  const [options, setOptions] = useState<{ start: string; label: string }[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [state, action, pending] = useActionState<BarberRescheduleState, FormData>(
    barberRescheduleAction,
    {},
  );

  async function pickDate(next: string) {
    setDate(next);
    setOptions(null);
    setChosen(null);
    setOptions(await barberRescheduleOptionsAction(id, next));
  }

  // Load the first day's times without an effect.
  if (options === null && !pending) {
    void barberRescheduleOptionsAction(id, date).then(setOptions);
  }

  if (state.moved) {
    onDone();
    return null;
  }

  return (
    <form action={action} className="mt-6 rounded-[3px] border border-line bg-surface-2 p-4">
      <input type="hidden" name="id" value={id} />
      {chosen && <input type="hidden" name="start" value={chosen} />}

      <p className="text-sm font-semibold">Move to</p>

      <div className="mt-3 -mx-1 overflow-x-auto px-1">
        <div className="flex gap-2 pb-1">
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => pickDate(d.date)}
              className={`flex w-12 shrink-0 flex-col items-center rounded-[3px] border py-1.5 ${
                d.date === date ? "border-accent bg-accent-dim" : "border-line"
              }`}
            >
              <span className="text-[0.6rem] uppercase text-bone-3">{d.weekday}</span>
              <span className="font-display text-sm font-bold tabular-nums">{d.dayNum}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {(options ?? []).map((o) => (
          <button
            key={o.start}
            type="button"
            onClick={() => setChosen(o.start)}
            className={`h-9 rounded-[3px] border text-xs font-semibold tabular-nums ${
              chosen === o.start ? "border-accent bg-accent text-bone" : "border-line"
            }`}
          >
            {o.label}
          </button>
        ))}
        {options?.length === 0 && (
          <p className="col-span-full text-sm text-bone-3">Nothing open that day.</p>
        )}
      </div>

      {state.error && <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p>}

      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={!chosen || pending}>
          {pending ? "Moving…" : "Move it"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Back
        </Button>
      </div>
    </form>
  );
}
