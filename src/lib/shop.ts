/**
 * Every piece of shop-specific content lives here.
 * Swapping this file for the real shop's details is the only change
 * needed to take the site from placeholder to live.
 *
 * TODO: replace all of this with the real shop's information.
 */

export const SHOP = {
  name: "Eduardo Barbershop",
  tagline: "One chair. No rush. Book the time, get the cut.",
  phone: "(914) 476-5347",
  email: "", // TODO: ask the shop. Empty hides it in the UI.
  address: {
    line1: "57 Park Hill Avenue",
    city: "Yonkers",
    state: "NY",
    postalCode: "10701",
  },
  /** Exact pin from the shop's Google Maps listing. */
  coords: { lat: 40.9291924, lng: -73.8931055 },
  /**
   * The business name exactly as Google lists it, so the map embed
   * resolves to the real listing and labels the pin.
   */
  mapQuery: "Eduardo Barber Shop, 57 Park Hill Ave, Yonkers, NY 10701",
  instagram: "", // TODO: ask the shop for the handle. Empty hides it.
  mapUrl:
    "https://www.google.com/maps/place/Eduardo+Barber+Shop/@40.9290585,-73.8956612,17z/data=!4m6!3m5!1s0x89c2f26339d19203:0x24a11027237559b6!8m2!3d40.9291924!4d-73.8931055!16s%2Fg%2F1tghf20g",
  /** The shop already takes bookings here — see docs/BOOKING-PROVIDERS.md. */
  freshaUrl:
    "https://www.fresha.com/lvp/eduardo-barber-shop-park-hill-avenue-yonkers-wr8LbX",
  /** Deposit taken at booking; the balance is paid in the shop. */
  depositCents: 1000,
} as const;

export const ADDRESS_LINE = `${SHOP.address.line1}, ${SHOP.address.city}, ${SHOP.address.state} ${SHOP.address.postalCode}`;

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

/* ── hours ─────────────────────────────────────────────────────── */

export type DayHours = {
  day: string;
  short: string;
  /** Minutes from midnight, shop-local. null when closed. */
  opens: number | null;
  closes: number | null;
};

/** Index 0 is Sunday, matching JavaScript's getDay(). */
export const HOURS: DayHours[] = [
  // TODO: Sunday's closing time is not listed publicly — confirm with the shop.
  { day: "Sunday", short: "Sun", opens: 10 * 60 + 30, closes: 17 * 60 },
  { day: "Monday", short: "Mon", opens: 10 * 60 + 30, closes: 19 * 60 + 30 },
  { day: "Tuesday", short: "Tue", opens: 10 * 60 + 30, closes: 19 * 60 + 30 },
  { day: "Wednesday", short: "Wed", opens: 10 * 60 + 30, closes: 19 * 60 + 30 },
  { day: "Thursday", short: "Thu", opens: 10 * 60 + 30, closes: 19 * 60 + 30 },
  { day: "Friday", short: "Fri", opens: 10 * 60 + 30, closes: 19 * 60 + 30 },
  { day: "Saturday", short: "Sat", opens: 10 * 60, closes: 19 * 60 + 30 },
];

/* ── formatting ────────────────────────────────────────────────── */

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** 570 -> "9:30am" */
export function formatMinutes(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

export function formatHours(d: DayHours): string {
  if (d.opens === null || d.closes === null) return "Closed";
  return `${formatMinutes(d.opens)} – ${formatMinutes(d.closes)}`;
}

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
