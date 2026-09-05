import { SHOP } from "@/lib/shop";
import type { ShopRating } from "@/lib/shop/rating";

/**
 * Google rating, in the hero.
 *
 * The single most persuasive thing on the page is that other people in this
 * neighbourhood already rate the shop, so it sits directly under the name
 * rather than in a testimonials section nobody scrolls to.
 *
 * The stars are drawn from a clipped overlay rather than rounded to the
 * nearest whole or half star: 4.6 should look like 4.6.
 */
export function ShopRating({ rating }: { rating: ShopRating }) {
  const percent = (rating.value / 5) * 100;

  return (
    <a
      href={SHOP.mapUrl}
      target="_blank"
      rel="noreferrer"
      className="group mt-6 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/70 py-1.5 pl-3 pr-4 backdrop-blur-sm transition-colors hover:border-line-strong"
    >
      <span className="relative inline-block leading-none" aria-hidden="true">
        <span className="flex text-sm tracking-[0.1em] text-line-strong">
          {"★★★★★"}
        </span>
        <span
          className="absolute inset-0 flex overflow-hidden text-sm tracking-[0.1em] text-off"
          style={{ width: `${percent}%` }}
        >
          {"★★★★★"}
        </span>
      </span>

      <span className="text-sm text-bone-2">
        <span className="font-semibold tabular-nums text-bone">
          {rating.value.toFixed(1)}
        </span>{" "}
        from{" "}
        <span className="tabular-nums">{rating.count}</span> Google review
        {rating.count === 1 ? "" : "s"}
      </span>

      <span className="sr-only">
        Rated {rating.value.toFixed(1)} out of 5 from {rating.count} Google
        reviews. Opens the listing in a new tab.
      </span>
    </a>
  );
}
