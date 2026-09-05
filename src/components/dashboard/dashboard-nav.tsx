"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { isNavActive } from "@/lib/nav-active";
import { SHOP } from "@/lib/shop";

const LINKS = [
  { href: "/dashboard", label: "Today" },
  { href: "/dashboard/services", label: "Prices" },
  { href: "/dashboard/barbers", label: "Barbers" },
  { href: "/dashboard/gallery", label: "Gallery" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/revenue", label: "Revenue" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="font-display text-sm font-extrabold">
              {SHOP.name}
            </span>
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {LINKS.map((l) => {
              // "Today" is /dashboard, which prefixes every other route in
              // the section, so it only counts as current when exact.
              const active = isNavActive(pathname, l.href, {
                exact: l.href === "/dashboard",
              });
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b-2 pb-0.5 transition-colors ${
                    active
                      ? "border-bone font-semibold text-bone"
                      : "border-transparent text-bone-3 hover:text-bone-2"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold text-bone">{name}</span>
          <Link href="/" className="text-bone-2 hover:text-bone">
            View site
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-bone-2 hover:text-bone">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
