"use client";

import { useEffect, useRef, useState } from "react";
import { SHOP, ADDRESS_LINE } from "@/lib/shop";
import "leaflet/dist/leaflet.css";

/**
 * Dark-tiled map of the shop.
 *
 * Uses CARTO's dark basemap over OpenStreetMap data — no API key, no account
 * and no bill, which keeps this consistent with the rest of the stack. Leaflet
 * touches `window`, so it is imported inside the effect rather than at module
 * scope.
 */
export function ShopMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !containerRef.current) return;

        const { lat, lng } = SHOP.coords;

        map = L.map(el, {
          center: [lat, lng],
          zoom: 16,
          scrollWheelZoom: false,
          attributionControl: true,
        });

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 20,
          },
        ).addTo(map);

        // Barber-pole pin rather than Leaflet's default blue marker.
        const icon = L.divIcon({
          className: "shop-pin",
          html: `
            <span class="shop-pin__pulse"></span>
            <span class="shop-pin__dot"></span>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        L.marker([lat, lng], { icon, title: SHOP.name })
          .addTo(map)
          .bindPopup(
            `<strong>${SHOP.name}</strong><br/>${SHOP.address.line1}<br/>${SHOP.address.city}, ${SHOP.address.state} ${SHOP.address.postalCode}`,
          );
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  if (failed) {
    return (
      <div className="flex aspect-4/3 items-center justify-center rounded-[3px] border border-line bg-surface p-6 text-center">
        <p className="text-sm text-bone-2">
          Map couldn&rsquo;t load.{" "}
          <a
            href={SHOP.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:text-accent-bright"
          >
            Open in Google Maps
          </a>
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Map showing ${SHOP.name} at ${ADDRESS_LINE}`}
      className="aspect-4/3 w-full overflow-hidden rounded-[3px] border border-line bg-surface"
    />
  );
}
