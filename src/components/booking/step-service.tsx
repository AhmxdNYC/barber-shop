import { getBarber, type Service } from "@/lib/shop";
import { PriceRow } from "@/components/ui/price-row";
import { Button } from "@/components/ui/button";

export function StepService({
  services,
  barberSlug,
  onSelect,
  onBack,
}: {
  services: Service[];
  barberSlug: string | null;
  onSelect: (slug: string) => void;
  onBack: () => void;
}) {
  const barber = barberSlug ? getBarber(barberSlug) : undefined;

  return (
    <section>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">
        What are we doing?
      </h1>
      <p className="mt-2 text-bone-2">
        {barber ? `With ${barber.name}.` : "First available barber."}
      </p>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {services.map((service) => (
          <li key={service.slug}>
            <button
              type="button"
              onClick={() => onSelect(service.slug)}
              className="group w-full py-4 transition-colors hover:bg-surface"
            >
              <PriceRow service={service} />
            </button>
          </li>
        ))}
      </ul>

      <Button variant="ghost" padded={false} className="mt-8" onClick={onBack}>
        &larr; Back
      </Button>
    </section>
  );
}
