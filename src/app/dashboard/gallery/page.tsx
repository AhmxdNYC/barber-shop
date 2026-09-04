import { prisma } from "@/lib/db/client";
import { galleryPhotos } from "@/lib/shop/gallery";
import { galleryStorage } from "@/lib/gallery/storage";
import { GalleryManager } from "@/components/dashboard/gallery-manager";

export default async function GalleryAdminPage() {
  const [photos, barbers] = await Promise.all([
    galleryPhotos(),
    prisma.barber.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <span className="eyebrow">The work</span>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
        Gallery
      </h1>
      <p className="mt-2 max-w-2xl text-bone-2">
        Photographs of cuts from the shop. They appear on the public gallery
        straight away, and each barber&rsquo;s work is linked from their card.
      </p>
      <p className="mt-2 max-w-2xl text-sm text-bone-3">
        Only put up photographs the shop took. Pictures on the shop&rsquo;s
        Google listing were often uploaded by customers, and they belong to
        whoever took them.
      </p>

      <div className="mt-8">
        <GalleryManager
          photos={photos}
          barbers={barbers}
          isDurable={galleryStorage().isDurable}
        />
      </div>
    </div>
  );
}
