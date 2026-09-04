import type { ReactNode } from "react";

/**
 * A collapsible section built on <details>.
 *
 * Native rather than JavaScript state: it works before hydration, keyboard
 * and screen-reader behaviour comes for free, and there is no flash of a
 * section rendering open then snapping shut.
 */
export function Disclosure({
  title,
  hint,
  children,
  defaultOpen = false,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[3px] border border-line bg-surface [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4">
        <span>
          <span className="font-display text-lg font-bold">{title}</span>
          {hint && <span className="mt-0.5 block text-sm text-bone-3">{hint}</span>}
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 text-bone-3 transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="border-t border-line p-5">{children}</div>
    </details>
  );
}
