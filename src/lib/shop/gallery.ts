import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";

/**
 * The cut gallery, read from the files on disk.
 *
 * Adding photographs is dropping them into `public/gallery` — no database
 * row, no admin screen, no upload pipeline. At this stage the person adding
 * them is the developer, and anything more elaborate is machinery for a
 * problem the shop does not have yet.
 *
 * The filename carries the caption, because a caption stored somewhere else
 * is a caption that goes stale: `01-skin-fade.jpg` becomes "Skin fade". The
 * numeric prefix sets the order.
 *
 * When Eduardo needs to add photographs from his own phone this becomes
 * object storage and the GalleryImage table, which already exists.
 */

const IMAGE_TYPES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const GALLERY_DIR = path.join(process.cwd(), "public", "gallery");

export type GalleryPhoto = {
  src: string;
  caption: string;
};

/** "01-skin-fade.jpg" -> "Skin fade" */
function captionFrom(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "");
  const withoutOrder = base.replace(/^\d+[-_]?/, "");
  const words = withoutOrder.replace(/[-_]+/g, " ").trim();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export async function galleryPhotos(): Promise<GalleryPhoto[]> {
  let entries: string[];
  try {
    entries = await readdir(GALLERY_DIR);
  } catch {
    // The directory need not exist; an empty gallery is a valid state.
    return [];
  }

  return entries
    .filter((name) => IMAGE_TYPES.has(path.extname(name).toLowerCase()))
    .filter((name) => !name.startsWith("."))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => ({
      src: `/gallery/${name}`,
      caption: captionFrom(name),
    }));
}
