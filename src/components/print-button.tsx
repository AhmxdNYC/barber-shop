"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-[3px] bg-accent px-6 py-2.5 text-sm font-semibold text-bone transition-colors hover:bg-accent-bright"
    >
      Print poster
    </button>
  );
}
