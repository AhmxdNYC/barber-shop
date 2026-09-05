import "server-only";

/**
 * The shop's Google rating.
 *
 * Live review data comes from the Places API, which needs a key and a
 * billing account. That is a real cost and a real setup step, and the
 * rating changes a few times a year at most — so the number is recorded
 * here and the API is an upgrade rather than a requirement.
 *
 * Set GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID and it refreshes itself
 * daily. Leave them unset and it serves the recorded figure. Either way the
 * page renders the same, and a failed or throttled request falls back
 * rather than dropping the rating off the homepage.
 */

export type ShopRating = {
  value: number;
  count: number;
  /** True when the figure came from Google just now, not from the file. */
  live: boolean;
};

/**
 * Read from the shop's Google listing on 4 September 2026. Update it when it
 * drifts, or add a key and stop thinking about it.
 */
const RECORDED = { value: 4.6, count: 86 } as const;

export async function shopRating(): Promise<ShopRating> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!key || !placeId) return { ...RECORDED, live: false };

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "rating,userRatingCount",
        },
        // A rating that is a day stale is fine. A homepage that waits on
        // Google every request is not.
        next: { revalidate: 86_400 },
      },
    );
    if (!res.ok) return { ...RECORDED, live: false };

    const data = (await res.json()) as {
      rating?: number;
      userRatingCount?: number;
    };
    if (typeof data.rating !== "number" || typeof data.userRatingCount !== "number") {
      return { ...RECORDED, live: false };
    }
    return { value: data.rating, count: data.userRatingCount, live: true };
  } catch {
    return { ...RECORDED, live: false };
  }
}
