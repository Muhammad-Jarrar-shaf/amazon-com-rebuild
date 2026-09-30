import { Price } from "@/components/pdp/price";
import { formatMoney, hasDiscount } from "@/lib/pricing";
import type { CartLineView } from "@/lib/cart/types";

/** A line's unit price (with the struck compare-at price when discounted) for the cart surfaces. */
export function UnitPrice({ view }: { view: CartLineView }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="font-bold text-ink">
        <span className="sr-only">Price: </span>
        {formatMoney(view.unitPriceCents)}
      </span>
      {hasDiscount(view.unitPriceCents, view.listPriceCents) && (
        <span className="text-muted">
          <span className="sr-only">List price: </span>
          <s>{formatMoney(view.listPriceCents)}</s>
        </span>
      )}
    </span>
  );
}

/** The line total: the price of this quantity, in the large price style. */
export function LineTotal({ view, size = "md" }: { view: CartLineView; size?: "md" | "lg" }) {
  return (
    <span data-shell="line-total" className="inline-flex flex-col items-end">
      <span className="sr-only">Line total for {view.title}: </span>
      <Price cents={view.lineTotalCents} size={size} />
    </span>
  );
}
