import { ProductCard } from "@/components/pdp/product-card";
import type { Product } from "@/lib/catalog/types";

/** The single related-products rail (FR-PDP-10): horizontally scrolling cards that link to product pages. */
export function RelatedRail({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section id="related" aria-labelledby="related-heading" className="mt-10 border-t border-line pt-6">
      <h2 id="related-heading" className="mb-4 text-lg font-bold">
        Products related to this item
      </h2>
      <ul className="flex snap-x gap-4 overflow-x-auto pb-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ul>
    </section>
  );
}
