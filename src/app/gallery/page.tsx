import type { Metadata } from "next";
import Link from "next/link";
import { galleryPhotos } from "@/lib/shop/gallery";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Recent work from the shop.",
};

export const revalidate = 3600;

export default async function GalleryPage() {
  const photos = await galleryPhotos();

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="max-w-2xl">
        <span className="eyebrow">The work</span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Recent cuts
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-bone-2">
          Work from the chairs at Eduardo&rsquo;s.
        </p>
      </header>

      {photos.length === 0 ? (
        <div className="mt-12 rounded-[3px] border border-dashed border-line-strong bg-surface p-12 text-center">
          <p className="font-display text-lg font-bold">No photographs yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-bone-2">
            Photographs of the shop&rsquo;s own work go here. Until there are
            some, this page stays out of the way rather than filling itself
            with placeholders.
          </p>
          <Link
            href="/book"
            className="mt-6 inline-block rounded-[3px] bg-accent px-6 py-3 text-sm font-semibold text-bone transition-colors hover:bg-accent-bright"
          >
            Book a chair
          </Link>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {photos.map((photo) => (
            <figure
              key={photo.src}
              className="group relative aspect-square overflow-hidden rounded-[3px] border border-line bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.caption || "A cut from the shop"}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              {photo.caption && (
                <>
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-ground to-transparent" />
                  <figcaption className="absolute inset-x-0 bottom-0 p-3">
                    <p className="font-display text-sm font-bold">
                      {photo.caption}
                    </p>
                  </figcaption>
                </>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
