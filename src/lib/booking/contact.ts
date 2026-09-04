/**
 * Validation for the details a client leaves when booking.
 *
 * Phone is required, not optional. This shop runs on phone calls — if the
 * barber is running forty minutes behind, or has to move someone, he picks
 * up the phone. A booking with no number is a booking he cannot manage, and
 * handing over a number to book a haircut is something nobody objects to.
 */

/** Digits only, so formatting differences never cause a false rejection. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Deliberately permissive: enough digits to be a real number, without
 * assuming a country. A stricter pattern rejects valid numbers, and the
 * genuine check is whether the barber can ring it.
 */
export function isPlausiblePhone(value: string): boolean {
  const digits = phoneDigits(value);
  return digits.length >= 7 && digits.length <= 15;
}

/** Loose on purpose — the real test is whether the confirmation arrives. */
export function isPlausibleEmail(value: string): boolean {
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && trimmed.length <= 200;
}

export function isPlausibleName(value: string): boolean {
  return value.trim().length >= 2 && value.trim().length <= 120;
}

/** Field-level messages, so the form can say which detail is wrong. */
export function contactErrors(form: {
  name: string;
  email: string;
  phone: string;
}): { name?: string; email?: string; phone?: string } {
  const errors: { name?: string; email?: string; phone?: string } = {};
  if (!isPlausibleName(form.name)) errors.name = "Tell us your name";
  if (!isPlausibleEmail(form.email)) errors.email = "That email doesn't look right";
  if (!form.phone.trim()) {
    errors.phone = "We need a number in case anything changes";
  } else if (!isPlausiblePhone(form.phone)) {
    errors.phone = "That doesn't look like a phone number";
  }
  return errors;
}
