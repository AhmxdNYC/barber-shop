/**
 * The shop's name, set the way the sign above the door is.
 *
 * Real signage is not a font choice on its own — the outline is what gives
 * painted lettering its weight. `paint-order: stroke fill` puts that stroke
 * behind the glyphs so it adds heft without closing up the counters, which
 * is what a naive text-stroke does at small sizes.
 */
export function Wordmark({
  tone = "light",
  className = "",
  as: Tag = "span",
}: {
  /** "light" for the dark site, "dark" for paper and the poster. */
  tone?: "light" | "dark";
  className?: string;
  as?: "span" | "h1" | "h2";
}) {
  return (
    <Tag className={`wordmark wordmark--${tone} ${className}`}>Eduardo&rsquo;s</Tag>
  );
}

/** The wordmark on its green board, for places with room for the sign. */
export function WordmarkPlaque({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark-plaque ${className}`}>
      <Wordmark tone="light" />
    </span>
  );
}
