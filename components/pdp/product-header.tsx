import { StarRating } from "@/components/pdp/star-rating";
import { NavLink } from "@/components/ui/nav-link";
import { BADGE_LABELS, type BadgeKind, type Product } from "@/lib/catalog/types";
import { boughtBucket } from "@/lib/format";

const BADGE_STYLES: Record<BadgeKind, string> = {
  "top-pick": "bg-nav text-white",
  "best-seller": "bg-badge-best text-white",
  "limited-deal": "bg-deal text-white",
};

/** Byline, title, rating, badge and social proof (FR-PDP-3). Server-rendered: none of it depends on the variant. */
export function ProductHeader({ product, className = "" }: { product: Product; className?: string }) {
  const bucket = boughtBucket(product.boughtPastMonth);
  return (
    <header className={className}>
      <NavLink href={`/s?k=${encodeURIComponent(product.brand)}`} className="text-sm text-link [a&]:hover:text-price-sale [a&]:hover:underline">
        {product.byline}
      </NavLink>
      <h1 className="mt-1 text-[22px] leading-snug font-medium text-ink md:text-2xl">{product.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <StarRating rating={product.rating} count={product.ratingCount} />
        {product.badge && (
          <span className={`rounded-sm px-2 py-0.5 text-xs font-bold ${BADGE_STYLES[product.badge]}`}>{BADGE_LABELS[product.badge]}</span>
        )}
      </div>
      {bucket && (
        <p className="mt-2 text-sm">
          <strong>{bucket}</strong> bought in past month
        </p>
      )}
    </header>
  );
}
