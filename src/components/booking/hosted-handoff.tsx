import { bookingProvider } from "@/lib/booking";

/** Shown when a hosted provider (Square, Fresha, Booksy…) owns the calendar. */
export function HostedHandoff({
  serviceSlug,
  barberSlug,
}: {
  serviceSlug: string;
  barberSlug: string | null;
}) {
  const href = bookingProvider.getRedirectUrl?.({ serviceSlug, barberSlug }) ?? "#";
  return (
    <div className="mt-8 rounded-[3px] border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-bold">
        Finish on {bookingProvider.label}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-bone-2">
        We&rsquo;ll carry your barber and service across, so you only have to
        pick a time.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mt-5 inline-block rounded-[3px] bg-accent px-6 py-3 text-sm font-semibold text-bone transition-colors hover:bg-accent-bright"
      >
        Continue to booking
      </a>
    </div>
  );
}
