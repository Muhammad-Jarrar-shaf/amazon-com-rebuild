import { ProductCard } from "@/components/pdp/product-card";
import type { Product } from "@/lib/catalog/types";

interface ProductRailProps {
  /** Section id; the heading gets `<id>-heading`. */
  id: string;
  title: string;
  products: Product[];
  className?: string;
}

/** A titled, horizontally scrolling row of product cards, each one link to its product page (FR-HOME-3, FR-PDP-10). */
export function ProductRail({ id, title, products, className = "" }: ProductRailProps) {
  if (products.length === 0) return null;
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className={className}>
      <h2 id={headingId} className="mb-4 text-lg font-bold">
        {title}
      </h2>
      <ul className="flex snap-x gap-4 overflow-x-auto pb-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ul>
    </section>
  );
}
