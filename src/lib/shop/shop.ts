/**
 * Shop content — the single place the shop's own details are written.
 *
 * Swapping this directory for the real shop's information is the only change
 * needed to take the site from placeholder to live. `prisma/seed.ts` reads
 * from here too, so the database and the marketing pages cannot disagree.
 */
export const SHOP = {
  name: "Eduardo's",
  /**
   * "One chair" was a leftover from when this was built for a single barber.
   * The shop has four, and the line now says the thing most likely to stop
   * someone booking: that there is no account to make.
   */
  tagline: "Four chairs, no sign-up. Book the time, get the cut.",
  phone: "(914) 476-5347",
  email: "", // TODO: ask the shop. Empty hides it in the UI.
  address: {
    line1: "57 Park Hill Avenue",
    city: "Yonkers",
    state: "NY",
    postalCode: "10701",
  },
  /**
   * The storefront.
   *
   * Worth its place because it is genuinely useful, not decorative: the shop
   * is a green door in a red brick terrace with a barber pole beside it, and
   * a first-time client walking down Park Hill Avenue is looking for exactly
   * that. Replace with a real photograph at the same path.
   */
  storefrontPhoto: "/storefront.jpg",

  /**
   * Sits behind the name at the top of the site.
   *
   * A photograph of the room the client is actually walking into. Until an
   * interior shot exists this reuses the storefront, which is at least the
   * right building — a stock interior of a bigger shop would promise a room
   * the shop does not have.
   */
  heroPhoto: "/storefront.jpg",

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
