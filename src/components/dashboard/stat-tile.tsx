export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "warn";
}) {
  return (
    <div className="rounded-[3px] border border-line bg-surface p-4">
      <p className="text-[0.65rem] uppercase tracking-[0.12em] text-bone-3">
        {label}
      </p>
      <p
        className={`mt-1.5 font-display text-2xl font-extrabold tabular-nums ${
          tone === "warn" ? "text-accent" : "text-bone"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-bone-3">{hint}</p>}
    </div>
  );
}
