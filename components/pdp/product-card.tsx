import Link from "next/link";
import { Price } from "@/components/pdp/price";
import { ProductImage } from "@/components/pdp/product-image";
import { StarRating } from "@/components/pdp/star-rating";
import type { Product } from "@/lib/catalog/types";
import { getDefaultVariant, getVariantAvailability } from "@/lib/catalog/variants";
import { discountPercent, formatMoney, hasDiscount } from "@/lib/pricing";

/** Compact card for the related and discovery rails. The whole card is one link to the product page. */
export function ProductCard({ product }: { product: Product }) {
  const variant = getDefaultVariant(product);
  const availability = getVariantAvailability(variant);
  const image = variant.images[0];
  const percent = discountPercent(variant.priceCents, variant.listPriceCents);

  return (
    // `relative` matters: the card contains sr-only (absolutely positioned) text, which would otherwise escape the
    // rail's horizontal scroll container and widen the whole page.
    <li className="relative w-[168px] shrink-0 snap-start">
      <Link href={`/dp/${product.id}`} className="group block rounded-lg">
        <span className="relative block aspect-square overflow-hidden rounded-lg bg-page-gray">
          {image && <ProductImage image={image} department={product.department} tone={variant.swatch} sizes="168px" decorative />}
        </span>
        <span className="mt-2 line-clamp-2 block text-sm leading-snug text-link group-hover:text-price-sale group-hover:underline">{product.title}</span>
        <span className="mt-1 block">
          <StarRating rating={product.rating} count={product.ratingCount} size="sm" />
        </span>
        {availability.purchasable ? (
          <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <Price cents={variant.priceCents} size="md" />
            {percent > 0 && hasDiscount(variant.priceCents, variant.listPriceCents) && (
              <span className="text-xs text-muted">
                <span className="sr-only">List price </span>
                <s>{formatMoney(variant.listPriceCents)}</s>
              </span>
            )}
          </span>
        ) : (
          <span className="mt-1 block text-sm font-bold text-price-sale">Currently unavailable</span>
        )}
      </Link>
    </li>
  );
}
