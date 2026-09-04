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
  // The public site advertises these, so refresh it now rather than waiting
  // for the hourly revalidation.
  revalidatePath("/", "layout");
  return { ok: "Hours saved. The website is updated." };
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


/* ── shop opening hours ────────────────────────────────────────── */

const ShopHoursInput = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  opensAt: z.string().max(5),
  closesAt: z.string().max(5),
  isClosed: z.coerce.boolean().optional(),
});

/**
 * The shop's own opening hours.
 *
 * Closing the shop on a day closes it for everyone, without touching any
 * barber's schedule — which is the point of having shop hours at all.
 */
export async function saveShopHoursAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireBarber();

  const parsed = ShopHoursInput.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    opensAt: formData.get("opensAt"),
    closesAt: formData.get("closesAt"),
    isClosed: formData.get("isClosed") === "on",
  });
  if (!parsed.success) return { error: "Those times are not valid." };

  const { dayOfWeek, isClosed } = parsed.data;
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

  await prisma.shopHours.upsert({
    where: { dayOfWeek },
    create: {
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

  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { ok: isClosed ? "Marked closed." : "Shop hours saved." };
}


/**
 * Blocks out a range dragged on the calendar.
 *
 * Takes shop-local minutes and the date being viewed, because that is what
 * the calendar knows — it lays out a day in minutes from midnight and has no
 * business constructing UTC instants.
 */
const DragBlockInput = z.object({
  barberId: z.string().min(1).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMinutes: z.coerce.number().int().min(0).max(24 * 60),
  endMinutes: z.coerce.number().int().min(0).max(24 * 60),
  reason: z.string().trim().max(200).optional(),
});

export async function blockTimeFromCalendarAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireBarber();

  const parsed = DragBlockInput.safeParse({
    barberId: formData.get("barberId"),
    date: formData.get("date"),
    startMinutes: formData.get("startMinutes"),
    endMinutes: formData.get("endMinutes"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: "That block is not valid." };

  const { barberId, date, startMinutes, endMinutes, reason } = parsed.data;
  if (endMinutes <= startMinutes) {
    return { error: "Drag downwards to set a length." };
  }

  const timeZone = await shopTimezone();
  const toInstant = (minutes: number) =>
    fromZonedTime(
      `${date}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`,
      timeZone,
    );

  const startsAt = toInstant(startMinutes);
  const endsAt = toInstant(endMinutes);

  // Existing bookings are never cancelled by blocking time — the barber is
  // told and decides. Silently dropping someone's haircut is worse than the
  // clash.
  const clashes = await prisma.appointment.count({
    where: {
      barberId,
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });

  await prisma.timeOff.create({
    data: { barberId, startsAt, endsAt, reason: reason || null },
  });

  revalidatePath("/dashboard");
  return {
    ok:
      clashes > 0
        ? `Blocked — but ${clashes} appointment${clashes === 1 ? " is" : "s are"} already booked in that time.`
        : "Blocked out.",
  };
}
