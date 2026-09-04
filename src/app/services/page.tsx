import type { Metadata } from "next";
import Link from "next/link";
import { SHOP, formatPrice } from "@/lib/shop";
import { liveServices } from "@/lib/shop/live-services";
import { PriceRow } from "@/components/ui/price-row";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Services & Prices",
  description: "Every service, what it costs and how long it takes.",
};

export const revalidate = 3600;

export default async function ServicesPage() {
  const services = await liveServices();

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
        {services.map((service) => (
          <li key={service.slug}>
            <Link
              href={`/book?service=${service.slug}`}
              className="group block py-6 transition-colors hover:bg-surface"
            >
              <PriceRow service={service} />
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
        <ButtonLink href="/book" className="mt-5">
          Book a chair
        </ButtonLink>
      </div>
    </div>
  );
}
