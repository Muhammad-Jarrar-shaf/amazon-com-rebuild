"use client";

import { useId } from "react";
import { ProductImage } from "@/components/pdp/product-image";
import { useProduct } from "@/components/pdp/product-provider";
import { getVariantAvailability } from "@/lib/catalog/variants";
import { formatMoney } from "@/lib/pricing";

/**
 * Variant options as a native radio group: arrow-key navigation, selection and the disabled state all come from
 * the platform. An unavailable variant is disabled (it can never become the selection), dimmed, dashed and labeled
 * "Unavailable"; the one exception is a product whose every option is unavailable, where the current one stays selected.
 */
export function VariantPicker({ className = "" }: { className?: string }) {
  const { product, variant, selectVariant } = useProduct();
  const groupName = useId();
  if (product.variants.length < 2) return null;

  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm">
        {product.variantLabel}: <span className="font-bold">{variant.label}</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {product.variants.map((option) => {
          const availability = getVariantAvailability(option);
          const selected = option.id === variant.id;
          const disabled = !availability.purchasable && !selected;
          const image = option.images[0];
          return (
            <label key={option.id} className={`relative block ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
              <input
                type="radio"
                name={groupName}
                value={option.id}
                checked={selected}
                disabled={disabled}
                onChange={() => selectVariant(option.id)}
                className="peer sr-only"
              />
              <span className="flex w-[104px] flex-col gap-1 rounded-lg border border-line bg-white p-1.5 text-center peer-checked:border-thumb peer-checked:ring-2 peer-checked:ring-thumb peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-link peer-disabled:border-dashed peer-disabled:opacity-60">
                <span className="relative block aspect-square w-full overflow-hidden rounded bg-page-gray">
                  {image && <ProductImage image={image} department={product.department} tone={option.swatch} sizes="96px" decorative />}
                </span>
                <span className="text-xs leading-tight text-ink">{option.label}</span>
                <span className="text-xs">
                  {availability.purchasable ? <span className="text-muted">{formatMoney(option.priceCents)}</span> : <span className="font-bold text-price-sale">Unavailable</span>}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
