"use client";

import { useEffect, useState } from "react";
import type { Service } from "@/lib/shop";
import {
  bookingProvider,
  IS_DEMO,
  type BookingResult,
  type TimeSlot,
} from "@/lib/booking";
import { ProgressSteps } from "./progress-steps";
import { StepBarber } from "./step-barber";
import { StepService } from "./step-service";
import { StepTime } from "./step-time";
import { StepDetails } from "./step-details";
import { Confirmation } from "./confirmation";
import { HostedHandoff } from "./hosted-handoff";
import { EMPTY_FORM, type CalendarDay, type ContactForm, type Step } from "./types";

/**
 * Orchestrates the four booking steps.
 *
 * This component owns state and nothing else — every screen lives in its own
 * file. Steps are a single index rather than a route per step so that going
 * back never refetches or loses a choice, which matters on a phone with one
 * bar of signal outside the shop.
 */
export function BookingFlow({
  days,
  services,
  initialBarber,
  initialService,
  bookingUnavailable = false,
}: {
  days: CalendarDay[];
  /** The live menu, so a price edited in the dashboard shows here at once. */
  services: Service[];
  initialBarber: string | null;
  initialService: string | null;
  /** No booking backend configured — say so rather than showing empty days. */
  bookingUnavailable?: boolean;
}) {
  // Deep links from a barber or service card skip the steps they answer.
  const [step, setStep] = useState<Step>(
    initialBarber ? (initialService ? 2 : 1) : 0,
  );
  const [barberSlug, setBarberSlug] = useState(initialBarber);
  const [serviceSlug, setServiceSlug] = useState(initialService);
  const [date, setDate] = useState(
    days.find((d) => !d.isClosed)?.date ?? days[0].date,
  );
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  const service = services.find((s) => s.slug === serviceSlug);
  const isRedirect = bookingProvider.mode === "redirect";
  const selectedDay = days.find((d) => d.date === date);

  useEffect(() => {
    if (step !== 2 || !serviceSlug || isRedirect) return;
    let cancelled = false;
    bookingProvider
      .getAvailability({ date, serviceSlug, barberSlug })
      .then((next) => {
        if (!cancelled) setSlots(next);
      });
    return () => {
      cancelled = true;
    };
  }, [step, date, serviceSlug, barberSlug, isRedirect]);

  /** Anything that invalidates loaded slots clears them through here. */
  function reselect(change: () => void) {
    setSlots(null);
    setSlot(null);
    change();
  }

  async function submit() {
    if (!service || !slot) return;
    setSubmitting(true);
    const outcome = await bookingProvider.createBooking({
      date,
      serviceSlug: service.slug,
      barberSlug,
      start: slot.start,
      ...form,
    });
    setResult(outcome);
    setSubmitting(false);
    if (outcome.ok) setStep(4);
  }

  if (step === 4 && result?.ok) {
    return (
      <Confirmation
        service={service}
        barberSlug={barberSlug}
        day={selectedDay}
        slot={slot}
        reference={result.reference}
        message={result.message}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      {IS_DEMO && (
        <p className="mb-8 rounded-[3px] border border-brass-dim bg-brass-dim/40 px-4 py-3 text-sm text-brass">
          Demo booking &mdash; pick anything you like. Nothing is saved and no
          card is charged.
        </p>
      )}

      <ProgressSteps current={step} onGoTo={setStep} />

      {step === 0 && (
        <StepBarber
          selected={barberSlug}
          onSelect={(slug) =>
            reselect(() => {
              setBarberSlug(slug);
              setStep(1);
            })
          }
        />
      )}

      {step === 1 && (
        <StepService
          services={services}
          barberSlug={barberSlug}
          onSelect={(slug) =>
            reselect(() => {
              setServiceSlug(slug);
              setStep(2);
            })
          }
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 &&
        service &&
        (isRedirect ? (
          <HostedHandoff serviceSlug={service.slug} barberSlug={barberSlug} />
        ) : (
          <StepTime
            service={service}
            barberSlug={barberSlug}
            days={days}
            date={date}
            slots={slots}
            selected={slot}
            onPickDate={(next) => reselect(() => setDate(next))}
            onPickSlot={setSlot}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
            bookingUnavailable={bookingUnavailable}
          />
        ))}

      {step === 3 && service && slot && (
        <StepDetails
          service={service}
          barberSlug={barberSlug}
          day={selectedDay}
          slot={slot}
          form={form}
          onChange={setForm}
          error={result && !result.ok ? result.message : undefined}
          submitting={submitting}
          onBack={() => setStep(2)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
