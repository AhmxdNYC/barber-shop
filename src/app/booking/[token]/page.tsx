import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findBookingByToken } from "@/app/actions/manage-booking";
import { ManageBooking } from "@/components/manage-booking";
import { SHOP } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Your booking",
  // Never index, and never leak the token to another site via Referer.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const booking = await findBookingByToken(token);
  if (!booking) notFound();

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <span className="pole-stripe mb-6" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <ManageBooking booking={booking} token={token} shopPhone={SHOP.phone} />
    </div>
  );
}
