"use client";

import { usePathname } from "next/navigation";
import { CartEntry } from "@/components/layout/header-entries";
import { cartCount } from "@/lib/cart/model";
import { cartStore, useCart } from "@/lib/cart/store";

/**
 * The header cart entry: the badge is the store's total quantity. A plain click opens the mini-cart (FR-CART-5); a
 * modified click (new tab) or a click while already on /cart follows the link to the cart page.
 */
export function HeaderCart({ className = "" }: { className?: string }) {
  const count = useCart((state) => (state.hydrated ? cartCount(state.lines) : 0));
  const pathname = usePathname();
  return (
    <CartEntry
      count={count}
      className={className}
      onClick={(event) => {
        if (pathname === "/cart" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        cartStore.getState().openMiniCart();
      }}
    />
  );
}
