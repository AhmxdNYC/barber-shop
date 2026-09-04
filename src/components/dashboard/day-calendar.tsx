"use client";

import { useState } from "react";
import { minutesToTimeInput } from "@/lib/shop";
import { AppointmentSheet, type SheetAppointment } from "./appointment-sheet";
import {
  DragPreview,
  DragToBlockDialog,
  useColumnDrag,
  type DragRange,
} from "./drag-to-block";
import type { BarberDay, ScheduleBlock } from "@/lib/dashboard/day-schedule";

/**
 * The day as a calendar, one column per chair.
 *
 * A list answers "what is booked". A calendar answers "what is free", which
 * is the question a barber actually has when someone asks to be fitted in
 * later. Gaps are the information; the blocks are just what surrounds them.
 */

/** Vertical pixels per minute. Sixty minutes ≈ 64px reads well on a phone. */
const PX_PER_MINUTE = 64 / 60;

function label(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}`;
}

export function DayCalendar({
  days,
  nowMinutes,
  isToday,
  appointments,
  rescheduleDays,
  date,
}: {
  days: BarberDay[];
  nowMinutes: number;
  isToday: boolean;
  /** Detail for each appointment block, keyed by id. */
  appointments: Record<string, SheetAppointment>;
  rescheduleDays: { date: string; weekday: string; dayNum: string }[];
  /** The day being viewed, "YYYY-MM-DD", for blocks dragged out. */
  date: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [proposed, setProposed] = useState<DragRange | null>(null);
  const open = days.filter((d) => !d.isClosed);

  // One shared vertical scale, so columns line up across chairs. Computed
  // before any early return, because the drag hook below depends on it and
  // hooks cannot run conditionally.
  const from = open.length
    ? Math.floor(Math.min(...open.map((d) => d.opensAtMinutes)) / 60) * 60
    : 0;
  const to = open.length
    ? Math.ceil(Math.max(...open.map((d) => d.closesAtMinutes)) / 60) * 60
    : 0;
  const height = (to - from) * PX_PER_MINUTE;

  const hourMarks: number[] = [];
  for (let m = from; m <= to; m += 60) hourMarks.push(m);

  const nameFor = (barberId: string) =>
    days.find((d) => d.barberId === barberId)?.barberName ?? "";

  const { drag, handlers } = useColumnDrag({
    pxPerMinute: PX_PER_MINUTE,
    fromMinutes: from,
    onComplete: (barberId, startMinutes, endMinutes) =>
      setProposed({
        barberId,
        barberName: nameFor(barberId),
        startMinutes,
        endMinutes,
      }),
  });

  const dragHandlers = (barberId: string) => ({
    onPointerDown: handlers.onPointerDown(barberId),
    onPointerMove: handlers.onPointerMove,
    onPointerUp: handlers.onPointerUp,
    onPointerCancel: handlers.onPointerCancel,
  });

  if (open.length === 0) {
    return (
      <p className="rounded-[3px] border border-line bg-surface p-8 text-center text-bone-2">
        Nobody is working today.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[3px] border border-line bg-surface">
      <div className="flex min-w-[560px]">
        {/* hour gutter */}
        <div className="w-14 shrink-0 border-r border-line pt-9">
          <div className="relative" style={{ height }}>
            {hourMarks.map((m) => (
              <span
                key={m}
                className="absolute right-2 -translate-y-1/2 text-[0.65rem] tabular-nums text-bone-3"
                style={{ top: (m - from) * PX_PER_MINUTE }}
              >
                {label(m)}
              </span>
            ))}
          </div>
        </div>

        {days.map((day) => (
          <div key={day.barberId} className="min-w-0 flex-1 border-r border-line last:border-r-0">
            <h3 className="truncate border-b border-line px-3 py-2 text-sm font-semibold">
              {day.barberName}
              {day.isClosed && <span className="ml-2 text-xs text-bone-3">off</span>}
            </h3>

            <div
              className="relative touch-pan-y select-none"
              style={{ height }}
              {...dragHandlers(day.barberId)}
            >
              {hourMarks.map((m) => (
                <div
                  key={m}
                  className="absolute inset-x-0 border-t border-line/60"
                  style={{ top: (m - from) * PX_PER_MINUTE }}
                />
              ))}

              {/* Outside working hours, shaded so free time inside them reads clearly. */}
              {!day.isClosed && (
                <>
                  <Shade top={0} height={(day.opensAtMinutes - from) * PX_PER_MINUTE} />
                  <Shade
                    top={(day.closesAtMinutes - from) * PX_PER_MINUTE}
                    height={(to - day.closesAtMinutes) * PX_PER_MINUTE}
                  />
                </>
              )}
              {day.isClosed && <Shade top={0} height={height} />}

              {day.blocks.map((block) => (
                <Block
                  key={block.id}
                  block={block}
                  from={from}
                  onSelect={
                    block.kind === "appointment" && appointments[block.id]
                      ? () => setSelected(block.id)
                      : undefined
                  }
                />
              ))}

              {drag?.barberId === day.barberId && (
                <DragPreview
                  topPx={(Math.min(drag.anchor, drag.current) - from) * PX_PER_MINUTE}
                  heightPx={Math.abs(drag.current - drag.anchor) * PX_PER_MINUTE}
                  startMinutes={Math.min(drag.anchor, drag.current)}
                  endMinutes={Math.max(drag.anchor, drag.current)}
                />
              )}

              {isToday && nowMinutes >= from && nowMinutes <= to && (
                <div
                  className="absolute inset-x-0 z-20 border-t-2 border-accent"
                  style={{ top: (nowMinutes - from) * PX_PER_MINUTE }}
                >
                  <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-accent" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {proposed && (
        <DragToBlockDialog
          range={proposed}
          date={date}
          onClose={() => setProposed(null)}
        />
      )}

      {selected && appointments[selected] && (
        <AppointmentSheet
          appointment={appointments[selected]}
          days={rescheduleDays}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Shade({ top, height }: { top: number; height: number }) {
  if (height <= 0) return null;
  return (
    <div
      className="absolute inset-x-0 bg-ground/60"
      style={{ top, height }}
      aria-hidden="true"
    />
  );
}

const BLOCK_STYLES: Record<ScheduleBlock["kind"], string> = {
  appointment: "border-brass bg-brass-dim text-bone",
  break: "border-line-strong bg-surface-2 text-bone-3",
  timeoff: "border-accent bg-accent-dim text-bone-2",
};

function Block({
  block,
  from,
  onSelect,
}: {
  block: ScheduleBlock;
  from: number;
  onSelect?: () => void;
}) {
  const top = (block.startMinutes - from) * PX_PER_MINUTE;
  const height = Math.max(
    18,
    (block.endMinutes - block.startMinutes) * PX_PER_MINUTE,
  );
  const isNoShow = block.status === "NO_SHOW";
  const isDone = block.status === "COMPLETED";

  const className = `absolute inset-x-1 z-10 overflow-hidden rounded-[3px] border px-2 py-1 text-left ${
    BLOCK_STYLES[block.kind]
  } ${isNoShow ? "border-accent bg-accent-dim" : ""} ${isDone ? "opacity-55" : ""} ${
    onSelect ? "cursor-pointer hover:brightness-125" : ""
  }`;

  const Tag = onSelect ? "button" : "div";

  return (
    <Tag
      data-block={onSelect ? "appointment" : "static"}
      type={onSelect ? "button" : undefined}
      onClick={onSelect}
      className={className}
      style={{ top, height }}
      title={`${minutesToTimeInput(block.startMinutes)} ${block.title}`}
    >
      <p className="truncate text-[0.7rem] font-semibold leading-tight">
        {block.title}
      </p>
      {height > 32 && block.subtitle && (
        <p className="truncate text-[0.65rem] leading-tight opacity-75">
          {block.subtitle}
        </p>
      )}
      {height > 46 && (
        <p className="mt-0.5 text-[0.6rem] tabular-nums opacity-60">
          {minutesToTimeInput(block.startMinutes)}
        </p>
      )}
    </Tag>
  );
}
