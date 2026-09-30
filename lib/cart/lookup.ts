import type { Product } from "@/lib/catalog/types";
import type { CartLookup, CartProduct } from "./types";

// Data-free: these helpers take products as arguments and import no catalog data, so the module is safe for client code.

export function toCartProduct(product: Product): CartProduct {
  return {
    id: product.id,
    title: product.title,
    variantLabel: product.variantLabel,
    department: product.department,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      swatch: variant.swatch,
      priceCents: variant.priceCents,
      listPriceCents: variant.listPriceCents,
      stock: variant.stock,
      shippingRestricted: variant.shippingRestricted,
      image: variant.images[0] ?? { src: null, alt: product.title },
    })),
  };
}

export function buildCartLookup(products: readonly Product[]): CartLookup {
  return Object.fromEntries(products.map((product) => [product.id, toCartProduct(product)]));
}
