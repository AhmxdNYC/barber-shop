import { SHOP, ADDRESS_LINE } from "@/lib/shop";

/**
 * Google Maps embed.
 *
 * Uses the keyless `output=embed` endpoint, which Google redirects to the
 * same `/maps/embed?pb=…` URL that "Share → Embed a map" produces. No API
 * key, no billing account — unlike the Maps Embed API, which requires both.
 *
 * The map itself is light, so it sits inside a dark frame with the address
 * bar beneath it. That makes it read as a deliberate panel rather than a
 * bright iframe dropped onto a dark page.
 */
export function ShopMap() {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(
    SHOP.mapQuery,
  )}&z=17&output=embed`;

  return (
    <figure className="overflow-hidden rounded-[3px] border border-line bg-surface">
      <div className="relative aspect-4/3 w-full">
        <iframe
          src={src}
          title={`Map showing ${SHOP.name} at ${ADDRESS_LINE}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>

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
