import type { Metadata } from "next";
import { SHOP, ADDRESS_LINE, HOURS, formatHours } from "@/lib/shop";
import { qrSvg, SITE_URL } from "@/lib/qr";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = {
  title: "Printable QR poster",
  description: "Scan-to-book poster for the shop window.",
  robots: { index: false, follow: false },
};

/**
 * A print-ready scan-to-book poster.
 *
 * Deliberately not linked from the site — it is a tool for the shop, not a
 * page for clients. Print styles force it to black on white: the site is
 * dark, and a dark QR poster both burns a cartridge dry and scans badly.
 */
export default async function PosterPage() {
  const svg = await qrSvg();

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <div className="print:hidden">
        <span className="eyebrow">For the shop</span>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
          Scan-to-book poster
        </h1>
        <p className="mt-3 max-w-xl text-bone-2">
          Print this and put it on the window, the mirror, or the counter. Any
          phone camera opens it &mdash; no app needed.
        </p>

        <div className="mt-5 rounded-[3px] border border-brass-dim bg-brass-dim/40 p-4 text-sm text-brass">
          <strong className="font-semibold">
            Test it before you print a stack.
          </strong>{" "}
          Scan the code below with your own phone and confirm it opens the site.
          A printed code can never be corrected &mdash; it points at{" "}
          <span className="break-all font-semibold">{SITE_URL}</span> forever.
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
        <div className="poster__stripe" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>

        <h2 className="mt-7 font-display text-4xl font-extrabold leading-tight tracking-tight">
          {SHOP.name}
        </h2>

        <p className="mt-3 text-lg font-semibold uppercase tracking-[0.14em]">
          Book online
        </p>

        <div
          className="poster__qr mx-auto mt-7"
          aria-label={`QR code linking to ${SITE_URL}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <p className="mt-5 text-base font-semibold">
          Point your camera at the code
        </p>
        <p className="mt-1 text-sm text-neutral-600">No app needed</p>

        <div className="mt-8 border-t border-neutral-300 pt-6 text-sm">
          <p className="font-semibold">{SHOP.address.line1}</p>
          <p className="text-neutral-700">
            {SHOP.address.city}, {SHOP.address.state} {SHOP.address.postalCode}
          </p>
          <p className="mt-2 font-semibold tabular-nums">{SHOP.phone}</p>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-neutral-700">
          {HOURS.map((d) => (
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
