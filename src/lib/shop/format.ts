import type { DayHours } from "./hours";

/** Display helpers shared by the site, the poster and the booking flow. */
/* ── formatting ────────────────────────────────────────────────── */

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** 570 -> "9:30am" */
export function formatMinutes(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

export function formatHours(d: DayHours): string {
  if (d.opens === null || d.closes === null) return "Closed";
  return `${formatMinutes(d.opens)} – ${formatMinutes(d.closes)}`;
}
