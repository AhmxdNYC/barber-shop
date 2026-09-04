"use client";

import { useEffect, useState } from "react";
import type { GalleryPhoto } from "@/lib/shop/gallery";

/**
 * The cut gallery, with a full-screen view.
 *
 * Opening a photograph is the point of a gallery — a thumbnail of a fade
 * shows almost nothing, and the detail in the blend is the work being
 * advertised. Arrow keys and Escape are wired up because once something is
 * full screen those are the keys people reach for.
 */
export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const open = openIndex === null ? null : photos[openIndex];

  useEffect(() => {
    if (openIndex === null) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowRight") {
        setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length));
      }
      if (event.key === "ArrowLeft") {
        setOpenIndex((i) =>
          i === null ? i : (i - 1 + photos.length) % photos.length,
        );
      }
    }

    window.addEventListener("keydown", onKey);
    // Stop the page scrolling behind the overlay.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [openIndex, photos.length]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo.src}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-label={`View ${photo.caption || "photograph"} full screen`}
            className="group relative aspect-square overflow-hidden rounded-[3px] border border-line bg-surface text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.caption || "A cut from the shop"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ground via-ground/70 to-transparent" />
            <span className="absolute inset-x-0 bottom-0 p-3">
              {photo.caption && (
                <span className="block font-display text-sm font-bold">
                  {photo.caption}
                </span>
              )}
              {photo.barberName && (
                <span className="block text-xs text-bone-2">
                  by {photo.barberName}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ground/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={open.caption || "Photograph"}
          onClick={() => setOpenIndex(null)}
        >
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              {open.caption && (
                <p className="truncate font-display text-lg font-bold">
                  {open.caption}
                </p>
              )}
              {open.barberName && (
                <p className="text-sm text-bone-2">by {open.barberName}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              aria-label="Close"
              className="shrink-0 rounded-[3px] border border-line-strong px-3 py-1.5 text-sm text-bone-2 hover:text-bone"
            >
              Close
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={open.src}
              alt={open.caption || "A cut from the shop"}
              onClick={(event) => event.stopPropagation()}
              className="max-h-full max-w-full rounded-[3px] object-contain"
            />
          </div>

          {photos.length > 1 && (
            <div
              className="flex items-center justify-center gap-3 pb-6"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenIndex((i) =>
                    i === null ? i : (i - 1 + photos.length) % photos.length,
                  )
                }
                className="rounded-[3px] border border-line-strong px-4 py-2 text-sm hover:border-bone-3"
              >
                &larr; Previous
              </button>
              <span className="text-sm tabular-nums text-bone-3">
                {(openIndex ?? 0) + 1} of {photos.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setOpenIndex((i) => (i === null ? i : (i + 1) % photos.length))
                }
                className="rounded-[3px] border border-line-strong px-4 py-2 text-sm hover:border-bone-3"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
