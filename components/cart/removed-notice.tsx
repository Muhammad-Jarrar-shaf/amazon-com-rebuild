"use client";

import { useCartActions } from "@/components/cart/use-cart-view";
import { useCartLookup } from "@/components/cart/cart-provider";
import { findProduct } from "@/lib/cart/model";
import { useCart } from "@/lib/cart/store";

/**
 * The removal message and its Undo (FR-CART-4), plus the recovery notice for stale stored entries. Always rendered as
 * a live region so the message is announced when it appears. Shared by the mini-cart and the cart page.
 */
export function CartMessages() {
  const lookup = useCartLookup();
  const { undo } = useCartActions();
  const lastRemoved = useCart((state) => state.lastRemoved);
  const notice = useCart((state) => state.notice);
  const dismiss = useCart((state) => state.dismissNotice);
  const title = lastRemoved ? findProduct(lookup, lastRemoved.line.productId)?.title : undefined;

  return (
    <div role="status" aria-live="polite" className="empty:hidden">
      {notice && (
        <p data-shell="cart-notice" className="mb-3 flex items-start justify-between gap-3 rounded-md border border-line bg-[#fff8e5] p-3 text-sm text-ink">
          <span>{notice}</span>
          <button type="button" onClick={dismiss} className="min-h-[var(--tap)] shrink-0 text-link hover:underline sm:min-h-0">
            Dismiss
          </button>
        </p>
      )}
      {lastRemoved && title && (
        <p data-shell="cart-removed" className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink">
          <span>
            <strong>{title}</strong> was removed from Shopping Cart.
          </span>
          <button type="button" onClick={undo} className="inline-flex min-h-[var(--tap)] items-center text-link hover:text-price-sale hover:underline sm:min-h-0">
            Undo
          </button>
        </p>
      )}
    </div>
  );
}
