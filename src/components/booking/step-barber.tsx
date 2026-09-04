import { BARBERS, type Barber } from "@/lib/shop";

/**
 * Choosing the chair comes first, before the service.
 *
 * People pick a barbershop for a person, not a haircut, so asking "who's
 * cutting?" first matches how clients actually think. It also means the
 * times shown later are that barber's real availability rather than the
 * shop's, which avoids offering a slot and then taking it away.
 */
export function StepBarber({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (slug: string | null) => void;
}) {
  return (
    <section>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        Who&rsquo;s cutting?
      </h1>
      <p className="mt-2 text-bone-2">
        Pick a chair, or let us give you whoever opens up first.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {BARBERS.map((barber) => (
          <BarberOption
            key={barber.slug}
            barber={barber}
            isSelected={selected === barber.slug}
            onSelect={() => onSelect(barber.slug)}
          />
        ))}

        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex items-center gap-4 rounded-[3px] border border-dashed border-line-strong p-3 text-left transition-colors hover:border-bone-3"
        >
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[3px] border border-line text-bone-3">
            <span className="font-display text-xl font-bold">?</span>
          </span>
          <span>
            <span className="block font-display font-bold">First available</span>
            <span className="block text-sm text-bone-2">
              Whoever opens up soonest
            </span>
          </span>
        </button>
      </div>
    </section>
  );
}

function BarberOption({
  barber,
  isSelected,
  onSelect,
}: {
  barber: Barber;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-4 rounded-[3px] border p-3 text-left transition-colors ${
        isSelected
          ? "border-accent bg-accent-dim"
          : "border-line bg-surface hover:border-line-strong"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={barber.photo}
        alt=""
        className="h-16 w-16 shrink-0 rounded-[3px] object-cover"
      />
      <span className="min-w-0">
        <span className="block font-display font-bold">{barber.name}</span>
        <span className="block truncate text-sm text-accent">
          {barber.specialty}
        </span>
        {!barber.isPlaceholder && (
          <span className="mt-0.5 block text-xs text-bone-3">
            Next open {barber.nextAvailable}
          </span>
        )}
      </span>
    </button>
  );
}
