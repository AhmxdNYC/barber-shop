import type { ReactNode } from "react";

/** Standard page section: eyebrow, heading, optional lede, then content. */
export function Section({
  eyebrow,
  title,
  lede,
  children,
  id,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  children?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-5 py-20 ${className}`}>
      <header className="max-w-2xl">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {title}
        </h2>
        {lede && <p className="mt-4 text-lg leading-relaxed text-bone-2">{lede}</p>}
      </header>
      {children}
    </section>
  );
}
