import "server-only";
import { isRetryableTransactionError } from "./errors";

/**
 * Runs a transaction, retrying the ones Postgres says to retry.
 *
 * Concurrent inserts against the appointment exclusion index can abort with
 * a write conflict or deadlock rather than a clean constraint violation.
 * That is a transient outcome of two transactions meeting, not a bad
 * request — retrying resolves it, and the retry then hits the constraint
 * properly and reports the slot as taken.
 *
 * Attempts are deliberately few and the delay short. A booking request is
 * in front of someone waiting; the honest answer to sustained contention is
 * "that time went", not a long silence.
 */
export async function withTransactionRetry<T>(
  run: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isRetryableTransactionError(error) || attempt === attempts) throw error;

      // Jitter, so two colliding requests do not retry in lockstep forever.
      const delay = attempt * 25 + Math.floor(Math.random() * 25);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
