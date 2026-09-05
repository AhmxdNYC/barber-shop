/**
 * Whether a navigation link points at the page currently open.
 *
 * A plain equality check gets this wrong in both directions. It loses the
 * highlight on any nested route — opening one client from the client list
 * would leave nothing in the navigation lit — and on a query string, so
 * filtering the gallery by barber would unhighlight Gallery.
 *
 * So a link matches its own path or anything beneath it. The exception is a
 * section's own index, which must be exact: /dashboard is a prefix of every
 * dashboard route, and treating it loosely would light "Today" on every
 * page in the section.
 */
export function isNavActive(
  pathname: string,
  href: string,
  options: { exact?: boolean } = {},
): boolean {
  // An anchor jumps within a page rather than to one, so it is never the
  // "current page" — otherwise a link to /#visit would light up as soon as
  // the home page loaded, with nothing else marked.
  if (href.includes("#")) return false;

  const path = href.split("?")[0];
  if (!path || path === "/" || options.exact) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}
