import Link from "next/link";
import { ProductCard } from "@/components/pdp/product-card";
import { getFeaturedProducts } from "@/lib/catalog";

/** Product-not-found experience (FR-PDP-1): a clear message, a way back to shopping, and real products to discover. */
export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-3xl py-6 text-center">
      <title>Product not found</title>
      <svg viewBox="0 0 160 160" role="img" aria-label="An empty box with a question mark" className="mx-auto size-36 text-line">
        <g fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M20 52 80 24l60 28v62l-60 28-60-28z" />
          <path d="M20 52l60 28 60-28M80 80v62" />
        </g>
        <text x="80" y="128" textAnchor="middle" fontSize="44" fontWeight="700" fill="#ff9900" stroke="none">
          ?
        </text>
      </svg>
      <h1 className="mt-4 text-2xl font-bold">We couldn&apos;t find that product</h1>
      <p className="mx-auto mt-2 max-w-md text-base text-muted">
        The link may be out of date, or the product may no longer be available. Pick up where you left off below.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-[var(--tap)] items-center rounded-full bg-cta px-6 text-sm text-ink hover:bg-cta-hover"
      >
        Continue shopping
      </Link>
      <section aria-labelledby="popular-heading" className="mt-12 border-t border-line pt-6 text-left">
        <h2 id="popular-heading" className="mb-4 text-lg font-bold">
          Popular right now
        </h2>
        <ul className="flex snap-x gap-4 overflow-x-auto pb-3">
          {getFeaturedProducts(6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </ul>
      </section>
    </div>
  );
}
