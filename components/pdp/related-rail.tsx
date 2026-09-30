import { ProductRail } from "@/components/home/product-rail";
import type { Product } from "@/lib/catalog/types";

/** The single related-products rail (FR-PDP-10): horizontally scrolling cards that link to product pages. */
export function RelatedRail({ products }: { products: Product[] }) {
  return <ProductRail id="related" title="Products related to this item" products={products} className="mt-10 border-t border-line pt-6" />;
}
