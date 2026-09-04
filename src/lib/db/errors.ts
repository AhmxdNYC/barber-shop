import { Prisma } from "@prisma/client";

/** Postgres error code for an exclusion constraint violation. */
export const PG_EXCLUSION_VIOLATION = "23P01";

/** The constraint that makes double-booking impossible. */
export const OVERLAP_CONSTRAINT = "no_overlapping_appointments";

/**
 * True when a write failed because the slot was taken between the client
 * seeing it and confirming.
 *
 * This is the expected outcome of the race the exclusion constraint exists
 * to win, not a fault — the caller should return 409 and refresh the slot
 * list rather than treat it as a server error.
 *
 * Prisma does not surface the Postgres code as its own `code`, so this
 * checks the underlying detail. The constraint name is matched as well as
 * the SQLSTATE so an unrelated future exclusion constraint is not mistaken
 * for a taken slot.
 */
export function isSlotTakenError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;

  const meta = (error.meta ?? {}) as Record<string, unknown>;
  const haystack = [
    error.message,
    typeof meta.code === "string" ? meta.code : "",
    typeof meta.message === "string" ? meta.message : "",
    typeof meta.constraint === "string" ? meta.constraint : "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes(PG_EXCLUSION_VIOLATION.toLowerCase()) ||
    haystack.includes(OVERLAP_CONSTRAINT)
  );
}
