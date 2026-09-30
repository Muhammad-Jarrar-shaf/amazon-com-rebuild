import type { Product } from "@/lib/catalog/types";

/** "About this item" bullets (FR-PDP-9). */
export function AboutItem({ product, className = "" }: { product: Product; className?: string }) {
  return (
    <section aria-labelledby="about-heading" className={className}>
      <h2 id="about-heading" className="mb-2 text-lg font-bold">
        About this item
      </h2>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-muted">
        {product.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </section>
  );
}

/** Description and specifications table (FR-PDP-9). */
export function ProductDetails({ product }: { product: Product }) {
  return (
    <section aria-labelledby="details-heading" className="mt-10 border-t border-line pt-6">
      <h2 id="details-heading" className="mb-3 text-lg font-bold">
        Product details
      </h2>
      <p className="mb-5 max-w-3xl text-sm leading-relaxed">{product.description}</p>
      <table className="w-full max-w-3xl border-collapse text-sm">
        <caption className="sr-only">Specifications for {product.title}</caption>
        <tbody>
          {product.specs.map(([label, value]) => (
            <tr key={label} className="border-b border-line">
              <th scope="row" className="w-2/5 bg-[#f3f3f3] px-3 py-2 text-left font-bold sm:w-1/3">
                {label}
              </th>
              <td className="px-3 py-2">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
