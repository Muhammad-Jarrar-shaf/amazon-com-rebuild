import type { MouseEventHandler } from "react";
import { CaretDownIcon, CartIcon, ChevronRightIcon, GlobeIcon, PersonIcon } from "@/components/icons";
import { NavLink } from "@/components/ui/nav-link";
import { formatCartCount } from "@/lib/nav";

interface EntryProps {
  className?: string;
}

// Destinations for these entries arrive in later slices (orders S5); until then NavLink renders
// them as intentionally unavailable (lib/nav.ts AVAILABLE_ROUTES).

export function AccountEntry({ className = "" }: EntryProps) {
  return (
    <NavLink href="/account" className={`nav-item flex min-h-[var(--tap)] items-center px-1 text-white md:px-2 ${className}`}>
      <span className="flex items-center gap-1 text-sm font-bold whitespace-nowrap md:hidden">
        Sign in
        <ChevronRightIcon className="hidden size-3.5 min-[375px]:block" />
        <PersonIcon className="size-6" />
      </span>
      <span className="hidden flex-col leading-tight whitespace-nowrap md:flex">
        <span className="text-xs">Hello, sign in</span>
        <span className="flex items-center text-sm font-bold">
          Account &amp; Lists
          <CaretDownIcon className="size-4" />
        </span>
      </span>
    </NavLink>
  );
}

export function OrdersEntry({ className = "" }: EntryProps) {
  return (
    <NavLink href="/orders" className={`nav-item hidden flex-col leading-tight whitespace-nowrap px-2 py-1 text-white lg:flex ${className}`}>
      <span className="text-xs">Returns</span>
      <span className="text-sm font-bold">&amp; Orders</span>
    </NavLink>
  );
}

export function LocaleEntry({ className = "" }: EntryProps) {
  return (
    <NavLink href="/language" className={`nav-item items-center gap-1 px-2 py-1 text-white ${className}`}>
      <GlobeIcon className="size-5" />
      <span className="text-sm font-bold">EN</span>
      <CaretDownIcon className="size-4" />
    </NavLink>
  );
}

export function CartEntry({ count, className = "", onClick }: EntryProps & { count: number; onClick?: MouseEventHandler<HTMLElement> }) {
  return (
    <NavLink
      href="/cart"
      onClick={onClick}
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
      className={`nav-item flex min-h-[var(--tap)] items-end gap-0.5 px-1 pb-1 text-white md:px-2 ${className}`}
    >
      <span className="relative block size-9">
        <span aria-hidden="true" className="absolute inset-x-0 top-[10px] left-[1.5px] text-center text-[15px] leading-none font-bold text-cart-count">
          {formatCartCount(count)}
        </span>
        <CartIcon className="size-9" />
      </span>
      <span aria-hidden="true" className="hidden pb-1 text-sm font-bold md:block">
        Cart
      </span>
    </NavLink>
  );
}
