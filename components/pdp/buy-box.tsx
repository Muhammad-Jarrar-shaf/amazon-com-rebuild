"use client";

import { useState } from "react";
import { Price } from "@/components/pdp/price";
import { useProduct } from "@/components/pdp/product-provider";
import { QuantityStepper } from "@/components/pdp/quantity-stepper";
import { addToCart } from "@/lib/cart-boundary";
import type { DeliveryEstimate } from "@/lib/delivery";
import { formatMoney } from "@/lib/pricing";
import { PURCHASE_FAILURE_MESSAGES, resolvePurchase } from "@/lib/purchase";

interface Notice {
  /** Ties the notice to the selection it was raised for, so it disappears when variant or quantity changes. */
  key: string;
  tone: "info" | "error";
  text: string;
}

const AVAILABILITY_TONE = { positive: "text-stock", warning: "text-price-sale", negative: "text-price-sale" } as const;

/**
 * Purchase panel (FR-PDP-5..8): price (wide screens), delivery estimate, availability, quantity and Add to cart, plus
 * seller information. Add to cart validates with resolvePurchase and calls the cart boundary. The cart itself is S4, so
 * until then the panel says plainly that nothing was added. Buy Now is deferred (FR-PDP-11, stretch).
 */
export function BuyBox({ delivery, className = "" }: { delivery: DeliveryEstimate; className?: string }) {
  const { product, variant, availability, quantity, setQuantity } = useProduct();
  const [notice, setNotice] = useState<Notice | null>(null);
  const selectionKey = `${variant.id}:${quantity}`;
  const visibleNotice = notice?.key === selectionKey ? notice : null;

  const onAddToCart = () => {
    const result = resolvePurchase(product, variant.id, quantity);
    if (!result.ok) {
      setNotice({ key: selectionKey, tone: "error", text: PURCHASE_FAILURE_MESSAGES[result.reason] });
      return;
    }
    const outcome = addToCart(result.request);
    if (outcome.added) {
      setNotice(null);
      return;
    }
    setNotice({
      key: selectionKey,
      tone: "info",
      text: `Your selection is ready: ${quantity} × ${variant.label} (${formatMoney(result.lineTotalCents)}). The cart arrives in the next build step, so nothing has been added yet.`,
    });
  };

  return (
    <section aria-label="Purchase options" className={`rounded-lg border border-line p-4 ${className}`}>
      <div data-shell="buybox-price" className="hidden xl:block">
        <Price cents={variant.priceCents} size="lg" />
      </div>

      {availability.purchasable && (
        <p className="mt-2 text-sm">
          {delivery.prefix} <strong>{delivery.date}</strong>
        </p>
      )}

      <p className={`mt-3 text-lg ${AVAILABILITY_TONE[availability.tone]} ${availability.purchasable ? "" : "font-bold"}`}>{availability.label}</p>

      {availability.purchasable ? (
        <>
          <QuantityStepper value={quantity} max={availability.maxQuantity} onChange={setQuantity} />
          <button
            type="button"
            onClick={onAddToCart}
            className="mt-4 min-h-[var(--tap)] w-full rounded-full bg-cta px-4 py-2.5 text-sm text-ink hover:bg-cta-hover"
          >
            Add to cart
          </button>
        </>
      ) : (
        <a
          href="#related"
          className="mt-4 flex min-h-[var(--tap)] w-full items-center justify-center rounded-full border border-line bg-white px-4 py-2.5 text-sm text-ink hover:bg-page-gray"
        >
          See similar items
        </a>
      )}

      <div role="status" aria-live="polite">
        {visibleNotice && (
          <p className={`mt-3 rounded-md border p-2.5 text-sm ${visibleNotice.tone === "error" ? "border-deal text-deal" : "border-line bg-page-gray text-ink"}`}>
            {visibleNotice.text}
          </p>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted">Ships from</dt>
        <dd>{product.seller.shipsFrom}</dd>
        <dt className="text-muted">Sold by</dt>
        <dd>{product.seller.soldBy}</dd>
        <dt className="text-muted">Returns</dt>
        <dd>{product.seller.returns}</dd>
      </dl>
    </section>
  );
}
