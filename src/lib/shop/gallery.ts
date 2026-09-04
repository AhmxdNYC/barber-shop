import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/client";

/**
 * The cut gallery, read from the files on disk.
 *
 * Attribution comes from the folder a photograph sits in:
 *
 *     public/gallery/eduardo/01-skin-fade.jpg   -> Eduardo, "Skin fade"
 *     public/gallery/02-taper.jpg               -> unattributed, "Taper"
 *
 * A folder rather than a naming convention inside the filename, because a
 * barber slug and a caption run together are ambiguous the moment a caption
 * begins with a word that looks like a name. A folder cannot be misread, and
 * moving a photograph between barbers is a drag rather than a rename.
 *
 * Still no database rows and no upload pipeline: at this stage the person
 * adding photographs is the developer. When Eduardo needs to add them from
 * his own phone this becomes object storage and the GalleryImage table.
 */

const IMAGE_TYPES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const GALLERY_DIR = path.join(process.cwd(), "public", "gallery");

export type GalleryPhoto = {
  src: string;
  caption: string;
  /** Slug of the barber who did it, when the folder names one. */
  barberSlug: string | null;
  barberName: string | null;
};

/** "01-skin-fade.jpg" -> "Skin fade" */
function captionFrom(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const words = base.replace(/^\d+[-_]?/, "").replace(/[-_]+/g, " ").trim();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isImage(name: string): boolean {
  return !name.startsWith(".") && IMAGE_TYPES.has(path.extname(name).toLowerCase());
}

const byName = (a: { src: string }, b: { src: string }) =>
  a.src.localeCompare(b.src, undefined, { numeric: true });

export async function galleryPhotos(): Promise<GalleryPhoto[]> {
  let entries;
  try {
    entries = await readdir(GALLERY_DIR, { withFileTypes: true });
  } catch {
    // The directory need not exist; an empty gallery is a valid state.
    return [];
  }

  const barbers = await prisma.barber.findMany({
    select: { slug: true, name: true },
  });
  const nameBySlug = new Map(barbers.map((b) => [b.slug, b.name]));

  const loose: GalleryPhoto[] = entries
    .filter((entry) => entry.isFile() && isImage(entry.name))
    .map((entry) => ({
      src: `/gallery/${entry.name}`,
      caption: captionFrom(entry.name),
      barberSlug: null,
      barberName: null,
    }));

  const attributed = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (dir) => {
        const files = await readdir(path.join(GALLERY_DIR, dir.name));
        // A folder that matches no barber still shows its photographs, just
        // without a name against them.
        const barberName = nameBySlug.get(dir.name) ?? null;
        return files.filter(isImage).map((name) => ({
          src: `/gallery/${dir.name}/${name}`,
          caption: captionFrom(name),
          barberSlug: barberName ? dir.name : null,
          barberName,
        }));
      }),
  );

  return [...loose, ...attributed.flat()].sort(byName);
}

/** Which barbers have work in the gallery, for the filter. */
export function barbersWithPhotos(photos: GalleryPhoto[]) {
  const seen = new Map<string, string>();
  for (const photo of photos) {
    if (photo.barberSlug && photo.barberName) {
      seen.set(photo.barberSlug, photo.barberName);
    }
  }
  return [...seen.entries()].map(([slug, name]) => ({ slug, name }));
}
