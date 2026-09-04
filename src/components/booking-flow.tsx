"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  SHOP,
  SERVICES,
  BARBERS,
  getService,
  getBarber,
  formatPrice,
  formatDuration,
  initialsOf,
} from "@/lib/shop";
import {
  bookingProvider,
  IS_DEMO,
  type TimeSlot,
  type BookingResult,
} from "@/lib/booking";

export type CalendarDay = {
  /** "YYYY-MM-DD" */
  date: string;
  weekday: string;
  dayNum: string;
  month: string;
  isClosed: boolean;
  isToday: boolean;
};

const STEPS = ["Barber", "Service", "Time", "Details"] as const;
type Step = 0 | 1 | 2 | 3 | 4;

export function BookingFlow({
  days,
  initialBarber,
  initialService,
}: {
  days: CalendarDay[];
  initialBarber: string | null;
  initialService: string | null;
}) {
  const [step, setStep] = useState<Step>(initialBarber ? (initialService ? 2 : 1) : 0);
  const [barberSlug, setBarberSlug] = useState<string | null>(initialBarber);
  const [serviceSlug, setServiceSlug] = useState<string | null>(initialService);
  const [date, setDate] = useState<string>(
    days.find((d) => !d.isClosed)?.date ?? days[0].date,
  );
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  /** Changing any of these invalidates the loaded slots. */
  function reselect(next: () => void) {
    setSlots(null);
    setSlot(null);
    next();
  }

  const service = serviceSlug ? getService(serviceSlug) : undefined;
  const barber = barberSlug ? getBarber(barberSlug) : undefined;
  const isRedirect = bookingProvider.mode === "redirect";

  /* Load slots whenever the day, service or barber changes. */
  useEffect(() => {
    if (step !== 2 || !serviceSlug || isRedirect) return;
    let cancelled = false;
    bookingProvider
      .getAvailability({ date, serviceSlug, barberSlug })
      .then((s) => {
        if (!cancelled) setSlots(s);
      });
    return () => {
      cancelled = true;
    };
  }, [step, date, serviceSlug, barberSlug, isRedirect]);

  const openCount = useMemo(
    () => slots?.filter((s) => s.available).length ?? 0,
    [slots],
  );

  async function submit() {
    if (!service || !slot) return;
    setSubmitting(true);
    const res = await bookingProvider.createBooking({
      date,
      serviceSlug: service.slug,
      barberSlug,
      start: slot.start,
      ...form,
    });
    setResult(res);
    setSubmitting(false);
    if (res.ok) setStep(4);
  }

  /* ── confirmation ─────────────────────────────────────────── */
  if (step === 4 && result?.ok) {
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
          {days.find((d) => d.date === date)?.weekday} at {slot?.label}.
        </p>
        <p className="mt-2 font-display text-sm tracking-wide text-bone-3">
          Reference {result.reference}
        </p>
        <p className="mt-6 rounded-[3px] border border-line bg-surface p-4 text-sm text-bone-2">
          {result.message}
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-[3px] border border-line-strong px-6 py-3 text-sm font-semibold transition-colors hover:border-bone-3"
        >
          Back to the shop
        </Link>
      </div>
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

      {/* progress */}
      <ol className="mb-10 flex items-center gap-2 text-xs">
        {STEPS.map((label, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => i < step && setStep(i as Step)}
                disabled={i >= step}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.7rem] font-semibold transition-colors ${
                  state === "done"
                    ? "border-accent bg-accent text-bone"
                    : state === "current"
                      ? "border-bone text-bone"
                      : "border-line text-bone-3"
                } ${i < step ? "cursor-pointer" : "cursor-default"}`}
                aria-current={state === "current" ? "step" : undefined}
              >
                {i < step ? "✓" : i + 1}
              </button>
              <span
                className={`hidden sm:block ${
                  state === "todo" ? "text-bone-3" : "text-bone-2"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>

      {/* ── step 0: barber ─────────────────────────────────── */}
      {step === 0 && (
        <section>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Who&rsquo;s cutting?
          </h1>
          <p className="mt-2 text-bone-2">
            Pick a chair, or let us give you whoever opens up first.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {BARBERS.map((b) => (
              <button
                key={b.slug}
                type="button"
                onClick={() =>
                  reselect(() => {
                    setBarberSlug(b.slug);
                    setStep(1);
                  })
                }
                className={`group flex items-center gap-4 rounded-[3px] border p-3 text-left transition-colors ${
                  barberSlug === b.slug
                    ? "border-accent bg-accent-dim"
                    : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.photo}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-[3px] object-cover"
                />
                <span className="min-w-0">
                  <span className="block font-display font-bold">{b.name}</span>
                  <span className="block truncate text-sm text-accent">
                    {b.specialty}
                  </span>
                  <span className="mt-0.5 block text-xs text-bone-3">
                    Next open {b.nextAvailable}
                  </span>
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                reselect(() => {
                  setBarberSlug(null);
                  setStep(1);
                })
              }
              className="flex items-center gap-4 rounded-[3px] border border-dashed border-line-strong bg-transparent p-3 text-left transition-colors hover:border-bone-3"
            >
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[3px] border border-line text-bone-3">
                <span className="font-display text-xl font-bold">?</span>
              </span>
              <span>
                <span className="block font-display font-bold">
                  First available
                </span>
                <span className="block text-sm text-bone-2">
                  Whoever opens up soonest
                </span>
              </span>
            </button>
          </div>
        </section>
      )}

      {/* ── step 1: service ────────────────────────────────── */}
      {step === 1 && (
        <section>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            What are we doing?
          </h1>
          <p className="mt-2 text-bone-2">
            {barber ? `With ${barber.name}.` : "First available barber."}
          </p>

          <ul className="mt-8 divide-y divide-line border-y border-line">
            {SERVICES.map((s) => (
              <li key={s.slug}>
                <button
                  type="button"
                  onClick={() =>
                    reselect(() => {
                      setServiceSlug(s.slug);
                      setStep(2);
                    })
                  }
                  className="group flex w-full items-baseline gap-3 py-4 text-left transition-colors hover:bg-surface"
                >
                  <span className="font-display font-bold transition-colors group-hover:text-accent">
                    {s.name}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mx-1 hidden flex-1 translate-y-[-3px] border-b border-dotted border-line-strong sm:block"
                  />
                  <span className="ml-auto text-sm text-bone-3 sm:ml-0">
                    {formatDuration(s.durationMinutes)}
                  </span>
                  <span className="w-14 shrink-0 text-right font-display font-bold tabular-nums">
                    {formatPrice(s.priceCents)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <BackButton onClick={() => setStep(0)} />
        </section>
      )}

      {/* ── step 2: date + time ────────────────────────────── */}
      {step === 2 && service && (
        <section>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            When suits you?
          </h1>
          <p className="mt-2 text-bone-2">
            {service.name} &middot; {formatDuration(service.durationMinutes)}{" "}
            &middot; {barber ? barber.name : "First available"}
          </p>

          {isRedirect ? (
            <HostedHandoff serviceSlug={service.slug} barberSlug={barberSlug} />
          ) : (
            <>
              {/* day strip */}
              <div className="mt-8 -mx-5 overflow-x-auto px-5">
                <div className="flex gap-2 pb-2">
                  {days.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      disabled={d.isClosed}
                      onClick={() => reselect(() => setDate(d.date))}
                      className={`flex w-16 shrink-0 flex-col items-center rounded-[3px] border py-3 transition-colors ${
                        d.date === date
                          ? "border-accent bg-accent-dim"
                          : d.isClosed
                            ? "cursor-not-allowed border-line bg-transparent opacity-40"
                            : "border-line bg-surface hover:border-line-strong"
                      }`}
                    >
                      <span className="text-[0.65rem] uppercase tracking-[0.1em] text-bone-3">
                        {d.weekday}
                      </span>
                      <span className="mt-1 font-display text-lg font-bold tabular-nums">
                        {d.dayNum}
                      </span>
                      <span className="text-[0.65rem] text-bone-3">
                        {d.isClosed ? "closed" : d.month}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* slots */}
              <div className="mt-8">
                {slots === null ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-11 animate-pulse rounded-[3px] border border-line bg-surface"
                      />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <p className="rounded-[3px] border border-line bg-surface p-6 text-center text-bone-2">
                    Closed that day. Try another.
                  </p>
                ) : (
                  <>
                    <p className="mb-3 text-sm text-bone-3">
                      {openCount} open {openCount === 1 ? "time" : "times"}
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.map((s) => (
                        <button
                          key={s.start}
                          type="button"
                          disabled={!s.available}
                          onClick={() => setSlot(s)}
                          className={`h-11 rounded-[3px] border text-sm font-semibold tabular-nums transition-colors ${
                            slot?.start === s.start
                              ? "border-accent bg-accent text-bone"
                              : s.available
                                ? "border-line bg-surface hover:border-bone-3"
                                : "cursor-not-allowed border-line/60 bg-transparent text-bone-3 line-through"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <BackButton onClick={() => setStep(1)} inline />
                <button
                  type="button"
                  disabled={!slot}
                  onClick={() => setStep(3)}
                  className="rounded-[3px] bg-accent px-6 py-3 text-sm font-semibold text-bone transition-colors hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* ── step 3: details ────────────────────────────────── */}
      {step === 3 && service && slot && (
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
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[3px] border border-line font-display font-bold text-bone-3">
                {initialsOf("First Available")}
              </span>
            )}
            <div className="min-w-0 text-sm">
              <p className="font-display font-bold">
                {service.name} &middot; {formatPrice(service.priceCents)}
              </p>
              <p className="text-bone-2">
                {barber?.name ?? "First available barber"} &middot;{" "}
                {days.find((d) => d.date === date)?.weekday} {slot.label}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <Field
              label="Name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="Your name"
              autoComplete="name"
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Field
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              placeholder="(718) 555-0142"
              autoComplete="tel"
            />
            <Field
              label="Anything we should know?"
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
              placeholder="Optional — how you like it, first visit, running late"
              optional
            />
          </div>

          <p className="mt-5 text-sm text-bone-3">
            A {formatPrice(SHOP.depositCents)} deposit holds the slot; the rest is
            paid in the shop. Free to cancel up to 24 hours before.
          </p>

          {result && !result.ok && (
            <p className="mt-4 rounded-[3px] border border-accent bg-accent-dim px-4 py-3 text-sm text-bone">
              {result.message}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between">
            <BackButton onClick={() => setStep(2)} inline />
            <button
              type="button"
              disabled={submitting || !form.name || !form.email}
              onClick={submit}
              className="rounded-[3px] bg-accent px-6 py-3 text-sm font-semibold text-bone transition-colors hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/* ── small pieces ───────────────────────────────────────────── */

function BackButton({
  onClick,
  inline = false,
}: {
  onClick: () => void;
  inline?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-sm text-bone-3 transition-colors hover:text-bone ${
        inline ? "" : "mt-8"
      }`}
    >
      &larr; Back
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  optional = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  optional?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-bone-2">
        {label}
        {optional && <span className="ml-1.5 text-bone-3">optional</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[3px] border border-line bg-surface px-3.5 py-3 text-bone placeholder:text-bone-3 focus:border-bone-3 focus:outline-none"
      />
    </label>
  );
}

/** Shown when a hosted provider (Square, Booksy…) owns the calendar. */
function HostedHandoff({
  serviceSlug,
  barberSlug,
}: {
  serviceSlug: string;
  barberSlug: string | null;
}) {
  const href =
    bookingProvider.getRedirectUrl?.({ serviceSlug, barberSlug }) ?? "#";
  return (
    <div className="mt-8 rounded-[3px] border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-bold">
        Finish on {bookingProvider.label}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-bone-2">
        We&rsquo;ll carry your barber and service across so you only have to pick
        a time.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-block rounded-[3px] bg-accent px-6 py-3 text-sm font-semibold text-bone transition-colors hover:bg-accent-bright"
      >
        Continue to booking
      </a>
    </div>
  );
}
