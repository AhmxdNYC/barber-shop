import "server-only";
import { prisma } from "@/lib/db/client";
import { issueManageToken } from "./manage-token";

/**
 * Reissuing a lost "manage my booking" link.
 *
 * Only the hash of a token is stored, so the original link cannot be resent.
 * That is deliberate — a database leak yields no working links — and it
 * means recovery issues a *new* token and invalidates the old one, which is
 * better behaviour anyway.
 *
 * Without this, a client who deletes the confirmation email has no way to
 * cancel at all, which pushes them back to phoning the shop — the problem
 * online booking exists to solve.
 */

/** How many recovery emails one address may trigger in the window. */
const MAX_SENDS = 3;
const WINDOW_MINUTES = 30;

/**
 * Rate limit backed by the notification log rather than memory, so it
 * survives a restart and holds across more than one server process.
 */
export async function recoverySendsRecently(email: string): Promise<number> {
  return prisma.notification.count({
    where: {
      recipient: email,
      type: "MANAGE_LINK",
      createdAt: { gt: new Date(Date.now() - WINDOW_MINUTES * 60_000) },
    },
  });
}

export async function isRateLimited(email: string): Promise<boolean> {
  return (await recoverySendsRecently(email)) >= MAX_SENDS;
}

/**
 * Issues a fresh token for a client's next upcoming booking.
 *
 * Returns null when there is nothing to recover. The caller must respond
 * identically either way — otherwise this becomes a way to test which email
 * addresses are clients of the shop.
 */
export async function reissueManageToken(
  email: string,
): Promise<{ appointmentId: string; token: string } | null> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      contactEmail: email,
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      startsAt: { gt: new Date() },
    },
    orderBy: { startsAt: "asc" },
    select: { id: true },
  });
  if (!appointment) return null;

  const { token, hash } = issueManageToken();

  // Replacing the hash invalidates whatever link was sent before.
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { manageTokenHash: hash },
  });

  return { appointmentId: appointment.id, token };
}

export const RECOVERY_LIMITS = { MAX_SENDS, WINDOW_MINUTES };
