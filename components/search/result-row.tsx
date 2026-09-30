import Link from "next/link";
import { Price } from "@/components/pdp/price";
import { ProductImage } from "@/components/pdp/product-image";
import { StarRating } from "@/components/pdp/star-rating";
import { RowAddToCart } from "@/components/search/row-add-to-cart";
import { BADGE_LABELS, type BadgeKind, type Product } from "@/lib/catalog/types";
import { getDefaultVariant, getVariantAvailability } from "@/lib/catalog/variants";
import type { DeliveryEstimate } from "@/lib/delivery";
import { boughtBucket } from "@/lib/format";
import { discountPercent, formatMoney, hasDiscount } from "@/lib/pricing";

const BADGE_STYLES: Record<BadgeKind, string> = {
  "top-pick": "bg-nav text-white",
  "best-seller": "bg-badge-best text-white",
  "limited-deal": "bg-deal text-white",
};

const AVAILABILITY_TONE = { positive: "text-stock", warning: "text-price-sale", negative: "text-price-sale" } as const;

/**
 * One result in the observed dense list layout: image left; title, rating, badge and social proof, price, delivery,
 * availability and one action on the right. The title is the accessible link to the product; the image link repeats
 * it for pointer users and is hidden from assistive technology so the product is announced once.
 */
export function ResultRow({ product, delivery }: { product: Product; delivery: DeliveryEstimate }) {
  const variant = getDefaultVariant(product);
  const availability = getVariantAvailability(variant);
  const image = variant.images[0];
  const percent = discountPercent(variant.priceCents, variant.listPriceCents);
  const bucket = boughtBucket(product.boughtPastMonth);
  const href = `/dp/${product.id}`;
  const hasOptions = product.variants.length > 1;

  return (
    <li
      data-shell="result-row"
      data-product-id={product.id}
      className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-line py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-x-5"
    >
      <Link href={href} aria-hidden="true" tabIndex={-1} className="relative block aspect-square overflow-hidden rounded-lg bg-page-gray">
        {image && <ProductImage image={image} department={product.department} tone={variant.swatch} sizes="(min-width: 640px) 200px, 112px" />}
      </Link>
      <div className="min-w-0">
        <h2 className="text-[15px] leading-snug sm:text-lg">
          <Link href={href} className="text-ink hover:text-price-sale hover:underline">
            {product.title}
          </Link>
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StarRating rating={product.rating} count={product.ratingCount} size="sm" />
          {product.badge && <span className={`rounded-sm px-1.5 py-0.5 text-xs font-bold ${BADGE_STYLES[product.badge]}`}>{BADGE_LABELS[product.badge]}</span>}
        </div>
        {bucket && (
          <p className="mt-1 text-sm text-muted">
            <strong className="text-ink">{bucket}</strong> bought in past month
          </p>
        )}
        {availability.purchasable ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <Price cents={variant.priceCents} size="lg" />
            {percent > 0 && hasDiscount(variant.priceCents, variant.listPriceCents) && (
              <span className="text-sm text-muted">
                List: <s>{formatMoney(variant.listPriceCents)}</s> <span className="text-deal">(−{percent}%)</span>
                <span className="sr-only"> {percent} percent off</span>
              </span>
            )}
          </div>
        ) : null}
        {availability.purchasable && (
          <p className="mt-1 text-sm">
            {delivery.prefix} <strong>{delivery.date}</strong>
          </p>
        )}
        {(availability.kind !== "in_stock" || !availability.purchasable) && (
          <p className={`mt-1 text-sm ${AVAILABILITY_TONE[availability.tone]} ${availability.purchasable ? "" : "font-bold"}`}>{availability.label}</p>
        )}
        {hasOptions && availability.purchasable && <p className="mt-1 text-sm text-muted">{product.variants.length} {product.variantLabel.toLowerCase()} options</p>}
      </div>
      <div className="col-span-2 sm:col-span-1 sm:col-start-2">
        {availability.purchasable &&
          (hasOptions ? (
            <Link
              href={href}
              aria-label={`See options: ${product.title}`}
              className="flex min-h-[var(--tap)] w-full items-center justify-center rounded-full border border-line bg-white px-6 py-2 text-sm text-ink hover:bg-page-gray sm:inline-flex sm:w-auto"
            >
              See options
            </Link>
          ) : (
            <RowAddToCart productId={product.id} variantId={variant.id} title={product.title} />
          ))}
      </div>
    </li>
  );
}
