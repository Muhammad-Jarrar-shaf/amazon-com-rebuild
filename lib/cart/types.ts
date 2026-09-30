import type { ImageRef, Product, Variant } from "@/lib/catalog/types";
import type { DepartmentSlug } from "@/lib/departments";
import type { Cents } from "@/lib/pricing";

/**
 * A cart line is an id pair and a quantity, nothing else. Names, images and prices are always resolved from the
 * catalog (via CartLookup) when displayed or totalled, so the persisted cart can never disagree with the catalog.
 */
export interface CartLine {
  productId: string;
  variantId: string;
  quantity: number;
}

/** The identity of a line: the product AND the selected variant, so two colors of one product are two lines. */
export type LineIdentity = Pick<CartLine, "productId" | "variantId">;

/** The fields of a variant the cart needs (a projection of the catalog's Variant, plus its primary image). */
export type CartVariant = Pick<Variant, "id" | "label" | "swatch" | "priceCents" | "listPriceCents" | "stock" | "shippingRestricted"> & {
  image: ImageRef;
};

export type CartProduct = Pick<Product, "id" | "title" | "variantLabel"> & {
  department: DepartmentSlug;
  variants: CartVariant[];
};

/** Compact, serializable projection of the catalog for the cart. Built on the server, never the full catalog. */
export type CartLookup = Readonly<Record<string, CartProduct>>;

/** A cart line joined with its catalog data, ready to render. `lineTotalCents` comes from lib/pricing. */
export interface CartLineView {
  key: string;
  productId: string;
  variantId: string;
  quantity: number;
  title: string;
  /** "Color", "Size", ... */
  variantDimension: string;
  variantLabel: string;
  showVariant: boolean;
  image: ImageRef;
  swatch: string;
  department: DepartmentSlug;
  unitPriceCents: Cents;
  listPriceCents?: Cents;
  lineTotalCents: Cents;
  availabilityLabel: string;
  availabilityTone: "positive" | "warning" | "negative";
  maxQuantity: number;
}

/** What hydration dropped or changed, so the shopper is told instead of silently losing items. */
export interface RecoveryReport {
  /** The stored value was not valid JSON or not the expected shape. */
  unreadable: boolean;
  /** Lines removed: unknown product/variant, unavailable variant or an invalid quantity. */
  removed: number;
  /** Lines kept but with the quantity reduced to what is available. */
  adjusted: number;
}
