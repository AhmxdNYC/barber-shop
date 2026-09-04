/** One day in the booking calendar strip, precomputed on the server. */
export type CalendarDay = {
  /** "YYYY-MM-DD" in the shop's timezone. */
  date: string;
  weekday: string;
  dayNum: string;
  month: string;
  isClosed: boolean;
  isToday: boolean;
};

export const STEPS = ["Barber", "Service", "Time", "Details"] as const;

/** Index into STEPS, plus 4 for the confirmation screen. */
export type Step = 0 | 1 | 2 | 3 | 4;

export type ContactForm = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

export const EMPTY_FORM: ContactForm = {
  name: "",
  email: "",
  phone: "",
  notes: "",
};
