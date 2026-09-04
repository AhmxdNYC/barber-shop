import {
  cancelAppointmentAction,
  completeAppointmentAction,
  markNoShowAction,
} from "@/app/actions/appointments";

/**
 * The three things a barber does to an appointment.
 *
 * Plain forms rather than client-side handlers: they work before hydration
 * and on a bad connection, which is the situation this is used in.
 */
export function AppointmentActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  if (status === "COMPLETED" || status === "NO_SHOW") return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <ActionButton action={completeAppointmentAction} id={id} tone="primary">
        Done
      </ActionButton>
      <ActionButton action={markNoShowAction} id={id} tone="warn">
        No-show
      </ActionButton>
      <ActionButton action={cancelAppointmentAction} id={id} tone="quiet">
        Cancel
      </ActionButton>
    </div>
  );
}

const TONES = {
  primary: "border-brass text-brass hover:bg-brass-dim",
  warn: "border-danger text-danger hover:bg-danger-dim",
  quiet: "border-line text-bone-3 hover:border-bone-3 hover:text-bone-2",
};

function ActionButton({
  action,
  id,
  tone,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  tone: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`rounded-[3px] border px-3 py-1.5 text-xs font-semibold transition-colors ${TONES[tone]}`}
      >
        {children}
      </button>
    </form>
  );
}
