import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { SHOP } from "@/lib/shop";

const LINKS = [
  { href: "/dashboard", label: "Today" },
  { href: "/dashboard/availability", label: "Hours" },
  { href: "/dashboard/services", label: "Prices" },
  { href: "/dashboard/clients", label: "Clients" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({ name }: { name: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="pole-stripe flex-col gap-[3px]" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="font-display text-sm font-extrabold">
              {SHOP.name}
            </span>
          </Link>
          <nav className="flex gap-5 text-sm">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-bone-2 hover:text-bone">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-bone-3">{name}</span>
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
