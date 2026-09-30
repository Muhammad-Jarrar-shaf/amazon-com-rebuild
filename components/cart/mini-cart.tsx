"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CartMessages } from "@/components/cart/removed-notice";
import { CheckoutLink } from "@/components/cart/checkout-link";
import { LineStepper } from "@/components/cart/line-stepper";
import { LineTotal, UnitPrice } from "@/components/cart/line-price";
import { useCartActions, useCartView } from "@/components/cart/use-cart-view";
import { CheckCircleIcon, CloseIcon } from "@/components/icons";
import { ProductImage } from "@/components/pdp/product-image";
import { findProduct } from "@/lib/cart/model";
import { useCartLookup } from "@/components/cart/cart-provider";
import { useCart } from "@/lib/cart/store";
import { formatMoney } from "@/lib/pricing";

export const MINI_CART_ID = "mini-cart";

/**
 * Mini-cart drawer (FR-CART-5). A native modal <dialog> like the menu drawer: Esc, the focus trap and returning focus
 * to whatever opened it come from the platform. It renders the same store as the cart page, through the same hooks;
 * its open state lives in the store so "Add to cart" from any surface can open it.
 */
export function MiniCart() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = useCart((state) => state.miniCartOpen);
  const lastAdded = useCart((state) => state.lastAdded);
  const close = useCart((state) => state.closeMiniCart);
  const lookup = useCartLookup();
  const { views, count, subtotalCents } = useCartView();
  const { setQuantity, remove } = useCartActions();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const addedTitle = lastAdded ? findProduct(lookup, lastAdded.productId)?.title : undefined;

  return (
    <dialog
      id={MINI_CART_ID}
      ref={dialogRef}
      aria-labelledby="mini-cart-title"
      className="mini-cart"
      // Escape and the platform's close both fire "close"; keep the store in step with the dialog.
      onClose={() => close()}
      // The panel fills the dialog box, so only a click on the ::backdrop targets the dialog itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex min-h-[60px] shrink-0 items-center justify-between border-b border-line pr-2 pl-4">
          <h2 id="mini-cart-title" className="text-lg font-bold">
            Shopping Cart
          </h2>
          <button type="button" aria-label="Close cart" onClick={close} className="flex size-[var(--tap)] items-center justify-center rounded-md hover:bg-page-gray">
            <CloseIcon className="size-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {lastAdded && addedTitle && (
            <div role="status" data-shell="added-confirmation" className="mb-3 rounded-md bg-[#f0f8f0] p-3 text-sm">
              <p className="flex items-center gap-2 font-bold text-stock">
                <CheckCircleIcon className="size-5 shrink-0" />
                Added to cart
              </p>
              <p className="mt-1 text-ink">{addedTitle}</p>
              {lastAdded.capped && <p className="mt-1 text-price-sale">You already have the most that can be ordered, so the quantity was limited.</p>}
            </div>
          )}
          <CartMessages />
          {views.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-base font-bold">Your cart is empty</p>
              <button type="button" onClick={close} className="mt-3 min-h-[var(--tap)] px-4 text-link hover:underline">
                Continue shopping
              </button>
            </div>
          ) : (
            <ul>
              {views.map((view) => (
                <li key={view.key} data-shell="mini-cart-line" className="flex gap-3 border-b border-line py-3 last:border-b-0">
                  <Link
                    href={`/dp/${view.productId}?variant=${encodeURIComponent(view.variantId)}`}
                    onClick={close}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="relative block size-16 shrink-0 overflow-hidden rounded-md bg-page-gray"
                  >
                    <ProductImage image={view.image} department={view.department} tone={view.swatch} sizes="64px" decorative />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-sm leading-snug">
                      <Link href={`/dp/${view.productId}?variant=${encodeURIComponent(view.variantId)}`} onClick={close} className="text-ink hover:text-price-sale hover:underline">
                        {view.title}
                      </Link>
                    </h3>
                    {view.showVariant && (
                      <p className="mt-0.5 text-xs text-muted">
                        {view.variantDimension}: {view.variantLabel}
                      </p>
                    )}
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <LineStepper view={view} onQuantity={(quantity) => setQuantity(view, quantity)} onRemove={() => remove(view)} />
                      <LineTotal view={view} size="md" />
                    </div>
                    {view.quantity > 1 && (
                      <p className="mt-1 text-right text-xs text-muted">
                        <UnitPrice view={view} /> each
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {views.length > 0 && (
          <div className="shrink-0 border-t border-line bg-white px-4 py-3">
            <p className="flex items-baseline justify-between text-base">
              <span>
                Subtotal ({count} {count === 1 ? "item" : "items"}):
              </span>
              <strong data-shell="mini-cart-subtotal">{formatMoney(subtotalCents)}</strong>
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <CheckoutLink count={count} />
              <Link
                href="/cart"
                onClick={close}
                className="flex min-h-[var(--tap)] w-full items-center justify-center rounded-full border border-line bg-white px-4 py-2.5 text-sm text-ink hover:bg-page-gray"
              >
                Go to Cart
              </Link>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
