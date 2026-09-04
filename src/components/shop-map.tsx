import { SHOP, ADDRESS_LINE } from "@/lib/shop";

/**
 * Google Maps panel.
 *
 * Uses the keyless `output=embed` endpoint, which Google redirects to the
 * same `/maps/embed?pb=…` URL that "Share → Embed a map" produces — no API
 * key and no billing account.
 *
 * The iframe is deliberately inert (`pointer-events: none`). A live embed
 * swallows page scroll and pans when you are only trying to get past it,
 * which is the single most irritating thing an embedded map does. Nobody
 * needs to pan a map to learn where a barbershop is — they need to see it
 * and then get directions. So this is a picture of the location, and the
 * whole panel opens the real Google Maps listing in a new tab.
 */
export function ShopMap() {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(
    SHOP.mapQuery,
  )}&z=17&output=embed`;

  return (
    <figure className="overflow-hidden rounded-[3px] border border-line bg-surface">
      <a
        href={SHOP.mapUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${SHOP.name} at ${ADDRESS_LINE} in Google Maps`}
        className="map-frame group relative block aspect-4/3 w-full"
      >
        <iframe
          src={src}
          title=""
          aria-hidden="true"
          tabIndex={-1}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="pointer-events-none absolute inset-0 h-full w-full border-0"
        />
        {/* Blends the panel edges into the page. */}
        <span className="map-frame__tint" aria-hidden="true" />

        <span className="pointer-events-none absolute bottom-3 right-3 rounded-[3px] border border-line-strong bg-ground/85 px-3 py-1.5 text-xs font-semibold text-bone-2 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          Open in Google Maps &#8599;
        </span>
      </a>

      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3.5">
        <div className="text-sm">
          <p className="font-display font-bold">{SHOP.name}</p>
          <p className="text-bone-2">{ADDRESS_LINE}</p>
        </div>
        <a
          href={SHOP.mapUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-[3px] border border-line-strong px-4 py-2 text-sm font-semibold transition-colors hover:border-bone-3"
        >
          Directions
        </a>
      </figcaption>
    </figure>
  );
}
