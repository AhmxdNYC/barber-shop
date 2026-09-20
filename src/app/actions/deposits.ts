"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireBarber } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/client";
import { stripeConfigured } from "@/lib/payments/stripe";

export type DepositState = { ok?: string; error?: string };

const Input = z.object({
  enabled: z.enum(["on", "off"]),
  depositCents: z.coerce.number().int().min(0).max(20_000),
});

/**
 * Turns deposits on or off, and sets the amount.
 *
 * A server action is a public endpoint, so the sign-in check is here and not
 * only on the page that renders the form.
 */
export async function updateDepositsAction(
  _previous: DepositState,
  formData: FormData,
): Promise<DepositState> {
  await requireBarber();

  const parsed = Input.safeParse({
    enabled: formData.get("enabled") ?? "off",
    depositCents: formData.get("depositCents") ?? 0,
  });
  if (!parsed.success) {
    return { error: "That amount does not look right." };
  }

  const enabled = parsed.data.enabled === "on";

  // Switching this on without keys would take every online booking to a
  // checkout page that cannot open, and the client would lose the slot.
  if (enabled && !stripeConfigured) {
    return {
      error:
        "Stripe is not connected yet, so deposits cannot be switched on. Add the keys first.",
    };
  }

  if (enabled && parsed.data.depositCents <= 0) {
    return { error: "A deposit of nothing is the same as no deposit." };
  }

  await prisma.$transaction([
    prisma.shopSettings.update({
      where: { id: 1 },
      data: {
        depositsEnabled: enabled,
        depositCents: parsed.data.depositCents,
      },
    }),
    // Services carry their own amount so one could differ later; for now
    // they follow the shop.
    prisma.service.updateMany({ data: { depositCents: parsed.data.depositCents } }),
  ]);

  revalidatePath("/dashboard/settings");
  revalidatePath("/book");

  return {
    ok: enabled
      ? `Deposits are on. Clients booking online pay $${(parsed.data.depositCents / 100).toFixed(2)} up front, and the rest in the shop.`
      : "Deposits are off. Online bookings confirm straight away.",
  };
}
