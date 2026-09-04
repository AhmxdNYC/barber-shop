"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db/client";
import { requireBarber } from "@/lib/auth/current-user";
import { timeInputToMinutes } from "@/lib/shop/time-input";

/**
 * Availability management for a chair.
 *
 * Hours, blocks and time off are the settings a barber changes most, and the
 * ones most likely to be wrong on any given week. They are editable from the
 * dashboard on purpose: a schedule that needs a developer to change is a
 * schedule that goes stale, and a stale calendar is worse than none.
 */

export type ActionState = { error?: string; ok?: string };

async function shopTimezone(): Promise<string> {
  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  return settings?.timezone ?? "America/New_York";
}

/* ── weekly hours ──────────────────────────────────────────────── */

const HoursInput = z.object({
  barberId: z.string().min(1).max(40),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  opensAt: z.string().max(5),
  closesAt: z.string().max(5),
  isClosed: z.coerce.boolean().optional(),
});

export async function saveWorkingHoursAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireBarber();

  const parsed = HoursInput.safeParse({
    barberId: formData.get("barberId"),
    dayOfWeek: formData.get("dayOfWeek"),
    opensAt: formData.get("opensAt"),
    closesAt: formData.get("closesAt"),
    isClosed: formData.get("isClosed") === "on",
  });
  if (!parsed.success) return { error: "Those times are not valid." };

  const { barberId, dayOfWeek, isClosed } = parsed.data;
  const opens = timeInputToMinutes(parsed.data.opensAt);
  const closes = timeInputToMinutes(parsed.data.closesAt);

  if (!isClosed) {
    if (opens === null || closes === null) {
      return { error: "Enter both an opening and a closing time." };
    }
    if (closes <= opens) {
      return { error: "Closing time has to be after opening time." };
    }
  }

  await prisma.workingHours.upsert({
    where: { barberId_dayOfWeek: { barberId, dayOfWeek } },
    create: {
      barberId,
      dayOfWeek,
      opensAtMinutes: opens ?? 0,
      closesAtMinutes: closes ?? 0,
      isClosed: Boolean(isClosed),
    },
    update: {
      opensAtMinutes: opens ?? 0,
      closesAtMinutes: closes ?? 0,
      isClosed: Boolean(isClosed),
    },
  });

  revalidatePath("/dashboard/availability");
  return { ok: "Hours saved." };
}

/* ── time off ──────────────────────────────────────────────────── */

const TimeOffInput = z.object({
  barberId: z.string().min(1).max(40),
  start: z.string().min(10).max(30),
  end: z.string().min(10).max(30),
  reason: z.string().trim().max(200).optional(),
});

export async function addTimeOffAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireBarber();

  const parsed = TimeOffInput.safeParse({
    barberId: formData.get("barberId"),
    start: formData.get("start"),
    end: formData.get("end"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: "Check the dates." };

  const timeZone = await shopTimezone();
  // The inputs are wall-clock in the shop's timezone, not UTC.
  const startsAt = fromZonedTime(`${parsed.data.start}:00`, timeZone);
  const endsAt = fromZonedTime(`${parsed.data.end}:00`, timeZone);

  if (endsAt <= startsAt) {
    return { error: "The end has to be after the start." };
  }

  // Existing appointments are not cancelled automatically — that is the
  // barber's call, and silently dropping someone's booking is worse than
  // showing him the clash.
  const clashes = await prisma.appointment.count({
    where: {
      barberId: parsed.data.barberId,
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  await prisma.timeOff.create({
    data: {
      barberId: parsed.data.barberId,
      startsAt,
      endsAt,
      reason: parsed.data.reason || null,
    },
  });

  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard");

  return {
    ok:
      clashes > 0
        ? `Time off saved — but ${clashes} appointment${clashes === 1 ? "" : "s"} already booked in that window. Cancel or move ${clashes === 1 ? "it" : "them"}.`
        : "Time off saved.",
  };
}

export async function deleteTimeOffAction(formData: FormData) {
  await requireBarber();
  const id = z.string().min(1).max(40).parse(formData.get("id"));
  await prisma.timeOff.delete({ where: { id } });
  revalidatePath("/dashboard/availability");
  revalidatePath("/dashboard");
}

/* ── recurring blocks ──────────────────────────────────────────── */

const BlockInput = z.object({
  barberId: z.string().min(1).max(40),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startAt: z.string().max(5),
  endAt: z.string().max(5),
  label: z.string().trim().min(1).max(60),
});

export async function addRecurringBlockAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireBarber();

  const parsed = BlockInput.safeParse({
    barberId: formData.get("barberId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startAt: formData.get("startAt"),
    endAt: formData.get("endAt"),
    label: formData.get("label"),
  });
  if (!parsed.success) return { error: "Check the block details." };

  const start = timeInputToMinutes(parsed.data.startAt);
  const end = timeInputToMinutes(parsed.data.endAt);
  if (start === null || end === null) return { error: "Those times are not valid." };
  if (end <= start) return { error: "The block has to end after it starts." };

  await prisma.recurringBlock.create({
    data: {
      barberId: parsed.data.barberId,
      dayOfWeek: parsed.data.dayOfWeek,
      startAtMinutes: start,
      endAtMinutes: end,
      label: parsed.data.label,
    },
  });

  revalidatePath("/dashboard/availability");
  return { ok: "Block added." };
}

export async function deleteRecurringBlockAction(formData: FormData) {
  await requireBarber();
  const id = z.string().min(1).max(40).parse(formData.get("id"));
  await prisma.recurringBlock.delete({ where: { id } });
  revalidatePath("/dashboard/availability");
}
