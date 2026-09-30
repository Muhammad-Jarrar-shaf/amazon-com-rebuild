import { MenuIcon } from "@/components/icons";
import { MenuButton } from "@/components/layout/menu-button";
import { NavLink } from "@/components/ui/nav-link";
import { MOBILE_CHIPS, SECONDARY_NAV } from "@/lib/nav";

/** Desktop/tablet sub-nav (>=768px): the "All" menu trigger followed by the observed links. */
export function SecondaryNav() {
  return (
    <nav aria-label="Shop menu" data-surface="dark" data-shell="subnav" className="hidden bg-subnav text-white md:block">
      <ul className="mx-auto flex h-[var(--subnav-h)] w-full max-w-[var(--shell-max)] items-center overflow-hidden px-2 text-sm">
        <li>
          <MenuButton className="nav-item flex items-center gap-1 px-2 py-1 font-bold">
            <MenuIcon className="size-5" />
            All
          </MenuButton>
        </li>
        {SECONDARY_NAV.map((item) => (
          <li key={item.label} className={item.lgOnly ? "hidden lg:block" : undefined}>
            <NavLink href={item.href} className="nav-item block px-2 py-1 whitespace-nowrap">
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Mobile chip row (<768px): horizontally scrollable, so the scroll container is keyboard-focusable
 * (axe: scrollable-region-focusable) even though its chips are not links yet.
 */
export function MobileChipNav() {
  return (
    <nav
      aria-label="Quick links"
      tabIndex={0}
      data-surface="dark"
      data-shell="chips"
      className="overflow-x-auto bg-subnav text-white [scrollbar-width:none] md:hidden"
    >
      <ul className="flex w-max min-w-full px-1">
        {MOBILE_CHIPS.map((item) => (
          <li key={item.label}>
            <NavLink href={item.href} className="nav-item flex min-h-[var(--tap)] items-center px-3 text-base whitespace-nowrap">
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
