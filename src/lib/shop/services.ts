/** The price menu. Prices are placeholders until confirmed with the shop. */
/* ── services ──────────────────────────────────────────────────── */

/** NOTE: prices below are placeholders — swap for the shop's real menu. */
export type Service = {
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
  /** Shown with a "most booked" marker on the menu. */
  popular?: boolean;
};

export const SERVICES: Service[] = [
  {
    slug: "adult-haircut",
    name: "Adult Haircut",
    description: "Cut and styled.",
    durationMinutes: 45,
    priceCents: 4500,
    popular: true,
  },
  {
    slug: "kids-haircut",
    name: "Kids Haircut",
    description: "Twelve and under.",
    durationMinutes: 30,
    priceCents: 3000,
  },
];

export function getService(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
