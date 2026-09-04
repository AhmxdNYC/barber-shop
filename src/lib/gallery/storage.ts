import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Where gallery photographs are kept.
 *
 * The seam is here for the same reason as the booking provider: a deployed
 * app cannot write to its own filesystem — Vercel's is read-only and a
 * container's is wiped on redeploy — so this has to become object storage
 * before it runs anywhere but a laptop. Behind an interface, that is one
 * adapter rather than a rewrite of the screen that uses it.
 *
 * The local implementation is not a stub. It genuinely writes files, so the
 * upload screen is exercised properly rather than mimed.
 */

export type StoredPhoto = { src: string };

export interface GalleryStorage {
  readonly id: string;
  /** True when photographs written here survive a deployment. */
  readonly isDurable: boolean;
  save(input: {
    barberSlug: string;
    caption: string;
    bytes: Buffer;
    extension: string;
    sortHint: number;
  }): Promise<StoredPhoto>;
  remove(src: string): Promise<void>;
}

/** Only formats a browser will actually render. */
export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

/** Phone photographs are a few megabytes; beyond this something is wrong. */
export const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Turns a caption into a filename fragment.
 *
 * The uploaded filename is never used. It is attacker-controlled input on a
 * path, and sanitising one is a game you can lose; generating our own is a
 * game you cannot.
 */
export function slugifyCaption(caption: string): string {
  const slug = caption
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "cut";
}

const GALLERY_ROOT = path.join(process.cwd(), "public", "gallery");

export const localDiskStorage: GalleryStorage = {
  id: "local-disk",
  isDurable: false,

  async save({ barberSlug, caption, bytes, extension, sortHint }) {
    // The slug decides a directory name, so it is rebuilt from a safe
    // alphabet rather than trusted. Path traversal cannot survive this.
    const safeBarber = barberSlug.replace(/[^a-z0-9-]/g, "").slice(0, 60);
    if (!safeBarber) throw new Error("Unknown barber.");

    const dir = path.join(GALLERY_ROOT, safeBarber);
    await mkdir(dir, { recursive: true });

    const order = String(sortHint).padStart(2, "0");
    // A short random suffix avoids clobbering an existing photograph with
    // the same caption.
    const unique = randomBytes(3).toString("hex");
    const filename = `${order}-${slugifyCaption(caption)}-${unique}${extension}`;

    await writeFile(path.join(dir, filename), bytes);
    return { src: `/gallery/${safeBarber}/${filename}` };
  },

  async remove(src) {
    // Rebuild the path from its parts rather than joining the given string,
    // so "../" in a src cannot reach outside the gallery.
    const parts = src.replace(/^\/gallery\//, "").split("/");
    if (parts.length !== 2) throw new Error("Not a gallery photograph.");
    const [barber, file] = parts.map((p) => p.replace(/[^a-zA-Z0-9._-]/g, ""));
    if (!barber || !file) throw new Error("Not a gallery photograph.");

    await unlink(path.join(GALLERY_ROOT, barber, file)).catch(() => {
      // Already gone is the outcome we wanted.
    });
  },
};

export function galleryStorage(): GalleryStorage {
  // Object storage adapter slots in here — see docs/GALLERY-UPLOADS.md.
  return localDiskStorage;
}
