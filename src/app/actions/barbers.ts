"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireBarber } from "@/lib/auth/current-user";
import { HOURS } from "@/lib/shop";

/**
 * Managing the chairs.
 *
 * Barbers come and go, and a shop that has to ask a developer to add one
 * will run the new person off the books — which means the calendar stops
 * matching the shop, and the calendar is the whole product.
 */

export type BarberState = { error?: string; ok?: string };

const BarberInput = z.object({
  id: z.string().max(40).optional(),
  name: z.string().trim().min(2, "Give the barber a name").max(80),
  specialty: z.string().trim().min(2, "What are they known for?").max(120),
  yearsExperience: z.coerce.number().int().min(0).max(70).optional(),
  isActive: z.coerce.boolean().optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/barbers");
  revalidatePath("/barbers");
  revalidatePath("/", "layout");
}

export async function saveBarberAction(
  _previous: BarberState,
  formData: FormData,
): Promise<BarberState> {
  await requireBarber();

  const parsed = BarberInput.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    specialty: formData.get("specialty"),
    yearsExperience: formData.get("yearsExperience") || 0,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { id, name, specialty, yearsExperience, isActive } = parsed.data;

  if (id) {
    await prisma.barber.update({
      where: { id },
      data: {
        name,
        specialty,
        yearsExperience: yearsExperience ?? 0,
        isActive: Boolean(isActive),
      },
    });
    refresh();
    return { ok: `${name} updated.` };
  }

  const slug = slugify(name);
  if (await prisma.barber.findUnique({ where: { slug } })) {
    return { error: `There is already a barber called ${name}.` };
  }

  const last = await prisma.barber.findFirst({ orderBy: { sortOrder: "desc" } });

  const barber = await prisma.barber.create({
    data: {
      slug,
      name,
      specialty,
      yearsExperience: yearsExperience ?? 0,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  // A barber with no hours is bookable on no day at all, which reads as the
  // feature being broken. New chairs start on the shop's published hours and
  // can diverge from there.
  await prisma.workingHours.createMany({
    data: HOURS.map((day, dayOfWeek) => ({
      barberId: barber.id,
      dayOfWeek,
      opensAtMinutes: day.opens ?? 0,
      closesAtMinutes: day.closes ?? 0,
      isClosed: day.opens === null,
    })),
  });

  refresh();
  return { ok: `${name} added. Set their hours on the calendar.` };
}

/**
 * Barbers are deactivated, never deleted.
 *
 * Appointments reference them, and deleting one would take the record of
 * every cut they ever did with it — including the revenue those cuts earned.
 */
export async function toggleBarberAction(formData: FormData) {
  await requireBarber();
  const id = z.string().min(1).max(40).parse(formData.get("id"));

  const barber = await prisma.barber.findUnique({ where: { id } });
  if (!barber) return;

  if (barber.isActive) {
    const upcoming = await prisma.appointment.count({
      where: {
        barberId: id,
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
        startsAt: { gte: new Date() },
      },
    });
    // Hiding a barber stops new bookings; it must not strand existing ones.
    if (upcoming > 0) {
      await prisma.barber.update({ where: { id }, data: { isActive: false } });
      refresh();
      return;
    }
  }

  await prisma.barber.update({
    where: { id },
    data: { isActive: !barber.isActive },
  });
  refresh();
}
