/** Opening hours, as minutes from midnight in the shop's own timezone. */
/* ── hours ─────────────────────────────────────────────────────── */

export type DayHours = {
  day: string;
  short: string;
  /** Minutes from midnight, shop-local. null when closed. */
  opens: number | null;
  closes: number | null;
};

/** Index 0 is Sunday, matching JavaScript's getDay(). */
export const HOURS: DayHours[] = [
  // TODO: Sunday's closing time is not listed publicly — confirm with the shop.
  { day: "Sunday", short: "Sun", opens: 10 * 60 + 30, closes: 17 * 60 },
  { day: "Monday", short: "Mon", opens: 10 * 60 + 30, closes: 19 * 60 + 30 },
  { day: "Tuesday", short: "Tue", opens: 10 * 60 + 30, closes: 19 * 60 + 30 },
  { day: "Wednesday", short: "Wed", opens: 10 * 60 + 30, closes: 19 * 60 + 30 },
  { day: "Thursday", short: "Thu", opens: 10 * 60 + 30, closes: 19 * 60 + 30 },
  { day: "Friday", short: "Fri", opens: 10 * 60 + 30, closes: 19 * 60 + 30 },
  { day: "Saturday", short: "Sat", opens: 10 * 60, closes: 19 * 60 + 30 },
];
