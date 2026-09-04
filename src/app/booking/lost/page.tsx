import type { Metadata } from "next";
import { SHOP } from "@/lib/shop";
import { RecoverBookingForm } from "@/components/recover-booking-form";

export const metadata: Metadata = {
  title: "Find your booking",
  robots: { index: false, follow: false },
};

export default function LostBookingPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-20">
      <span className="pole-stripe mb-6" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Lost your link?
      </h1>
      <p className="mt-3 text-bone-2">
        Enter the email you booked with and we&rsquo;ll send a fresh link to
        your next appointment.
      </p>
      <RecoverBookingForm shopPhone={SHOP.phone} />
    </div>
  );
}
