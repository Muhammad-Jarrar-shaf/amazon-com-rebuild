import { MenuIcon } from "@/components/icons";
import { DeliveryLocation } from "@/components/layout/delivery-location";
import { AccountEntry, CartEntry, LocaleEntry, OrdersEntry } from "@/components/layout/header-entries";
import { Logo } from "@/components/layout/logo";
import { MenuButton } from "@/components/layout/menu-button";
import { MobileBanner } from "@/components/layout/mobile-banner";
import { NavDrawer } from "@/components/layout/nav-drawer";
import { SearchBar } from "@/components/layout/search-bar";
import { MobileChipNav, SecondaryNav } from "@/components/layout/secondary-nav";
import { PAGE_TOP_ID } from "@/lib/nav";
import { getSuggestionTerms } from "@/lib/search/server";

/**
 * Site header (FR-NAV-1..4). One DOM for every width: the top bar is a CSS grid whose areas change per
 * breakpoint (see .header-grid in globals.css), the sub-nav (>=768) and chip row (<768) are separate navs,
 * and the delivery row shows below 1280 where the top bar no longer has room for it.
 * The cart count is fixed at 0 until the cart store exists (S4).
 */
export function Header() {
  return (
    <header id={PAGE_TOP_ID} data-shell="header">
      <MobileBanner />
      <div data-surface="dark" data-shell="topbar" className="bg-nav text-white">
        <div className="header-grid mx-auto w-full max-w-[var(--shell-max)]">
          <MenuButton label="Open menu" className="nav-item flex size-[var(--tap)] items-center justify-center [grid-area:menu] md:hidden">
            <MenuIcon className="size-7" />
          </MenuButton>
          <Logo className="[grid-area:logo]" />
          <DeliveryLocation className="hidden [grid-area:deliver] xl:flex" />
          <SearchBar terms={getSuggestionTerms()} className="[grid-area:search]" />
          <LocaleEntry className="hidden [grid-area:lang] xl:flex" />
          <AccountEntry className="[grid-area:account]" />
          <OrdersEntry className="[grid-area:orders]" />
          <CartEntry count={0} className="[grid-area:cart]" />
        </div>
      </div>
      <SecondaryNav />
      <MobileChipNav />
      <div data-surface="dark" className="xl:hidden">
        <DeliveryLocation variant="row" />
      </div>
      <NavDrawer />
    </header>
  );
}
