import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";

const VARIANTS: Record<Variant, string> = {
  // White on black: the primary action reads as the primary action without
  // borrowing a colour that also means "warning" or "confirmed" elsewhere.
  primary: "bg-bone text-ground hover:bg-white",
  outline: "border border-line-strong text-bone hover:border-bone-3",
  ghost: "text-bone-3 hover:text-bone",
};

const BASE =
  "inline-block rounded-[3px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";

const PADDING = "px-6 py-3";

function classesFor(variant: Variant, padded: boolean, extra?: string) {
  return [BASE, VARIANTS[variant], padded ? PADDING : "", extra]
    .filter(Boolean)
    .join(" ");
}

/** A button that performs an action. */
export function Button({
  variant = "primary",
  padded = true,
  className,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: Variant;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <button type="button" className={classesFor(variant, padded, className)} {...props}>
      {children}
    </button>
  );
}

/** A link styled as a button, for navigation rather than action. */
export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
  external,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  const classes = classesFor(variant, true, `text-center ${className ?? ""}`);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
