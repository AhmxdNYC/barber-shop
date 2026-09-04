"use client";

import { useActionState, useState } from "react";
import {
  deleteGalleryPhotoAction,
  uploadGalleryPhotoAction,
  type UploadState,
} from "@/app/actions/gallery";
import { Button } from "@/components/ui/button";
import type { GalleryPhoto } from "@/lib/shop/gallery";

/**
 * Adding and removing photographs of the shop's work.
 *
 * The caption is asked for before the file rather than derived from the
 * filename, because a phone names photographs IMG_4021 and a gallery of
 * those is worse than no captions at all.
 */
export function GalleryManager({
  photos,
  barbers,
  isDurable,
}: {
  photos: GalleryPhoto[];
  barbers: { slug: string; name: string }[];
  /** False while photographs are written to the local disk only. */
  isDurable: boolean;
}) {
  const [state, action, pending] = useActionState<UploadState, FormData>(
    uploadGalleryPhotoAction,
    {},
  );
  const [filename, setFilename] = useState<string | null>(null);

  return (
    <div>
      {!isDurable && (
        <p className="mb-6 rounded-[3px] border border-brass-dim bg-brass-dim/40 px-4 py-3 text-sm text-brass">
          Photographs are being saved to this machine. They will work here and
          survive a restart, but they are not yet stored anywhere a deployed
          site can reach — see docs/GALLERY-UPLOADS.md.
        </p>
      )}

      <form
        action={action}
        className="rounded-[3px] border border-line bg-surface p-5"
      >
        <h2 className="font-display text-lg font-bold">Add a photograph</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Whose work</span>
            <select name="barberSlug" className={INPUT} defaultValue={barbers[0]?.slug}>
              {barbers.map((barber) => (
                <option key={barber.slug} value={barber.slug}>
                  {barber.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={LABEL}>What it is</span>
            <input
              name="caption"
              required
              minLength={2}
              maxLength={60}
              placeholder="Skin fade"
              className={INPUT}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className={LABEL}>Photograph</span>
            <input
              type="file"
              name="photo"
              required
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => setFilename(e.target.files?.[0]?.name ?? null)}
              className="w-full text-sm text-bone-2 file:mr-3 file:rounded-[3px] file:border file:border-line-strong file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-bone hover:file:border-bone-3"
            />
            {filename && (
              <span className="mt-1 block truncate text-xs text-bone-3">
                {filename}
              </span>
            )}
          </label>
        </div>

        {state.error && (
          <p role="alert" className="mt-4 rounded-[3px] border border-danger bg-danger-dim px-4 py-2.5 text-sm">
            {state.error}
          </p>
        )}
        {state.ok && <p className="mt-4 text-sm text-brass">{state.ok}</p>}

        <Button type="submit" disabled={pending} className="mt-4">
          {pending ? "Adding…" : "Add to the gallery"}
        </Button>

        <p className="mt-3 text-xs text-bone-3">
          JPEG, PNG, WebP or AVIF, up to 12 MB. Square-ish photographs sit best
          in the grid.
        </p>
      </form>

      <h2 className="mt-10 font-display text-lg font-bold">
        In the gallery
        <span className="ml-2 text-sm font-normal text-bone-3">
          {photos.length}
        </span>
      </h2>

      {photos.length === 0 ? (
        <p className="mt-3 rounded-[3px] border border-line bg-surface px-4 py-6 text-sm text-bone-3">
          Nothing yet. The gallery page stays hidden until there is something
          to show.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo) => (
            <figure
              key={photo.src}
              className="overflow-hidden rounded-[3px] border border-line bg-surface"
            >
              <div className="aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.src}
                  alt={photo.caption || "A cut from the shop"}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="border-t border-line p-3">
                <p className="truncate text-sm font-semibold">
                  {photo.caption || "Untitled"}
                </p>
                <p className="truncate text-xs text-bone-3">
                  {photo.barberName ?? "No barber named"}
                </p>
                <form action={deleteGalleryPhotoAction} className="mt-2">
                  <input type="hidden" name="src" value={photo.src} />
                  <button
                    type="submit"
                    className="text-xs text-bone-3 transition-colors hover:text-danger"
                  >
                    Remove
                  </button>
                </form>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

const LABEL = "mb-1 block text-[0.65rem] uppercase tracking-[0.1em] text-bone-3";
const INPUT =
  "w-full rounded-[3px] border border-line bg-surface-2 px-3 py-2 text-sm text-bone placeholder:text-bone-3 focus:border-bone-3 focus:outline-none";
