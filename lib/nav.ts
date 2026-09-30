// Shell navigation data and the "is this destination built yet?" gate.

/** DOM id shared by the menu triggers and the drawer dialog. */
export const NAV_DRAWER_ID = "nav-drawer";

/** Fragment id of the top of the page; the footer's "Back to top" link points here. */
export const PAGE_TOP_ID = "site-top";

/**
 * Routes that exist in the app. Shell links to any other path render as intentionally
 * unavailable (see NavLink) instead of leading to a 404. Add a route here in the same
 * commit as the slice that implements it: S5 adds "/checkout" and "/orders".
 */
export const AVAILABLE_ROUTES: readonly string[] = ["/", "/s", "/dp/*", "/cart"];

/** Exact match, or a prefix match for routes ending in "/*" (a dynamic segment: "/dp/*" covers "/dp/<id>"). */
export function isAvailable(href: string): boolean {
  const path = href.split(/[?#]/)[0] ?? "";
  return AVAILABLE_ROUTES.some((route) => (route.endsWith("/*") ? path.startsWith(route.slice(0, -1)) && path.length > route.length - 1 : route === path));
}

export const UNAVAILABLE_HINT = "Not available in this build yet";

export interface NavItem {
  label: string;
  href: string;
  /** Hidden below the lg breakpoint so the desktop sub-nav never overflows at tablet width. */
  lgOnly?: boolean;
}

// Observed on amazon.com at 1440px (docs/product-recon.md), in order. "All" is the drawer trigger.
export const SECONDARY_NAV: readonly NavItem[] = [
  { label: "Prime Video", href: "/prime-video" },
  { label: "Coupons", href: "/coupons" },
  { label: "Customer Service", href: "/help" },
  { label: "Today's Deals", href: "/deals" },
  { label: "Registry", href: "/registry", lgOnly: true },
  { label: "Gift Cards", href: "/gift-cards", lgOnly: true },
  { label: "Sell", href: "/sell", lgOnly: true },
];

// Observed mobile chip row at 375px (first items; the real row scrolls further).
export const MOBILE_CHIPS: readonly NavItem[] = [
  { label: "Deals", href: "/deals" },
  { label: "Lists", href: "/lists" },
  { label: "Video", href: "/prime-video" },
  { label: "Music", href: "/music" },
  { label: "Best Sellers", href: "/best-sellers" },
  { label: "New Releases", href: "/new-releases" },
  { label: "Gift Cards", href: "/gift-cards" },
];

/** Header cart badge text: exact up to 99, then "99+" so the badge never outgrows its slot. */
export function formatCartCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "0";
  const whole = Math.floor(count);
  return whole > 99 ? "99+" : String(whole);
}
