import type { MetadataRoute } from "next";
import { SHOP } from "@/lib/shop";

/**
 * Web app manifest.
 *
 * The point of this is the barber, not the client. With it, he can add the
 * dashboard to his home screen and open it as a full-screen app — no browser
 * chrome, no address bar, no typing a URL. Combined with the rolling
 * thirty-day session, tapping the icon puts him straight on today's schedule.
 *
 * `start_url` is the public site because that is what a client installing it
 * should get. iOS "Add to Home Screen" uses whatever page is open at the
 * time, so the barber installing from /dashboard lands there instead.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SHOP.name,
    short_name: "Eduardo",
    description: SHOP.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#14130F",
    theme_color: "#14130F",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
