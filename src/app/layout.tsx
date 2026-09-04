import type { Metadata } from "next";
import { Bodoni_Moda, Bricolage_Grotesque, Public_Sans } from "next/font/google";
import { SHOP, ADDRESS_LINE } from "@/lib/shop";
import { openingHours } from "@/lib/shop/opening-hours";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["600", "700", "800"],
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

/**
 * The wordmark face.
 *
 * A high-contrast serif, because that is what painted shop signage actually
 * is — the real sign above the door is white serif capitals on green. Loaded
 * only in the weights the wordmark uses.
 */
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  weight: ["700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SHOP.name} — Barbershop in ${SHOP.address.city}`,
    template: `%s · ${SHOP.name}`,
  },
  description: `${SHOP.tagline} Book online at ${SHOP.name}, ${ADDRESS_LINE}.`,
  appleWebApp: {
    capable: true,
    title: "Eduardo",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-180.png",
  },
  openGraph: {
    title: `${SHOP.name} — Barbershop in ${SHOP.address.city}`,
    description: SHOP.tagline,
    type: "website",
  },
};

/**
 * Revalidated hourly so edited hours reach the public site without making
 * every page dynamic. Saving hours also revalidates immediately, so the
 * hour is a ceiling, not a delay anyone normally sees.
 */
export const revalidate = 3600;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hours = await openingHours();

  return (
    <html lang="en" className={`${bricolage.variable} ${publicSans.variable} ${bodoni.variable}`}>
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter hours={hours} />
      </body>
    </html>
  );
}
