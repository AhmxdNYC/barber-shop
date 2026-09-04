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


/**
 * Prisma's code for a transaction that lost a write conflict or deadlock.
 * Postgres reports these as SQLSTATE 40001 (serialization failure) and
 * 40P01 (deadlock detected).
 */
export const PRISMA_WRITE_CONFLICT = "P2034";

/**
 * True when a transaction failed for a reason that retrying can resolve.
 *
 * Concurrent inserts against the gist exclusion index do not always surface
 * as a clean 23P01. When two transactions reach the index at the same
 * instant, Postgres may instead abort one with a write conflict or deadlock
 * — the database is saying "try again", not "this was invalid".
 *
 * This matters in production, not just in tests: without a retry, two people
 * tapping the same slot at the same moment get a 500 instead of being told
 * the time has gone.
 */
export function isRetryableTransactionError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === PRISMA_WRITE_CONFLICT) return true;

  const message = error.message.toLowerCase();
  return (
    message.includes("write conflict") ||
    message.includes("deadlock") ||
    message.includes("40001") ||
    message.includes("40p01")
  );
}
