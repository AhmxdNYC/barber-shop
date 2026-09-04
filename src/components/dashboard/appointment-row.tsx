import { formatPrice } from "@/lib/shop";
import type { DayAppointment } from "@/lib/dashboard/queries";
import { AppointmentActions } from "./appointment-actions";

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "border-brass-dim bg-brass-dim text-brass",
  PENDING_PAYMENT: "border-line-strong bg-surface-2 text-bone-3",
  COMPLETED: "border-line bg-surface-2 text-bone-2",
  NO_SHOW: "border-danger bg-danger-dim text-danger",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING_PAYMENT: "Unpaid hold",
  COMPLETED: "Done",
  NO_SHOW: "No-show",
};

const SOURCE_LABELS: Record<string, string> = {
  ONLINE: "Online",
  WALK_IN: "Walk-in",
  PHONE: "Phone",
};

/**
 * One appointment in the day timeline.
 *
 * Shows the time first and largest: the barber is scanning for "what's next",
 * not reading records. The client's no-show count appears only when it is
 * non-zero, so it reads as a warning rather than a permanent label.
 */
export function AppointmentRow({
  appointment,
  timeZone,
}: {
  appointment: DayAppointment;
  timeZone: string;
}) {
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(appointment.startsAt);

  const status = appointment.status as string;

  return (
    <li className="flex flex-wrap items-start gap-4 border-b border-line py-4 last:border-b-0">
      <span className="w-20 shrink-0 font-display text-lg font-bold tabular-nums">
        {time}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{appointment.contactName}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${
              STATUS_STYLES[status] ?? "border-line text-bone-3"
            }`}
          >
            {STATUS_LABELS[status] ?? status}
          </span>
          {appointment.source !== "ONLINE" && (
            <span className="text-[0.65rem] uppercase tracking-[0.1em] text-bone-3">
              {SOURCE_LABELS[appointment.source] ?? appointment.source}
            </span>
          )}
          {(appointment.client?.noShowCount ?? 0) > 0 && (
            <span className="text-[0.65rem] text-accent">
              {appointment.client?.noShowCount} previous no-show
              {appointment.client?.noShowCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <p className="mt-0.5 text-sm text-bone-2">
          {appointment.service.name} &middot; {appointment.barber.name}
          {appointment.contactPhone && (
            <>
              {" "}
              &middot;{" "}
              <a href={`tel:${appointment.contactPhone.replace(/\D/g, "")}`} className="hover:text-bone">
                {appointment.contactPhone}
              </a>
            </>
          )}
        </p>

        {appointment.clientNotes && (
          <p className="mt-1.5 rounded-[3px] border border-line bg-surface-2 px-3 py-2 text-sm text-bone-2">
            {appointment.clientNotes}
          </p>
        )}

        <AppointmentActions id={appointment.id} status={status} />
      </div>

      <span className="shrink-0 text-right">
        <span className="block font-display font-bold tabular-nums">
          {formatPrice(appointment.priceCents)}
        </span>
        {appointment.payment?.status === "SUCCEEDED" && (
          <span className="text-[0.65rem] text-bone-3">
            {formatPrice(appointment.payment.amountCents)} paid
          </span>
        )}
      </span>
    </li>
  );
}
