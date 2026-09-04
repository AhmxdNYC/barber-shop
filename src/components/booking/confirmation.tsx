import { getBarber, type Service } from "@/lib/shop";
import { ButtonLink } from "@/components/ui/button";
import type { TimeSlot } from "@/lib/booking";
import type { CalendarDay } from "./types";

export function Confirmation({
  service,
  barberSlug,
  day,
  slot,
  reference,
  message,
}: {
  service: Service | undefined;
  barberSlug: string | null;
  day: CalendarDay | undefined;
  slot: TimeSlot | null;
  reference: string;
  message: string;
}) {
  const barber = barberSlug ? getBarber(barberSlug) : undefined;

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brass bg-brass-dim">
        <span className="font-display text-2xl font-bold text-brass">&#10003;</span>
      </div>
      <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight">
        You&rsquo;re in the book
      </h1>
      <p className="mt-3 text-bone-2">
        {service?.name} with {barber?.name ?? "the first available barber"} on{" "}
        {day?.weekday} at {slot?.label}.
      </p>
      <p className="mt-2 font-display text-sm tracking-wide text-bone-3">
        Reference {reference}
      </p>
      <p className="mt-6 rounded-[3px] border border-line bg-surface p-4 text-sm text-bone-2">
        {message}
      </p>
      <ButtonLink href="/" variant="outline" className="mt-8">
        Back to the shop
      </ButtonLink>
    </div>
  );
}
