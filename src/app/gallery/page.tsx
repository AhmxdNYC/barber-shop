import type { Metadata } from "next";
import Link from "next/link";
import { barbersWithPhotos, galleryPhotos } from "@/lib/shop/gallery";
import { GalleryGrid } from "@/components/gallery-grid";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Recent work from the shop.",
};

export const revalidate = 3600;

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string }>;
}) {
  const { barber: filter } = await searchParams;
  const all = await galleryPhotos();
  const barbers = barbersWithPhotos(all);

  const photos = filter ? all.filter((p) => p.barberSlug === filter) : all;
  const filtered = barbers.find((b) => b.slug === filter);

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="max-w-2xl">
        <span className="eyebrow">The work</span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          {filtered ? `Cuts by ${filtered.name}` : "Recent cuts"}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-bone-2">
          {filtered
            ? `Work from ${filtered.name}'s chair.`
            : "Work from the chairs at Eduardo’s."}
        </p>
      </header>

      {/* Only worth showing once more than one barber has photographs. */}
      {barbers.length > 1 && (
        <nav className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/gallery"
            className={`rounded-[3px] border px-4 py-2 text-sm font-semibold transition-colors ${
              filter
                ? "border-line text-bone-2 hover:border-line-strong"
                : "border-accent bg-accent-dim text-bone"
            }`}
          >
            Everyone
          </Link>
          {barbers.map((barber) => (
            <Link
              key={barber.slug}
              href={`/gallery?barber=${barber.slug}`}
              className={`rounded-[3px] border px-4 py-2 text-sm font-semibold transition-colors ${
                filter === barber.slug
                  ? "border-accent bg-accent-dim text-bone"
                  : "border-line text-bone-2 hover:border-line-strong"
              }`}
            >
              {barber.name}
            </Link>
          ))}
        </nav>
      )}

      {photos.length === 0 ? (
        <div className="mt-12 rounded-[3px] border border-dashed border-line-strong bg-surface p-12 text-center">
          <p className="font-display text-lg font-bold">
            {filtered ? `No photographs from ${filtered.name} yet` : "No photographs yet"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-bone-2">
            {filtered
              ? "There is work from the other chairs in the meantime."
              : "Photographs of the shop’s own work go here. Until there are some, this page stays out of the way rather than filling itself with placeholders."}
          </p>
          <Link
            href={filtered ? "/gallery" : "/book"}
            className="mt-6 inline-block rounded-[3px] bg-bone px-6 py-3 text-sm font-semibold text-ground transition-colors hover:bg-white"
          >
            {filtered ? "See every cut" : "Book a chair"}
          </Link>
        </div>
      ) : (
        <div className="mt-10">
          <GalleryGrid photos={photos} />
        </div>
      )}

      {filtered && photos.length > 0 && (
        <div className="mt-10 border-t border-line pt-8">
          <Link
            href={`/book?barber=${filtered.slug}`}
            className="inline-block rounded-[3px] bg-bone px-6 py-3 text-sm font-semibold text-ground transition-colors hover:bg-white"
          >
            Book with {filtered.name}
          </Link>
        </div>
      )}
    </div>
  );
}
