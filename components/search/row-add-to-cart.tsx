"use client";

import { useState } from "react";
import { useCartActions } from "@/components/cart/use-cart-view";
import { PURCHASE_FAILURE_MESSAGES } from "@/lib/purchase";

/**
 * "Add to cart" on a result row: adds one of the row's default purchasable variant through the shared cart store,
 * which updates the badge and opens the mini-cart as the confirmation. Only a rejection is reported here.
 */
export function RowAddToCart({ productId, variantId, title }: { productId: string; variantId: string; title: string }) {
  const { add } = useCartActions();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        aria-label={`Add to cart: ${title}`}
        onClick={() => {
          const outcome = add({ productId, variantId, quantity: 1 });
          setError(outcome.ok ? null : PURCHASE_FAILURE_MESSAGES[outcome.reason]);
        }}
        className="min-h-[var(--tap)] w-full rounded-full bg-cta px-6 py-2 text-sm text-ink hover:bg-cta-hover sm:w-auto"
      >
        Add to cart
      </button>
      <div role="status">{error && <p className="mt-2 text-xs text-deal">{error}</p>}</div>
    </div>
  );
}
