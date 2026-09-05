"use client";

import { useState } from "react";
import { minutesToTimeInput } from "@/lib/shop";
import { AppointmentSheet, type SheetAppointment } from "./appointment-sheet";
import { BlockSheet, type SheetBlock } from "./block-sheet";
import {
  DragPreview,
  DragToBlockDialog,
  useColumnDrag,
  type DragRange,
} from "./drag-to-block";
import type { BarberDay, ScheduleBlock, ShopDay } from "@/lib/dashboard/day-schedule";

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
  shop,
  appointments,
  rescheduleDays,
  date,
  ownBarberId,
}: {
  days: BarberDay[];
  /** The shop's own opening hours, drawn behind every chair. */
  shop: ShopDay;
  nowMinutes: number;
  isToday: boolean;
  /** Detail for each appointment block, keyed by id. */
  appointments: Record<string, SheetAppointment>;
  rescheduleDays: { date: string; weekday: string; dayNum: string }[];
  /** The day being viewed, "YYYY-MM-DD", for blocks dragged out. */
  date: string;
  /**
   * The chair belonging to whoever is signed in.
   *
   * A barber opens this to see his own day; the other chairs matter for
   * cover and for fitting someone in, but they are context. Giving all four
   * equal weight makes finding your own column a search every time.
   */
  ownBarberId?: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<SheetBlock | null>(null);
  const [proposed, setProposed] = useState<DragRange | null>(null);
  // Off by default: reading the day is what this is opened for, and blocking
  // time out is occasional. Desktop ignores it — a mouse can drag either way.
  const [blockMode, setBlockMode] = useState(false);
  const open = days.filter((d) => !d.isClosed);

  // One shared vertical scale, so columns line up across chairs. Computed
  // before any early return, because the drag hook below depends on it and
  // hooks cannot run conditionally.
  // The scale covers the shop's whole day, not just the hours somebody is
  // working, so closed time is visible as closed rather than simply missing.
  const earliest = open.length
    ? Math.min(shop.opensAtMinutes, ...open.map((d) => d.opensAtMinutes))
    : shop.opensAtMinutes;
  const latest = open.length
    ? Math.max(shop.closesAtMinutes, ...open.map((d) => d.closesAtMinutes))
    : shop.closesAtMinutes;
  const from = Math.floor(earliest / 60) * 60;
  const to = Math.ceil(latest / 60) * 60;
  const height = (to - from) * PX_PER_MINUTE;

  const hourMarks: number[] = [];
  for (let m = from; m <= to; m += 60) hourMarks.push(m);

  const nameFor = (barberId: string) =>
    days.find((d) => d.barberId === barberId)?.barberName ?? "";

  const { drag, handlers } = useColumnDrag({
    pxPerMinute: PX_PER_MINUTE,
    fromMinutes: from,
    blockMode,
    onComplete: (barberId, startMinutes, endMinutes) =>
      setProposed({
        barberId,
        barberName: nameFor(barberId),
        startMinutes,
        endMinutes,
      }),
  });

  /** What tapping a block does, which depends on what kind of block it is. */
  function selectHandler(block: ScheduleBlock, barberName: string) {
    if (block.kind === "appointment") {
      return appointments[block.id] ? () => setSelected(block.id) : undefined;
    }
    const kind = block.kind;
    return () =>
      setSelectedBlock({
        id: block.id,
        kind,
        title: block.title,
        barberName,
        when: `${label(block.startMinutes)} – ${label(block.endMinutes)}`,
        repeats: kind === "break",
      });
  }

  const dragHandlers = (barberId: string) => ({
    onPointerDown: handlers.onPointerDown(barberId),
    onPointerMove: handlers.onPointerMove,
    onPointerUp: handlers.onPointerUp,
    onPointerCancel: handlers.onPointerCancel,
  });

  if (shop.isClosed) {
    return (
      <p className="rounded-[3px] border border-line bg-surface p-8 text-center text-bone-2">
        The shop is closed today. Nothing can be booked.
      </p>
    );
  }

  if (open.length === 0) {
    return (
      <p className="rounded-[3px] border border-line bg-surface p-8 text-center text-bone-2">
        The shop is open, but nobody is working.
      </p>
    );
  }

  return (
    <>
      {/* Touch only. A finger moving down a column means both "scroll" and
          "block out an hour", and no gesture reliably separates them, so the
          calendar asks instead of guessing. */}
      <div className="mb-2 flex items-center justify-between gap-3 sm:hidden">
        <p className="text-xs text-bone-3">
          {blockMode
            ? "Drag a column to block out time."
            : "Tap anything to manage it. Scroll from the clock on the left."}
        </p>
        <button
          type="button"
          onClick={() => setBlockMode((on) => !on)}
          aria-pressed={blockMode}
          className={`shrink-0 rounded-[3px] border px-3 py-1.5 text-xs font-semibold transition-colors ${
            blockMode
              ? "border-off bg-off-dim text-off"
              : "border-line text-bone-2"
          }`}
        >
          {blockMode ? "Done blocking" : "Block time"}
        </button>
      </div>

      <div className="flex overflow-hidden rounded-[3px] border border-line bg-surface">
        {/*
          The clock sits outside the pannable strip, not pinned inside it.
          Pinned, it stayed where it looked like it should be but a touch on
          it was still a touch on the scroller, so the one place meant for
          putting a thumb down and moving the page was the one place that
          would not. Out here it is an ordinary column of the page and does
          the ordinary thing.

          It still never scrolls away from the chairs, because it is no
          longer in the thing that scrolls. Wider on a phone: it went from a
          label to something you aim at.
        */}
        <div className="w-16 shrink-0 border-r border-line pt-9 sm:w-14">
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

        <div className="flex min-w-0 flex-1 snap-x snap-proximity overflow-x-auto overscroll-x-contain">
        {days.map((day) => {
          const isOwn = !ownBarberId || day.barberId === ownBarberId;
          return (
          <div
            key={day.barberId}
            className={`w-[9.5rem] shrink-0 snap-start border-r border-line last:border-r-0 sm:w-auto sm:min-w-0 sm:flex-1 ${
              isOwn ? "" : "opacity-60"
            }`}
          >
            <h3
              className={`truncate border-b px-3 py-2 text-sm ${
                isOwn
                  ? "border-line font-semibold text-bone"
                  : "border-line font-normal text-bone-2"
              }`}
            >
              {day.barberName}
              {day.isClosed && <span className="ml-2 text-xs text-bone-3">off</span>}
            </h3>

            <div
              className={`relative select-none ${
                blockMode ? "touch-none" : "touch-auto"
              } ${
                drag?.barberId === day.barberId
                  ? "bg-accent-dim/30 ring-1 ring-inset ring-accent/40"
                  : ""
              }`}
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
                  <Shade
                    top={0}
                    height={(day.opensAtMinutes - from) * PX_PER_MINUTE}
                    label={day.opensAtMinutes > shop.opensAtMinutes ? "Not in" : "Closed"}
                  />
                  <Shade
                    top={(day.closesAtMinutes - from) * PX_PER_MINUTE}
                    height={(to - day.closesAtMinutes) * PX_PER_MINUTE}
                    label={day.closesAtMinutes < shop.closesAtMinutes ? "Finished" : "Closed"}
                  />
                </>
              )}
              {day.isClosed && <Shade top={0} height={height} label="Off" />}

              {day.blocks.map((block) => (
                <Block
                  key={block.id}
                  block={block}
                  from={from}
                  onSelect={selectHandler(block, day.barberName)}
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
          );
        })}
        </div>
      </div>

      {proposed && (
        <DragToBlockDialog
          range={proposed}
          date={date}
          onClose={() => setProposed(null)}
        />
      )}

      {selectedBlock && (
        <BlockSheet
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
        />
      )}

      {selected && appointments[selected] && (
        <AppointmentSheet
          appointment={appointments[selected]}
          days={rescheduleDays}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

/**
 * Time that cannot be booked, drawn rather than left blank.
 *
 * An empty stretch at the top of a column reads as free. Labelling it says
 * which kind of unavailable it is — the shop shut, or this barber not in —
 * which are different problems with different fixes.
 */
function Shade({
  top,
  height,
  label,
}: {
  top: number;
  height: number;
  label?: string;
}) {
  if (height <= 0) return null;
  return (
    <div
      className="closed-shade absolute inset-x-0 flex items-center justify-center"
      style={{ top, height }}
      aria-hidden="true"
    >
      {label && height > 26 && (
        <span className="text-[0.6rem] uppercase tracking-[0.14em] text-bone-3">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Colour carries the state of an appointment.
 *
 * Reading a day should not mean opening every square. Green is settled work,
 * red is a client who did not turn up, blue is still to come, and anything
 * grey is not a booking at all. Status is also spelled out in the text, so
 * the colour is a shortcut rather than the only signal.
 */
const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "border-brass bg-brass-dim text-bone",
  NO_SHOW: "border-danger bg-danger-dim text-bone",
  CONFIRMED: "border-accent bg-accent-dim text-bone",
  PENDING_PAYMENT: "border-dashed border-line-strong bg-surface-2 text-bone-2",
};

/** Spelled out, so colour is a shortcut rather than the only signal. */
const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Done",
  NO_SHOW: "No-show",
  CONFIRMED: "Booked",
  PENDING_PAYMENT: "Unpaid hold",
};

const BLOCK_STYLES: Record<ScheduleBlock["kind"], string> = {
  appointment: "border-accent bg-accent-dim text-bone",
  break: "block-off border-off/45 bg-off-dim text-off",
  timeoff: "block-off border-off/45 bg-off-dim text-off",
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
  const style =
    (block.status && STATUS_STYLES[block.status]) ?? BLOCK_STYLES[block.kind];

  const className = `absolute inset-x-1 z-10 overflow-hidden rounded-[3px] border px-2 py-1 text-left ${style} ${
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
      {height > 30 && block.subtitle && (
        <p className="truncate text-[0.65rem] leading-tight opacity-75">
          {block.subtitle}
        </p>
      )}
      {height > 48 && block.status && STATUS_LABELS[block.status] && (
        <p className="mt-0.5 text-[0.6rem] uppercase tracking-[0.08em] opacity-70">
          {STATUS_LABELS[block.status]}
        </p>
      )}
      {/* No third line repeating the time: the block is positioned against
          an hour gutter and sized by its length, so printing 14:00 inside it
          restated what the position already said — in 24-hour form, next to
          a gutter labelled in 12-hour. */}
    </Tag>
  );
}
