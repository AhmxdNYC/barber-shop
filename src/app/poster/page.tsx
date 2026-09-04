import type { Metadata } from "next";
import { SHOP, ADDRESS_LINE, formatHours } from "@/lib/shop";
import { openingHours } from "@/lib/shop/opening-hours";
import { qrSvg, SITE_URL } from "@/lib/qr";
import { PrintButton } from "@/components/print-button";
import { Wordmark } from "@/components/ui/wordmark";

export const metadata: Metadata = {
  title: "Printable QR poster",
  description: "Scan-to-book poster for the shop window.",
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

/**
 * A print-ready scan-to-book poster.
 *
 * Everything above the poster is screen-only guidance; the poster itself is
 * always black on white. The site is a black page, and printing that would
 * empty a cartridge and produce a low-contrast code that scans badly under
 * shop lighting.
 */
export default async function PosterPage() {
  const [svg, hours] = await Promise.all([qrSvg(), openingHours()]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="print:hidden">
        <span className="eyebrow">For the shop</span>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
          Scan-to-book poster
        </h1>
        <p className="mt-3 max-w-xl text-bone-2">
          Print it for the window, the mirror, or the counter. Any phone camera
          opens it &mdash; no app needed.
        </p>

        <div className="mt-5 rounded-[3px] border border-line bg-surface p-4 text-sm text-bone-2">
          <strong className="font-semibold text-bone">
            Scan it yourself before printing a stack.
          </strong>{" "}
          A printed code can never be corrected &mdash; it points at{" "}
          <span className="break-all text-bone">{SITE_URL}</span> for as long as
          the paper exists. Print one, scan the paper rather than the screen,
          then run off the rest.
        </div>

        <div className="mt-6">
          <PrintButton />
        </div>

        <hr className="my-10 border-line" />
        <p className="mb-4 text-sm text-bone-3">
          Preview &mdash; prints black on white:
        </p>
      </div>

      <article className="poster mx-auto w-full max-w-[520px] bg-white px-10 py-12 text-center text-black">
        <Wordmark as="h2" tone="dark" className="block text-4xl" />

        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.22em] text-neutral-600">
          Book online
        </p>

        <div
          className="poster__qr mx-auto mt-8"
          aria-label={`QR code linking to ${SITE_URL}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <p className="mt-6 text-base font-semibold">
          Point your camera at the code
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          No app, no account &mdash; pick a barber and a time.
        </p>

        <div className="mt-8 border-t border-neutral-300 pt-6 text-sm">
          <p className="font-semibold">{SHOP.address.line1}</p>
          <p className="text-neutral-700">
            {SHOP.address.city}, {SHOP.address.state} {SHOP.address.postalCode}
          </p>
          <p className="mt-2 font-semibold tabular-nums">{SHOP.phone}</p>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-neutral-700">
          {hours.map((d) => (
            <li key={d.day} className="flex justify-between">
              <span>{d.short}</span>
              <span className="tabular-nums">{formatHours(d)}</span>
            </li>
          ))}
        </ul>
      </article>

      <p className="mt-6 text-center text-xs text-bone-3 print:hidden">
        {ADDRESS_LINE}
      </p>
    </div>
  );
}
