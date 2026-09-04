import Link from "next/link";
import { BARBERS } from "@/lib/shop";
import { BarberCard } from "./barber-card";

/**
 * The roster, with a link to each barber's work.
 *
 * Shared by the landing page and the barbers page rather than duplicated:
 * the "see their work" link was added to one and not the other, which is
 * exactly what happens when the same block of markup lives in two files.
 */
export function BarberGrid({
  barbersWithWork,
}: {
  /** Slugs of barbers who have photographs, so the link only shows when there is something to see. */
  barbersWithWork: Set<string>;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {BARBERS.map((barber) => (
        <div key={barber.slug} className="flex flex-col gap-2">
          <BarberCard barber={barber} href={`/book?barber=${barber.slug}`} />
          {barbersWithWork.has(barber.slug) && (
            <Link
              href={`/gallery?barber=${barber.slug}`}
              className="rounded-[3px] border border-line px-4 py-2.5 text-center text-sm font-semibold text-bone-2 transition-colors hover:border-line-strong hover:text-bone"
            >
              See their work
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
