"use client";

import { useCheckoutModel } from "@/components/checkout/use-checkout-model";
import { formatMoney } from "@/lib/pricing";

/** Persistent order summary (desktop: right column; mobile: below the form). All numbers are derived, never typed in. */
export function OrderSummary({ className = "" }: { className?: string }) {
  const { cart, option, totals } = useCheckoutModel();
  return (
    <aside aria-label="Order summary" data-shell="order-summary" className={`h-fit rounded-lg bg-white p-4 md:p-5 ${className}`}>
      <h2 className="text-lg font-bold">Order summary</h2>
      <ul className="mt-3 divide-y divide-line text-sm">
        {cart.views.map((view) => (
          <li key={view.key} className="flex justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="line-clamp-2">{view.title}</span>
              <span className="block text-xs text-muted">
                {view.showVariant ? `${view.variantDimension}: ${view.variantLabel} · ` : ""}Qty {view.quantity}
              </span>
            </span>
            <span className="shrink-0">{formatMoney(view.lineTotalCents)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
        <dt>Items ({cart.count}):</dt>
        <dd data-shell="summary-subtotal">{formatMoney(totals.subtotalCents)}</dd>
        <dt>Delivery:</dt>
        <dd data-shell="summary-shipping">{option ? (totals.shippingCents === 0 ? "FREE" : formatMoney(totals.shippingCents)) : "Not chosen yet"}</dd>
        <dt>Estimated tax (8%):</dt>
        <dd data-shell="summary-tax">{formatMoney(totals.taxCents)}</dd>
        <dt className="pt-2 text-lg font-bold text-price-sale">{option ? "Order total:" : "Total so far:"}</dt>
        <dd data-shell="summary-total" className="pt-2 text-lg font-bold text-price-sale">
          {formatMoney(totals.totalCents)}
        </dd>
      </dl>
      <p className="mt-3 text-xs text-muted">Simulated checkout for this project: no real order is placed and nothing is charged.</p>
    </aside>
  );
}
