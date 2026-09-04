import type { Metadata } from "next";
import { liveServices } from "@/lib/shop/live-services";
import { openingHours } from "@/lib/shop/opening-hours";
import { BookingFlow } from "@/components/booking/booking-flow";
import type { CalendarDay } from "@/components/booking/types";

export const metadata: Metadata = {
  title: "Book a chair",
  description: "Pick your barber, your service and a time that works.",
};

/** Availability depends on the current date, so never prerender this. */
export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * The calendar strip is built on the server so the client never computes
 * "today" itself — that would differ from the server render and cause a
 * hydration mismatch.
 */
function buildDays(hours: Awaited<ReturnType<typeof openingHours>>, count = 14): CalendarDay[] {
  const today = new Date();
  const days: CalendarDay[] = [];

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dayHours = hours[d.getDay()];

    days.push({
      date: `${y}-${m}-${day}`,
      weekday: WEEKDAYS[d.getDay()],
      dayNum: String(d.getDate()),
      month: MONTHS[d.getMonth()],
      isClosed: dayHours.opens === null,
      isToday: i === 0,
    });
  }
  return days;
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string; service?: string }>;
}) {
  const [params, services, hours] = await Promise.all([
    searchParams,
    liveServices(),
    openingHours(),
  ]);

  return (
    <BookingFlow
      days={buildDays(hours)}
      services={services}
      initialBarber={params.barber ?? null}
      initialService={params.service ?? null}
    />
  );
}
