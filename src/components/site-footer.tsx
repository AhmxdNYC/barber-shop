import Link from "next/link";
import { SHOP, formatHours, ADDRESS_LINE, type DayHours } from "@/lib/shop";
import { Wordmark } from "@/components/ui/wordmark";

export function SiteFooter({ hours }: { hours: DayHours[] }) {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="pole-stripe mb-4" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <Wordmark as="h2" className="text-lg" />
          <p className="mt-2 max-w-[28ch] text-sm text-bone-2">{SHOP.tagline}</p>
        </div>

        <div>
          <h4 className="eyebrow">Shop hours</h4>
          <ul className="mt-4 space-y-1.5 text-sm">
            {hours.map((d) => (
              <li key={d.day} className="flex justify-between gap-4 text-bone-2">
                <span>{d.short}</span>
                <span
                  className={
                    d.opens === null ? "text-bone-3" : "tabular-nums text-bone"
                  }
                >
                  {formatHours(d)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="eyebrow">Visit</h4>
          <address className="mt-4 space-y-2 text-sm not-italic text-bone-2">
            <p>{SHOP.address.line1}</p>
            <p>
              {SHOP.address.city}, {SHOP.address.state} {SHOP.address.postalCode}
            </p>
            <p>
              <a href={`tel:${SHOP.phone.replace(/\D/g, "")}`} className="hover:text-bone">
                {SHOP.phone}
              </a>
            </p>
          </address>
        </div>

        <div>
          <h4 className="eyebrow">More</h4>
          <ul className="mt-4 space-y-2 text-sm text-bone-2">
            <li><Link href="/services" className="hover:text-bone">Services & prices</Link></li>
            <li><Link href="/barbers" className="hover:text-bone">Meet the barbers</Link></li>
            <li><Link href="/gallery" className="hover:text-bone">Gallery</Link></li>
            {SHOP.instagram && (
              <li>
                <a href={SHOP.instagram} className="hover:text-bone" rel="noreferrer" target="_blank">
                  Instagram
                </a>
              </li>
            )}
            <li>
              <a href={SHOP.mapUrl} className="hover:text-bone" rel="noreferrer" target="_blank">
                Get directions
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-bone-3 sm:flex-row sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {SHOP.name}. {ADDRESS_LINE}.
          </p>
          <p>Walk-ins welcome when a chair is open.</p>
        </div>
      </div>
    </footer>
  );
}
