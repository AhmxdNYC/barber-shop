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
    slug: "haircut",
    name: "Haircut",
    description: "Standard cut, washed and styled. Scissors or clippers.",
    durationMinutes: 30,
    priceCents: 4000,
    popular: true,
  },
  {
    slug: "taper-fade",
    name: "Taper Fade",
    description: "Gradual blend at the sides and neckline. Low, mid or high.",
    durationMinutes: 40,
    priceCents: 4000,
    popular: true,
  },
  {
    slug: "skin-fade",
    name: "Skin Fade",
    description: "Bald fade taken down to the skin and blended clean.",
    durationMinutes: 45,
    priceCents: 4500,
    popular: true,
  },
  {
    slug: "cut-and-beard",
    name: "Haircut & Beard",
    description: "Full cut plus beard shaped, lined and hot-towel finished.",
    durationMinutes: 60,
    priceCents: 6000,
    popular: true,
  },
  {
    slug: "buzz-cut",
    name: "Buzz Cut",
    description: "One guard all over, edged up clean.",
    durationMinutes: 20,
    priceCents: 2500,
  },
  {
    slug: "crew-cut",
    name: "Crew Cut",
    description: "Short back and sides, a little length left on top.",
    durationMinutes: 30,
    priceCents: 3000,
  },
  {
    slug: "undercut",
    name: "Undercut",
    description: "Disconnected sides with the top left long.",
    durationMinutes: 40,
    priceCents: 4000,
  },
  {
    slug: "pompadour",
    name: "Pompadour",
    description: "Volume up top, tight sides, styled and finished.",
    durationMinutes: 45,
    priceCents: 4500,
  },
  {
    slug: "beard-trim",
    name: "Beard Trim",
    description: "Shaped, edged and detailed. No haircut.",
    durationMinutes: 20,
    priceCents: 2500,
  },
  {
    slug: "line-up",
    name: "Line Up",
    description: "Edge up. Hairline and edges sharpened, in and out.",
    durationMinutes: 15,
    priceCents: 2000,
  },
  {
    slug: "hot-towel-shave",
    name: "Hot Towel Shave",
    description: "Straight razor, hot towels, the full ritual.",
    durationMinutes: 45,
    priceCents: 5000,
  },
  {
    slug: "kids-cut",
    name: "Kids Cut",
    description: "Twelve and under. Patience included.",
    durationMinutes: 30,
    priceCents: 3000,
  },
  {
    slug: "senior-cut",
    name: "Senior Cut",
    description: "Sixty-five and over.",
    durationMinutes: 30,
    priceCents: 2500,
  },
  {
    slug: "hair-design",
    name: "Hair Design",
    description: "Hard part or freehand design. Added to any cut.",
    durationMinutes: 15,
    priceCents: 1500,
  },
];

export function getService(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
