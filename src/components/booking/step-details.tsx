import { useState } from "react";
import { SHOP, formatPrice, getBarber, type Service } from "@/lib/shop";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { contactErrors } from "@/lib/booking/contact";
import type { TimeSlot } from "@/lib/booking";
import type { CalendarDay, ContactForm } from "./types";

export function StepDetails({
  service,
  barberSlug,
  day,
  slot,
  form,
  onChange,
  error,
  submitting,
  onBack,
  onSubmit,
}: {
  service: Service;
  barberSlug: string | null;
  day: CalendarDay | undefined;
  slot: TimeSlot;
  form: ContactForm;
  onChange: (form: ContactForm) => void;
  error?: string;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const barber = barberSlug ? getBarber(barberSlug) : undefined;
  const set = (key: keyof ContactForm) => (value: string) => {
    setTouched((t) => ({ ...t, [key]: true }));
    onChange({ ...form, [key]: value });
  };

  const errors = contactErrors(form);
  const canSubmit = Object.keys(errors).length === 0 && !submitting;

  /** Only complain about a field once it has been filled in and left. */
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errorFor = (field: "name" | "email" | "phone") =>
    touched[field] ? errors[field] : undefined;

  return (
    <section>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Last bit
      </h1>

      <div className="mt-6 flex items-center gap-4 rounded-[3px] border border-line bg-surface p-4">
        {barber ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={barber.photo}
            alt=""
            className="h-14 w-14 shrink-0 rounded-[3px] object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[3px] border border-line font-display text-bone-3">
            ?
          </span>
        )}
        <div className="min-w-0 text-sm">
          <p className="font-display font-bold">
            {service.name} &middot; {formatPrice(service.priceCents)}
          </p>
          <p className="text-bone-2">
            {barber?.name ?? "First available barber"} &middot; {day?.weekday}{" "}
            {slot.label}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        <TextField
          label="Name"
          value={form.name}
          onChange={set("name")}
          placeholder="Your name"
          autoComplete="name"
          error={errorFor("name")}
        />
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          placeholder="you@example.com"
          autoComplete="email"
          error={errorFor("email")}
        />
        <TextField
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={set("phone")}
          placeholder={SHOP.phone}
          autoComplete="tel"
          error={errorFor("phone")}
        />
        <TextField
          label="Anything we should know?"
          value={form.notes}
          onChange={set("notes")}
          placeholder="How you like it, first visit, running late"
          optional
        />
      </div>

      <p className="mt-3 text-sm text-bone-3">
        We ask for a number so the shop can reach you if anything changes on
        the day.
      </p>

      <p className="mt-5 text-sm text-bone-3">
        A {formatPrice(SHOP.depositCents)} deposit holds the slot; the rest is
        paid in the shop. Free to cancel up to 24 hours before.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-[3px] border border-accent bg-accent-dim px-4 py-3 text-sm text-bone">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" padded={false} onClick={onBack}>
          &larr; Back
        </Button>
        <Button disabled={!canSubmit} onClick={onSubmit}>
          {submitting ? "Booking…" : "Confirm booking"}
        </Button>
      </div>
    </section>
  );
}
