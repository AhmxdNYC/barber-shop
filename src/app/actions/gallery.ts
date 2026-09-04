"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireBarber } from "@/lib/auth/current-user";
import {
  ALLOWED_TYPES,
  MAX_BYTES,
  galleryStorage,
} from "@/lib/gallery/storage";
import { galleryPhotos } from "@/lib/shop/gallery";

/**
 * Adding and removing gallery photographs.
 *
 * Everything about an uploaded file is attacker-controlled — its name, its
 * claimed type, its size — so none of it is trusted. The type is checked
 * against a whitelist, the size against a cap, and the filename is discarded
 * entirely in favour of one we generate.
 */

export type UploadState = { error?: string; ok?: string };

const Meta = z.object({
  barberSlug: z.string().min(1).max(60),
  caption: z.string().trim().min(2, "Give the cut a name").max(60),
});

export async function uploadGalleryPhotoAction(
  _previous: UploadState,
  formData: FormData,
): Promise<UploadState> {
  await requireBarber();

  const meta = Meta.safeParse({
    barberSlug: formData.get("barberSlug"),
    caption: formData.get("caption"),
  });
  if (!meta.success) {
    return { error: meta.error.issues[0]?.message ?? "Check the details." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photograph." };
  }
  if (file.size > MAX_BYTES) {
    return {
      error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_BYTES / 1024 / 1024} MB.`,
    };
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return { error: "Use a JPEG, PNG, WebP or AVIF image." };
  }

  // The barber must be one of ours; the slug decides a directory name.
  const barber = await prisma.barber.findUnique({
    where: { slug: meta.data.barberSlug },
    select: { slug: true },
  });
  if (!barber) return { error: "Unknown barber." };

  const existing = await galleryPhotos();
  const sortHint =
    existing.filter((p) => p.barberSlug === barber.slug).length + 1;

  const storage = galleryStorage();
  try {
    await storage.save({
      barberSlug: barber.slug,
      caption: meta.data.caption,
      bytes: Buffer.from(await file.arrayBuffer()),
      extension,
      sortHint,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save that photograph.",
    };
  }

  refresh();
  return { ok: `Added “${meta.data.caption}”.` };
}

export async function deleteGalleryPhotoAction(formData: FormData) {
  await requireBarber();

  const src = z
    .string()
    .min(1)
    .max(300)
    .startsWith("/gallery/")
    .parse(formData.get("src"));

  await galleryStorage().remove(src);
  refresh();
}

function refresh() {
  revalidatePath("/dashboard/gallery");
  revalidatePath("/gallery");
  revalidatePath("/barbers");
  revalidatePath("/");
}
