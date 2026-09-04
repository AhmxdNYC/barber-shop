import type { Metadata } from "next";
import { HOURS } from "@/lib/shop";
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
function buildDays(count = 14): CalendarDay[] {
  const today = new Date();
  const days: CalendarDay[] = [];

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = HOURS[d.getDay()];

    days.push({
      date: `${y}-${m}-${day}`,
      weekday: WEEKDAYS[d.getDay()],
      dayNum: String(d.getDate()),
      month: MONTHS[d.getMonth()],
      isClosed: hours.opens === null,
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
  const params = await searchParams;

  return (
    <BookingFlow
      days={buildDays()}
      initialBarber={params.barber ?? null}
      initialService={params.service ?? null}
    />
  );
}
