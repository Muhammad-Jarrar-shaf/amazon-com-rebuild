"use client";

import { Price } from "@/components/pdp/price";
import { useProduct } from "@/components/pdp/product-provider";
import { discountPercent, formatMoney, hasDiscount, savingsCents } from "@/lib/pricing";

/** Selling price of the selected variant with derived savings. Percent and savings are never stored (FR-PDP-3). */
export function PriceBlock({ className = "" }: { className?: string }) {
  const { variant } = useProduct();
  const { priceCents, listPriceCents } = variant;
  const percent = discountPercent(priceCents, listPriceCents);

  return (
    <section aria-label="Price" className={className}>
      <div className="flex items-start gap-2">
        {percent > 0 && (
          <>
            <span aria-hidden="true" className="text-[28px] leading-none font-light text-deal">
              −{percent}%
            </span>
            <span className="sr-only">{percent} percent off</span>
          </>
        )}
        <Price cents={priceCents} size="lg" />
      </div>
      {hasDiscount(priceCents, listPriceCents) && (
        <p className="mt-1 text-sm text-muted">
          List Price: <s>{formatMoney(listPriceCents)}</s>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <span className="text-deal">You save {formatMoney(savingsCents(priceCents, listPriceCents))}</span>
        </p>
      )}
    </section>
  );
}
