import type { DepartmentSlug } from "@/lib/departments";
import type { Cents } from "@/lib/pricing";

/** A product image. `src: null` means "use the generated illustration" (Tier B products; docs/decisions/0004). */
export interface ImageRef {
  src: string | null;
  alt: string;
}

export type BadgeKind = "top-pick" | "best-seller" | "limited-deal";

export const BADGE_LABELS: Record<BadgeKind, string> = {
  "top-pick": "Top Pick",
  "best-seller": "Best Seller",
  "limited-deal": "Limited time deal",
};

export interface Variant {
  /** Unique within its product; used in the `?variant=` URL parameter. */
  id: string;
  /** Shown on the swatch and in the "Color: <label>" heading. */
  label: string;
  /** #rrggbb tint for the swatch and the generated illustration. */
  swatch: string;
  priceCents: Cents;
  /** Compare-at price. Savings and the percent are derived from it, never stored. */
  listPriceCents?: Cents;
  /** Gallery for this variant; the first image is its primary image. */
  images: ImageRef[];
  stock: number;
  /** True when this variant cannot ship to the shopper's location (drives the "cannot be shipped" state). */
  shippingRestricted?: boolean;
}

export interface Seller {
  soldBy: string;
  shipsFrom: string;
  returns: string;
}

export type SpecRow = readonly [label: string, value: string];

export interface Product {
  /** URL id: /dp/<id>. */
  id: string;
  title: string;
  brand: string;
  /** "Visit the Halo Audio Store" / "by Elena Marsh". */
  byline: string;
  department: DepartmentSlug;
  /** Sub-category shown as the last breadcrumb step. */
  category: string;
  description: string;
  bullets: string[];
  specs: SpecRow[];
  /** The variant dimension: "Color", "Size", "Format", ... */
  variantLabel: string;
  variants: Variant[];
  /** 0 to 5, one decimal. */
  rating: number;
  ratingCount: number;
  /** Purchases in the past month; rendered as "2K+ bought in past month". */
  boughtPastMonth?: number;
  badge?: BadgeKind;
  shipping: { costCents: Cents; businessDays: number };
  seller: Seller;
  relatedIds: string[];
  /** Extra search terms (S3); title, brand and category are indexed as well. */
  tags: string[];
  /** Lower ranks are featured first. */
  featuredRank?: number;
}

/** A flat, lower-cased record per product for the S3 search implementation. */
export interface SearchRecord {
  id: string;
  department: DepartmentSlug;
  title: string;
  brand: string;
  category: string;
  tags: string[];
  /** Normalized haystack: title, brand, category and tags. */
  text: string;
}
