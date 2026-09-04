/** The chairs. Only Eduardo is real; the rest await details from the shop. */
/* ── barbers ───────────────────────────────────────────────────── */

export type Barber = {
  slug: string;
  name: string;
  /** What clients actually call them. */
  nickname: string;
  /** One-line specialty, shown under the name on the picker. */
  specialty: string;
  bio: string;
  yearsExperience: number;
  /** Swap these for real photographs — same path, real .jpg. */
  photo: string;
  instagram?: string;
  /** Service slugs this barber takes. Empty means all of them. */
  services: string[];
  /** Placeholder until availability is wired to the backend. */
  nextAvailable: string;
  /** True until this chair has a real name and photo from the shop. */
  isPlaceholder?: boolean;
};

export const BARBERS: Barber[] = [
  {
    slug: "eduardo",
    name: "Eduardo",
    nickname: "Eddie",
    specialty: "Fades & tapers",
    bio: "Owner, and still takes the first chair every day. If you want it tight, blended and done right, this is the seat.",
    yearsExperience: 14,
    photo: "/barbers/eduardo.svg",
    instagram: "https://instagram.com",
    services: [],
    nextAvailable: "Today, 2:30pm",
  },
  {
    slug: "chair-2",
    name: "Second Chair",
    nickname: "",
    specialty: "Name and photo to come",
    bio: "This is where the second barber's name, specialty and photo go. The layout is ready — it just needs the real details.",
    yearsExperience: 0,
    photo: "/barbers/chair-2.svg",
    services: [],
    nextAvailable: "—",
    isPlaceholder: true,
  },
  {
    slug: "chair-3",
    name: "Third Chair",
    nickname: "",
    specialty: "Name and photo to come",
    bio: "This is where the third barber's name, specialty and photo go. The layout is ready — it just needs the real details.",
    yearsExperience: 0,
    photo: "/barbers/chair-3.svg",
    services: [],
    nextAvailable: "—",
    isPlaceholder: true,
  },
  {
    slug: "chair-4",
    name: "Fourth Chair",
    nickname: "",
    specialty: "Name and photo to come",
    bio: "This is where the fourth barber's name, specialty and photo go. The layout is ready — it just needs the real details.",
    yearsExperience: 0,
    photo: "/barbers/chair-4.svg",
    services: [],
    nextAvailable: "—",
    isPlaceholder: true,
  },
];

export function getBarber(slug: string): Barber | undefined {
  return BARBERS.find((b) => b.slug === slug);
}

/** Barbers who take a given service. */
export function barbersForService(serviceSlug: string): Barber[] {
  return BARBERS.filter(
    (b) => b.services.length === 0 || b.services.includes(serviceSlug),
  );
}

export function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}
