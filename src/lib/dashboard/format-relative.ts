/**
 * Human phrasing for how long ago something was.
 *
 * A barber reads "3 weeks ago" instantly and has to do arithmetic on
 * "2026-08-14". Weeks are the unit he actually thinks in, because that is
 * the rhythm haircuts happen on.
 */
export function agoInWords(days: number | null): string {
  if (days === null) return "never";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  const weeks = Math.round(days / 7);
  if (weeks === 1) return "a week ago";
  if (days < 60) return `${weeks} weeks ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(days / 365);
  return years === 1 ? "over a year ago" : `${years} years ago`;
}

/** "every 4 weeks" — the client's rhythm, in the unit haircuts happen on. */
export function cadenceInWords(averageGapDays: number | null): string | null {
  if (averageGapDays === null) return null;
  // Under a week is a genuine "every few days" client, not a weekly one.
  if (averageGapDays <= 5) return `every ${averageGapDays} days`;
  // Six to nine days is weekly in practice — nobody books to the day.
  if (averageGapDays <= 9) return "weekly";
  if (averageGapDays < 60) return `every ${Math.round(averageGapDays / 7)} weeks`;
  const months = Math.round(averageGapDays / 30);
  return months === 1 ? "monthly" : `every ${months} months`;
}
