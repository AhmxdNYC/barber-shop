"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireBarber } from "@/lib/auth/current-user";

/**
 * Private notes about a client.
 *
 * The column existed from the start but nothing could write to it, which
 * made the one genuinely barber-only field in the system read-only. A note
 * like "tight on the sides, hates small talk" is the whole point of keeping
 * a client book, and it never leaves the dashboard — client-facing queries
 * do not select it.
 */
export type NoteState = { error?: string; ok?: boolean };

export async function saveClientNoteAction(
  _previous: NoteState,
  formData: FormData,
): Promise<NoteState> {
  await requireBarber();

  const parsed = z
    .object({
      id: z.string().min(1).max(40),
      notes: z.string().trim().max(2000),
    })
    .safeParse({ id: formData.get("id"), notes: formData.get("notes") ?? "" });

  if (!parsed.success) return { error: "That note is too long." };

  await prisma.client.update({
    where: { id: parsed.data.id },
    data: { notes: parsed.data.notes || null },
  });

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${parsed.data.id}`);
  return { ok: true };
}
