"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCartLookup } from "@/components/cart/cart-provider";
import { useCheckoutModel } from "@/components/checkout/use-checkout-model";
import { arrivalLabel } from "@/lib/checkout/delivery";
import { maskedCard } from "@/lib/checkout/payment";
import { placeOrder } from "@/lib/checkout/place-order";
import { stepHref } from "@/lib/checkout/state";
import { checkoutStore } from "@/lib/checkout/store";
import { cartStore } from "@/lib/cart/store";
import { ORDER_FAILURE_MESSAGES } from "@/lib/orders/create";
import { ordersStore } from "@/lib/orders/store";
import { formatMoney } from "@/lib/pricing";
import { useRouter } from "next/navigation";

const CHANGE = "inline-flex min-h-[var(--tap)] items-center text-sm text-link hover:text-price-sale hover:underline sm:min-h-0";

/**
 * Step 4: read-only review, every value derived from the live cart and checkout state, then Place order. The
 * click handler is guarded synchronously (a ref, not just state) so a double click cannot run it twice, and the
 * order itself is idempotent per submission id (lib/checkout/place-order.ts).
 */
export function ReviewStep({ now, fixedNow, onPlaced }: { now: Date; fixedNow: string | null; onPlaced: () => void }) {
  const router = useRouter();
  const lookup = useCartLookup();
  const { cart, state, option, totals } = useCheckoutModel();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, payment } = state;

  const place = () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    const result = placeOrder({ cart: cartStore, orders: ordersStore, checkout: checkoutStore }, lookup, fixedNow ? new Date(fixedNow) : new Date());
    if (!result.ok) {
      submitting.current = false;
      setBusy(false);
      setError(ORDER_FAILURE_MESSAGES[result.reason]);
      return;
    }
    onPlaced();
    router.push(`/orders/${result.orderId}/confirmation`);
  };

  return (
    <div data-shell="review">
      <div className="space-y-5">
        <section aria-labelledby="review-ship" className="flex justify-between gap-4 border-b border-line pb-4">
          <div>
            <h3 id="review-ship" className="font-bold">
              Shipping address
            </h3>
            <address className="mt-1 text-sm not-italic">
              {address.fullName}
              <br />
              {address.street}
              <br />
              {address.city}, {address.state} {address.zip}
            </address>
          </div>
          <Link href={stepHref("address")} aria-label="Change shipping address" className={CHANGE}>
            Change
          </Link>
        </section>

        <section aria-labelledby="review-delivery" className="flex justify-between gap-4 border-b border-line pb-4">
          <div>
            <h3 id="review-delivery" className="font-bold">
              Delivery
            </h3>
            {option && (
              <p className="mt-1 text-sm">
                {option.label}: arrives {arrivalLabel(option, now)} ({option.priceCents === 0 ? "FREE" : formatMoney(option.priceCents)})
              </p>
            )}
          </div>
          <Link href={stepHref("delivery")} aria-label="Change delivery option" className={CHANGE}>
            Change
          </Link>
        </section>

        <section aria-labelledby="review-payment" className="flex justify-between gap-4 border-b border-line pb-4">
          <div>
            <h3 id="review-payment" className="font-bold">
              Payment <span className="ml-1 rounded-sm bg-nav px-1.5 py-0.5 text-xs font-normal text-white">TEST MODE</span>
            </h3>
            {payment && (
              <p data-shell="review-payment" className="mt-1 text-sm">
                {maskedCard(payment)}
              </p>
            )}
          </div>
          <Link href={stepHref("payment")} aria-label="Change payment method" className={CHANGE}>
            Change
          </Link>
        </section>

        <section aria-labelledby="review-items">
          <div className="flex justify-between gap-4">
            <h3 id="review-items" className="font-bold">
              Items
            </h3>
            <Link href="/cart" className={CHANGE}>
              Edit cart
            </Link>
          </div>
          <ul className="mt-1 divide-y divide-line">
            {cart.views.map((view) => (
              <li key={view.key} data-shell="review-item" className="flex justify-between gap-4 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block">{view.title}</span>
                  <span className="block text-xs text-muted">
                    {view.showVariant ? `${view.variantDimension}: ${view.variantLabel} · ` : ""}Qty {view.quantity} × {formatMoney(view.unitPriceCents)}
                  </span>
                </span>
                <span className="shrink-0">{formatMoney(view.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="mt-4 text-right text-lg font-bold text-price-sale">
        Order total: <span data-shell="review-total">{formatMoney(totals.totalCents)}</span>
      </p>

      <div role="alert" className="empty:hidden">
        {error && <p className="mt-3 rounded-md border border-deal bg-[#fff5f5] p-3 text-sm text-deal">{error}</p>}
      </div>

      <button
        type="button"
        onClick={place}
        disabled={busy}
        aria-busy={busy}
        data-shell="place-order"
        className="mt-4 min-h-[var(--tap)] w-full rounded-full bg-cta px-8 py-2.5 text-sm font-bold text-ink hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {busy ? "Placing your order…" : "Place your order"}
      </button>
      <p className="mt-2 text-xs text-muted">By placing this order you create a simulated order in this browser only. No card is charged.</p>
    </div>
  );
}
