import { formatDuration, getBarber, type Service } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import type { TimeSlot } from "@/lib/booking";
import type { CalendarDay } from "./types";

/**
 * Date strip plus time grid.
 *
 * Slots arrive already filtered to what is genuinely open, so an unavailable
 * time is never rendered as a choice someone can make and then lose.
 */
export function StepTime({
  service,
  barberSlug,
  days,
  date,
  slots,
  selected,
  onPickDate,
  onPickSlot,
  onBack,
  onContinue,
  bookingUnavailable = false,
}: {
  service: Service;
  barberSlug: string | null;
  days: CalendarDay[];
  date: string;
  slots: TimeSlot[] | null;
  selected: TimeSlot | null;
  onPickDate: (date: string) => void;
  onPickSlot: (slot: TimeSlot) => void;
  onBack: () => void;
  onContinue: () => void;
  /** True when no booking backend is configured, so an empty day is not "full". */
  bookingUnavailable?: boolean;
}) {
  const barber = barberSlug ? getBarber(barberSlug) : undefined;
  const openCount = slots?.filter((s) => s.available).length ?? 0;

  return (
    <section>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        When suits you?
      </h1>
      <p className="mt-2 text-bone-2">
        {service.name} &middot; {formatDuration(service.durationMinutes)} &middot;{" "}
        {barber ? barber.name : "First available"}
      </p>

      <div className="mt-8 -mx-5 overflow-x-auto px-5">
        <div className="flex gap-2 pb-2">
          {days.map((day) => (
            <DayButton
              key={day.date}
              day={day}
              isSelected={day.date === date}
              onSelect={() => onPickDate(day.date)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8">
        {slots === null ? (
          <SlotSkeleton />
        ) : slots.length === 0 ? (
          <p className="rounded-[3px] border border-line bg-surface p-6 text-center text-bone-2">
            {bookingUnavailable
              ? "Online booking isn’t switched on yet — call the shop and we’ll get you in."
              : "Nothing open that day. Try another."}
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-bone-3">
              {openCount} open {openCount === 1 ? "time" : "times"}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => onPickSlot(slot)}
                  className={`rounded-[3px] border px-2 py-2 transition-colors ${
                    selected?.start === slot.start
                      ? "border-accent bg-accent text-bone"
                      : "border-line bg-surface hover:border-bone-3"
                  }`}
                >
                  <span className="block text-sm font-semibold tabular-nums">
                    {slot.label}
                  </span>
                  {/* Only shown for "first available", where the barber is
                      the thing the client does not yet know. */}
                  {slot.barbers && slot.barbers.length > 0 && (
                    <span className="mt-0.5 block truncate text-[0.7rem] opacity-80">
                      {slot.barbers.length === 1
                        ? slot.barbers[0].name
                        : `${slot.barbers[0].name} +${slot.barbers.length - 1}`}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" padded={false} onClick={onBack}>
          &larr; Back
        </Button>
        <Button disabled={!selected} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </section>
  );
}

function DayButton({
  day,
  isSelected,
  onSelect,
}: {
  day: CalendarDay;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={day.isClosed}
      onClick={onSelect}
      className={`flex w-16 shrink-0 flex-col items-center rounded-[3px] border py-3 transition-colors ${
        isSelected
          ? "border-accent bg-accent-dim"
          : day.isClosed
            ? "cursor-not-allowed border-line opacity-40"
            : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      <span className="text-[0.65rem] uppercase tracking-[0.1em] text-bone-3">
        {day.weekday}
      </span>
      <span className="mt-1 font-display text-lg font-bold tabular-nums">
        {day.dayNum}
      </span>
      <span className="text-[0.65rem] text-bone-3">
        {day.isClosed ? "closed" : day.month}
      </span>
    </button>
  );
}

function SlotSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Loading times">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-[3px] border border-line bg-surface"
        />
      ))}
    </div>
  );
}
