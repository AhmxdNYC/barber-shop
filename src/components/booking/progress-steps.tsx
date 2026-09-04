import { STEPS, type Step } from "./types";

/**
 * The step indicator. Completed steps are clickable so someone can go back
 * and change their barber without losing the rest of their choices.
 */
export function ProgressSteps({
  current,
  onGoTo,
}: {
  current: Step;
  onGoTo: (step: Step) => void;
}) {
  return (
    <ol className="mb-10 flex items-center gap-2 text-xs">
      {STEPS.map((label, i) => {
        const done = i < current;
        const isCurrent = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => done && onGoTo(i as Step)}
              disabled={!done}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${label}`}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.7rem] font-semibold transition-colors ${
                done
                  ? "cursor-pointer border-accent bg-accent text-bone"
                  : isCurrent
                    ? "border-bone text-bone"
                    : "border-line text-bone-3"
              }`}
            >
              {done ? "✓" : i + 1}
            </button>
            <span
              className={`hidden sm:block ${
                i > current ? "text-bone-3" : "text-bone-2"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
