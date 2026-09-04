import type { Metadata } from "next";
import Link from "next/link";
import { SHOP, SERVICES, formatPrice, formatDuration } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Services & Prices",
  description: "Every service, what it costs and how long it takes.",
};

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <header className="max-w-2xl">
        <span className="eyebrow">The menu</span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Services &amp; prices
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-bone-2">
          Everything we do, what it costs, and roughly how long you&rsquo;ll be in
          the chair. Prices are the same at every chair.
        </p>
      </header>

      <ul className="mt-12 divide-y divide-line border-y border-line">
        {SERVICES.map((service) => (
          <li key={service.slug}>
            <Link
              href={`/book?service=${service.slug}`}
              className="group block py-6 transition-colors hover:bg-surface"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <h2 className="font-display text-xl font-bold transition-colors group-hover:text-accent">
                  {service.name}
                </h2>
                {service.popular && (
                  <span className="rounded-full border border-brass-dim bg-brass-dim px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-brass">
                    Most booked
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="mx-1 hidden flex-1 translate-y-[-4px] border-b border-dotted border-line-strong sm:block"
                />
                <span className="text-sm text-bone-3">
                  {formatDuration(service.durationMinutes)}
                </span>
                <span className="ml-auto font-display text-xl font-bold tabular-nums sm:ml-0 sm:w-20 sm:text-right">
                  {formatPrice(service.priceCents)}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-bone-2">
                {service.description}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-[3px] border border-line bg-surface p-6">
        <h3 className="font-display text-lg font-bold">How payment works</h3>
        <p className="mt-2 text-sm leading-relaxed text-bone-2">
          A {formatPrice(SHOP.depositCents)} deposit holds your slot when you book
          online. The balance is paid in the shop, cash or card. Cancel more than
          24 hours ahead and the deposit comes straight back.
        </p>
        <Link
          href="/book"
          className="mt-5 inline-block rounded-[3px] bg-accent px-6 py-3 text-sm font-semibold text-bone transition-colors hover:bg-accent-bright"
        >
          Book a chair
        </Link>
      </div>
    </div>
  );
}
