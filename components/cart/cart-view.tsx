"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CartMessages } from "@/components/cart/removed-notice";
import { CheckoutLink } from "@/components/cart/checkout-link";
import { LineStepper } from "@/components/cart/line-stepper";
import { LineTotal, UnitPrice } from "@/components/cart/line-price";
import { useCartActions, useCartView } from "@/components/cart/use-cart-view";
import { ProductImage } from "@/components/pdp/product-image";
import { cartStore } from "@/lib/cart/store";
import { formatMoney } from "@/lib/pricing";

const AVAILABILITY_TONE = { positive: "text-stock", warning: "text-price-sale", negative: "text-price-sale" } as const;

/** The /cart page body: item cards and the subtotal card, rendered from the same store as the mini-cart. */
export function CartView() {
  const { hydrated, views, count, subtotalCents } = useCartView();
  const { setQuantity, remove } = useCartActions();

  // The removal message belongs to this visit; leaving the page dismisses it.
  useEffect(() => () => cartStore.getState().clearRemoved(), []);

  if (!hydrated) {
    // Before the stored cart is read (server render and first paint) there is nothing honest to show but the frame.
    return <div aria-busy="true" className="min-h-[40vh]" />;
  }

  if (views.length === 0) {
    return (
      <div data-shell="cart-empty" className="rounded-lg bg-white p-6 md:p-8">
        <CartMessages />
        <h2 className="text-2xl font-bold">Your cart is empty</h2>
        <p className="mt-2 text-sm text-muted">Items you add to your cart appear here.</p>
        <Link href="/" className="mt-4 inline-flex min-h-[var(--tap)] items-center rounded-full bg-cta px-6 text-sm text-ink hover:bg-cta-hover">
          Continue shopping
        </Link>
      </div>
    );
  }

  const subtotal = (
    <section
      aria-label="Order subtotal"
      data-shell="cart-subtotal-card"
      className="order-first h-fit rounded-lg bg-white p-4 md:p-5 lg:order-none"
    >
      <p className="text-lg">
        Subtotal ({count} {count === 1 ? "item" : "items"}): <strong data-shell="cart-subtotal">{formatMoney(subtotalCents)}</strong>
      </p>
      <CheckoutLink count={count} className="mt-3" />
    </section>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <section aria-label="Cart items" className="rounded-lg bg-white p-4 md:p-6 lg:row-span-2">
        <CartMessages />
        <ul>
          {views.map((view) => {
            const href = `/dp/${view.productId}?variant=${encodeURIComponent(view.variantId)}`;
            return (
              <li key={view.key} data-shell="cart-line" data-product-id={view.productId} data-variant-id={view.variantId} className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:gap-x-5">
                <Link href={href} aria-hidden="true" tabIndex={-1} className="relative block aspect-square overflow-hidden rounded-lg bg-page-gray">
                  <ProductImage image={view.image} department={view.department} tone={view.swatch} sizes="(min-width: 640px) 180px, 96px" decorative />
                </Link>
                <div className="min-w-0">
                  <h2 className="text-base leading-snug sm:text-lg">
                    <Link href={href} className="text-ink hover:text-price-sale hover:underline">
                      {view.title}
                    </Link>
                  </h2>
                  <p className={`mt-1 text-xs ${AVAILABILITY_TONE[view.availabilityTone]}`}>{view.availabilityLabel}</p>
                  {view.showVariant && (
                    <p className="mt-1 text-sm">
                      <span className="text-muted">{view.variantDimension}:</span> <strong className="font-bold">{view.variantLabel}</strong>
                    </p>
                  )}
                  <p className="mt-1">
                    <UnitPrice view={view} />
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <LineStepper view={view} onQuantity={(quantity) => setQuantity(view, quantity)} onRemove={() => remove(view)} />
                    <button
                      type="button"
                      aria-label={`Delete ${view.title}`}
                      onClick={() => remove(view)}
                      className="inline-flex min-h-[var(--tap)] items-center text-sm text-link hover:text-price-sale hover:underline sm:min-h-9"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="col-span-2 flex justify-end sm:col-span-1 sm:col-start-3 sm:row-start-1">
                  <LineTotal view={view} size="lg" />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 border-t border-line pt-4 text-right text-lg">
          Subtotal ({count} {count === 1 ? "item" : "items"}): <strong>{formatMoney(subtotalCents)}</strong>
        </p>
      </section>
      {subtotal}
    </div>
  );
}
