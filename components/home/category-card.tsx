import { ProductImage } from "@/components/pdp/product-image";
import { NavLink } from "@/components/ui/nav-link";
import type { CategoryCardView } from "@/lib/home/types";

/** FR-HOME-2: a white card with a headline and a 2x2 grid of captioned tiles, each a scoped results page. */
export function CategoryCard({ card }: { card: CategoryCardView }) {
  return (
    <li data-home="card" className="flex flex-col bg-white p-5">
      <h2 className="mb-3 text-xl leading-tight font-bold">
        {card.headline}
      </h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
        {card.tiles.map((tile) => (
          <li key={tile.id} className="relative">
            <NavLink href={tile.href} data-home="tile" className="group block">
              <span className="relative block aspect-square overflow-hidden bg-page-gray">
                <ProductImage image={tile.image} department={tile.department} tone={tile.tone} sizes="(min-width: 1024px) 150px, (min-width: 640px) 45vw, 42vw" decorative />
              </span>
              <span className="mt-1 block text-xs leading-snug group-hover:text-price-sale group-hover:underline sm:text-sm">{tile.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      {card.more && (
        <NavLink href={card.more.href} className="mt-auto inline-flex min-h-[var(--tap)] items-end self-start pt-3 text-sm text-link hover:text-price-sale hover:underline">
          {card.more.label}
        </NavLink>
      )}
    </li>
  );
}
