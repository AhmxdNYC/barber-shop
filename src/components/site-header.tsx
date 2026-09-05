"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStaffHint } from "@/lib/auth/use-staff-hint";
import { isNavActive } from "@/lib/nav-active";
import { Wordmark } from "@/components/ui/wordmark";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/barbers", label: "Barbers" },
  { href: "/gallery", label: "Gallery" },
  { href: "/#visit", label: "Visit" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Lets the barber reach his dashboard after scanning the shop's QR code,
  // without the public pages giving up static rendering.
  const isStaff = useStaffHint();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ground/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="group flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <Wordmark className="text-lg" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`border-b-2 pb-0.5 text-sm transition-colors ${
                  active
                    ? "border-bone text-bone"
                    : "border-transparent text-bone-2 hover:text-bone"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {isStaff ? (
            <Link
              href="/dashboard"
              className="rounded-[3px] border border-brass px-4 py-2 text-sm font-semibold text-brass transition-colors hover:bg-brass-dim"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm text-bone-3 transition-colors hover:text-bone"
            >
              Barber login
            </Link>
          )}
          <Link
            href="/book"
            className="rounded-[3px] bg-accent px-4 py-2 text-sm font-semibold text-bone transition-colors hover:bg-accent-bright"
          >
            Book a chair
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-line text-bone md:hidden"
        >
          <span className="relative block h-3 w-4" aria-hidden="true">
            <span
              className={`absolute left-0 block h-[2px] w-4 bg-current transition-transform ${
                open ? "top-[5px] rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-[5px] block h-[2px] w-4 bg-current transition-opacity ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-[2px] w-4 bg-current transition-transform ${
                open ? "top-[5px] -rotate-45" : "top-[10px]"
              }`}
            />
          </span>
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-surface px-5 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block border-b border-line py-3 text-bone-2 last:border-b-0"
            >
              {item.label}
            </Link>
          ))}
          {isStaff ? (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="mt-3 block rounded-[3px] border border-brass px-4 py-3 text-center font-semibold text-brass"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-3 block py-2 text-center text-sm text-bone-3"
            >
              Barber login
            </Link>
          )}
          <Link
            href="/book"
            onClick={() => setOpen(false)}
            className="mt-3 block rounded-[3px] bg-accent px-4 py-3 text-center font-semibold text-bone"
          >
            Book a chair
          </Link>
        </nav>
      )}
    </header>
  );
}
