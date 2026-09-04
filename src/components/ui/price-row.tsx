import { formatDuration, formatPrice, type Service } from "@/lib/shop";

/**
 * One line of the price menu — the dotted-leader row used on the landing
 * page, the services page and inside the booking flow. Three copies of this
 * markup drifted apart before it was extracted.
 */
export function PriceRow({
  service,
  showPopular = true,
}: {
  service: Service;
  showPopular?: boolean;
}) {
  return (
    <div className="flex w-full items-baseline gap-3 text-left">
      <span className="font-display font-bold transition-colors group-hover:text-accent">
        {service.name}
      </span>
      {showPopular && service.popular && (
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
      <span className="w-14 shrink-0 text-right font-display font-bold tabular-nums">
        {formatPrice(service.priceCents)}
      </span>
    </div>
  );
}
