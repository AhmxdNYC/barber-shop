import Link from "next/link";
import type { Barber } from "@/lib/shop";

type Props = {
  barber: Barber;
  /** Where the card's primary action goes. */
  href: string;
  /** Compact variant used inside the booking picker. */
  selected?: boolean;
  as?: "link" | "button";
  onSelect?: () => void;
};

/**
 * The portrait tile used on the barbers page and in the booking picker.
 * The photo is a duotone placeholder until real photographs land at the
 * same path.
 */
export function BarberCard({ barber, href }: Props) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-[3px] border border-line bg-surface transition-colors hover:border-line-strong focus-visible:border-brass"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={barber.photo}
          alt={`${barber.name}, barber at the shop`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
        {barber.isPlaceholder ? (
          // Only badge a chair whose photograph is still a stand-in; a real
          // portrait with a name yet to come needs no label across the face.
          barber.photo.endsWith(".svg") ? (
            <span className="absolute left-4 top-4 rounded-full border border-line-strong bg-ground/80 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-bone-3 backdrop-blur-sm">
              Placeholder
            </span>
          ) : null
        ) : (
          <span className="absolute left-4 top-4 rounded-full border border-line-strong bg-ground/80 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-brass backdrop-blur-sm">
            {barber.yearsExperience} yrs
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-bold leading-tight">
          {barber.name}
        </h3>
        <p className="mt-1 text-sm text-accent">{barber.specialty}</p>
        <div className="flex-1" />

        <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
          <span className="text-xs text-bone-3">
            {barber.isPlaceholder ? (
              "Awaiting details"
            ) : (
              <>
                Next open
                <span className="ml-1.5 text-bone-2">{barber.nextAvailable}</span>
              </>
            )}
          </span>
          <span className="text-sm font-semibold text-bone transition-colors group-hover:text-accent">
            Book &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
