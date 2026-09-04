import type { Metadata } from "next";
import { barbersWithPhotos, galleryPhotos } from "@/lib/shop/gallery";
import { BarberGrid } from "@/components/barber-grid";

export const metadata: Metadata = {
  title: "Barbers",
  description:
    "Meet the barbers and book the chair you want. Every barber keeps their own calendar.",
};

export const revalidate = 3600;

export default async function BarbersPage() {
  const photos = await galleryPhotos();
  // Only offer a link to someone's work when there is work to look at.
  const withPhotos = new Set(barbersWithPhotos(photos).map((b) => b.slug));

  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <header className="max-w-2xl">
        <span className="eyebrow">The chairs</span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
          Pick your barber
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-bone-2">
          Everyone here has their own hands and their own calendar. Pick the
          person, and we&rsquo;ll show you only the times that chair is free.
        </p>
      </header>

      <div className="mt-12">
        <BarberGrid barbersWithWork={withPhotos} />
      </div>

      <p className="mt-10 text-sm text-bone-3">
        No preference? Choose <span className="text-bone-2">First available</span>{" "}
        when you book and you&rsquo;ll get whoever opens up first.
      </p>
    </div>
  );
}
