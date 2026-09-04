import Link from "next/link";
import {
  SHOP,
  SERVICES,
  BARBERS,
  HOURS,
  formatPrice,
  formatDuration,
  formatHours,
} from "@/lib/shop";
import { BarberCard } from "@/components/barber-card";
import { ShopMap } from "@/components/shop-map";
import { ButtonLink } from "@/components/ui/button";

const todayIndex = () => new Date().getDay();

export default function HomePage() {
  const popular = SERVICES.filter((s) => s.popular);
  const today = HOURS[todayIndex()];

  return (
    <>
      {/* ── hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-accent/12 blur-[120px]"
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-20 sm:pt-28">
          <span className="pole-stripe mb-8" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>

          <h1 className="max-w-4xl font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.035em] sm:text-7xl lg:text-8xl">
            {SHOP.name}
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-relaxed text-bone-2 sm:text-xl">
            {SHOP.tagline}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/book">Book a chair</ButtonLink>
            <ButtonLink href="/barbers" variant="outline">
              Pick your barber
            </ButtonLink>
          </div>

          {/* live-ish status strip */}
          <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-8 border-t border-line pt-8 sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-bone-3">
                Today
              </dt>
              <dd className="mt-1.5 font-display text-lg font-bold tabular-nums">
                {formatHours(today)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-bone-3">
                Chairs
              </dt>
              <dd className="mt-1.5 font-display text-lg font-bold tabular-nums">
                {BARBERS.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-bone-3">
                Deposit
              </dt>
              <dd className="mt-1.5 font-display text-lg font-bold tabular-nums">
                {formatPrice(SHOP.depositCents)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.12em] text-bone-3">
                Walk-ins
              </dt>
              <dd className="mt-1.5 font-display text-lg font-bold">Welcome</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── barbers ──────────────────────────────────────────── */}
      <section id="barbers" className="mx-auto max-w-6xl px-5 py-20">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="eyebrow">The chairs</span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Book the barber, not just the slot
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-bone-2">
              Everyone here cuts differently. Pick the hands you want and we&rsquo;ll
              only show you times that chair is actually free.
            </p>
          </div>
          <Link
            href="/barbers"
            className="text-sm font-semibold text-bone-2 transition-colors hover:text-bone"
          >
            All barbers &rarr;
          </Link>
        </header>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BARBERS.map((barber) => (
            <BarberCard
              key={barber.slug}
              barber={barber}
              href={`/book?barber=${barber.slug}`}
            />
          ))}
        </div>
      </section>

      {/* ── services ─────────────────────────────────────────── */}
      <section id="services" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow">The menu</span>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                What it costs
              </h2>
            </div>
            <Link
              href="/services"
              className="text-sm font-semibold text-bone-2 transition-colors hover:text-bone"
            >
              Full menu &rarr;
            </Link>
          </header>

          <ul className="mt-10 divide-y divide-line border-y border-line">
            {SERVICES.slice(0, 5).map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/book?service=${service.slug}`}
                  className="group flex items-baseline gap-4 py-5 transition-colors hover:bg-surface-2"
                >
                  <span className="font-display text-lg font-bold transition-colors group-hover:text-accent">
                    {service.name}
                  </span>
                  {service.popular && (
                    <span className="rounded-full border border-brass-dim bg-brass-dim px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-brass">
                      Most booked
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="mx-1 hidden flex-1 translate-y-[-3px] border-b border-dotted border-line-strong sm:block"
                  />
                  <span className="ml-auto shrink-0 text-sm text-bone-3 sm:ml-0">
                    {formatDuration(service.durationMinutes)}
                  </span>
                  <span className="w-16 shrink-0 text-right font-display text-lg font-bold tabular-nums">
                    {formatPrice(service.priceCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-bone-3">
            A {formatPrice(SHOP.depositCents)} deposit holds your slot. The rest
            is paid in the shop.
          </p>

          {popular.length > 0 && (
            <p className="sr-only">
              Most booked: {popular.map((s) => s.name).join(", ")}.
            </p>
          )}
        </div>
      </section>

      {/* ── visit ────────────────────────────────────────────── */}
      <section id="visit" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <span className="eyebrow">Visit</span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Where to find us
            </h2>
            <address className="mt-6 space-y-1 text-lg not-italic text-bone-2">
              <p className="text-bone">{SHOP.address.line1}</p>
              <p>
                {SHOP.address.city}, {SHOP.address.state}{" "}
                {SHOP.address.postalCode}
              </p>
            </address>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={SHOP.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-[3px] border border-line-strong px-5 py-2.5 text-sm font-semibold transition-colors hover:border-bone-3"
              >
                Directions
              </a>
              <a
                href={`tel:${SHOP.phone.replace(/\D/g, "")}`}
                className="rounded-[3px] border border-line-strong px-5 py-2.5 text-sm font-semibold transition-colors hover:border-bone-3"
              >
                {SHOP.phone}
              </a>
            </div>
          </div>

          <div>
            <ShopMap />
            <h3 className="eyebrow mt-10 block">Hours</h3>
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {HOURS.map((d, i) => {
                const isToday = i === todayIndex();
                return (
                  <li
                    key={d.day}
                    className={`flex items-center justify-between py-3.5 ${
                      isToday ? "text-bone" : "text-bone-2"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {d.day}
                      {isToday && (
                        <span className="rounded-full bg-accent-dim px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-accent">
                          Today
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        d.opens === null ? "text-bone-3" : "tabular-nums"
                      }
                    >
                      {formatHours(d)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
