"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart-boundary";

/**
 * "Add to cart" on a result row. Goes through the same cart boundary as the product page (lib/cart-boundary.ts), so
 * until the cart exists (S4) it says plainly that nothing was added. S4 replaces the boundary body; this stays.
 */
export function RowAddToCart({ productId, variantId, title }: { productId: string; variantId: string; title: string }) {
  const [notice, setNotice] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-label={`Add to cart: ${title}`}
        onClick={() => setNotice(!addToCart({ productId, variantId, quantity: 1 }).added)}
        className="min-h-[var(--tap)] w-full rounded-full bg-cta px-6 py-2 text-sm text-ink hover:bg-cta-hover sm:w-auto"
      >
        Add to cart
      </button>
      <div role="status">{notice && <p className="mt-2 text-xs text-muted">Nothing was added: the cart arrives in the next build step.</p>}</div>
    </div>
  );
}
