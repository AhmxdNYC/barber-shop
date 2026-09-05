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
      className="group relative flex flex-row overflow-hidden rounded-[3px] border border-line bg-surface transition-colors hover:border-line-strong focus-visible:border-brass sm:flex-col"
    >
      {/* Four portraits at four-fifths of the screen width is most of a
          phone's scroll spent on faces. On a phone this is a row; from the
          small breakpoint up it is the portrait tile again. */}
      <div className="relative aspect-square w-24 shrink-0 overflow-hidden bg-surface-2 sm:aspect-4/5 sm:w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={barber.photo}
          alt={`${barber.name}, barber at the shop`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 hidden h-24 bg-gradient-to-t from-surface to-transparent sm:block" />
        {barber.isPlaceholder ? (
          // Only badge a chair whose photograph is still a stand-in; a real
          // portrait with a name yet to come needs no label across the face.
          barber.photo.endsWith(".svg") ? (
            <span className="absolute left-2 top-2 rounded-full border border-line-strong bg-ground/80 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-bone-3 backdrop-blur-sm sm:left-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-[0.65rem]">
              Placeholder
            </span>
          ) : null
        ) : (
          <span className="absolute left-2 top-2 rounded-full border border-line-strong bg-ground/80 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-brass backdrop-blur-sm sm:left-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-[0.65rem]">
            {barber.yearsExperience} yrs
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <h3 className="truncate font-display text-lg font-bold leading-tight sm:text-xl">
          {barber.name}
        </h3>
        <p className="mt-0.5 truncate text-sm text-accent">{barber.specialty}</p>
        <div className="flex-1" />

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 sm:mt-5 sm:pt-4">
          <span className="truncate text-xs text-bone-3">
            {barber.isPlaceholder ? (
              "Awaiting details"
            ) : (
              <>
                Next open
                <span className="ml-1.5 text-bone-2">{barber.nextAvailable}</span>
              </>
            )}
          </span>
          <span className="shrink-0 text-sm font-semibold text-bone transition-colors group-hover:text-accent">
            Book &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
