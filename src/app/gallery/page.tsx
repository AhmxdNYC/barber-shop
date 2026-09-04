import type { Metadata } from "next";
import Link from "next/link";
import { BARBERS } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Recent work from the shop.",
};

/** Placeholder tiles until real photographs are uploaded. */
const CUTS = [
  { id: 1, label: "Skin fade", barber: "Eduardo" },
  { id: 2, label: "Textured crop", barber: "Sami Haddad" },
  { id: 3, label: "Beard sculpt", barber: "Andre Ruiz" },
  { id: 4, label: "Classic side part", barber: "Tony Vega" },
  { id: 5, label: "Mid taper", barber: "Eduardo" },
  { id: 6, label: "Hot towel shave", barber: "Andre Ruiz" },
  { id: 7, label: "Scissor crop", barber: "Sami Haddad" },
  { id: 8, label: "Kids cut", barber: "Tony Vega" },
];

const TONES = [
  "from-accent/25",
  "from-brass/20",
  "from-bone/10",
  "from-accent/15",
];

export default function GalleryPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="max-w-2xl">
        <span className="eyebrow">The work</span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Recent cuts
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-bone-2">
          Photographs go here. Until then, these tiles hold the layout so the
          page is ready the moment real pictures land.
        </p>
      </header>

      <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {CUTS.map((cut, i) => (
          <figure
            key={cut.id}
            className="group relative aspect-square overflow-hidden rounded-[3px] border border-line bg-surface"
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                TONES[i % TONES.length]
              } to-transparent`}
            />
            <figcaption className="absolute inset-x-0 bottom-0 p-4">
              <p className="font-display text-sm font-bold">{cut.label}</p>
              <p className="text-xs text-bone-3">{cut.barber}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-12 border-t border-line pt-8">
        <p className="text-bone-2">
          Like someone&rsquo;s work?{" "}
          <Link href="/barbers" className="text-accent hover:text-accent-bright">
            Book that barber directly
          </Link>{" "}
          &mdash; all {BARBERS.length} chairs take online bookings.
        </p>
      </div>
    </div>
  );
}
