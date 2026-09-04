"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireBarber } from "@/lib/auth/current-user";

/**
 * The service menu, editable by the shop.
 *
 * Prices change — a barber puts a cut up by five dollars and needs it live
 * that afternoon, not next time a developer is free. Anything he has to ask
 * someone else to do he will eventually stop asking for, and the menu on the
 * site drifts away from what he actually charges.
 *
 * Existing appointments are unaffected: they snapshot their price at booking
 * time, so changing the menu never rewrites what someone was quoted.
 */

export type ServiceState = { error?: string; ok?: string };

const ServiceInput = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Give the service a name").max(80),
  description: z.string().trim().max(300).optional(),
  price: z.coerce.number().min(0, "Price cannot be negative").max(1000),
  durationMinutes: z.coerce.number().int().min(5, "Too short").max(480),
  isActive: z.coerce.boolean().optional(),
});

/** "Skin Fade" -> "skin-fade", kept stable once created. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function refresh() {
  revalidatePath("/dashboard/services");
  // The menu is on the public site, so it has to update there too.
  revalidatePath("/services");
  revalidatePath("/");
}

export async function saveServiceAction(
  _previous: ServiceState,
  formData: FormData,
): Promise<ServiceState> {
  await requireBarber();

  const parsed = ServiceInput.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    durationMinutes: formData.get("durationMinutes"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { id, name, description, price, durationMinutes, isActive } = parsed.data;
  // Money is stored in cents; a float price would eventually round wrong.
  const priceCents = Math.round(price * 100);

  if (id) {
    await prisma.service.update({
      where: { id },
      data: {
        name,
        description: description || null,
        priceCents,
        durationMinutes,
        isActive: Boolean(isActive),
      },
    });
    refresh();
    return { ok: `${name} updated.` };
  }

  const slug = slugify(name);
  const clash = await prisma.service.findUnique({ where: { slug } });
  if (clash) {
    return { error: `There is already a service called ${clash.name}.` };
  }

  const last = await prisma.service.findFirst({ orderBy: { sortOrder: "desc" } });

  await prisma.service.create({
    data: {
      slug,
      name,
      description: description || null,
      priceCents,
      durationMinutes,
      depositCents: 0,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  refresh();
  return { ok: `${name} added to the menu.` };
}

/**
 * Services are deactivated rather than deleted.
 *
 * Appointments reference them, and a deleted service would take its history
 * with it — the barber would lose the record of what he actually did.
 */
export async function toggleServiceAction(formData: FormData) {
  await requireBarber();
  const id = z.string().min(1).max(40).parse(formData.get("id"));

  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) return;

  await prisma.service.update({
    where: { id },
    data: { isActive: !service.isActive },
  });
  refresh();
}
