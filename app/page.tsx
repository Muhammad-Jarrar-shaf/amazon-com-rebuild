import { CategoryCard } from "@/components/home/category-card";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { ProductRail } from "@/components/home/product-rail";
import { HOME_RAIL } from "@/lib/home/content";
import { getCategoryCards, getHeroSlides, getHomeRailProducts } from "@/lib/home/server";
import { SITE } from "@/lib/site";

// Full home (S6, FR-HOME-1..3): hero carousel, then rows of four category cards that overlap the hero from 1024px,
// then one product rail. A Server Component: only the carousel is interactive.
export default function HomePage() {
  return (
    // The negative margins cancel <main>'s padding so the hero runs edge to edge on the gray page.
    <div data-page="home" className="-mx-4 -my-8 pb-8">
      <h1 className="sr-only">{SITE.name}</h1>
      <HeroCarousel slides={getHeroSlides()} />
      <div className="relative z-10 mt-4 px-4 lg:mt-[calc(var(--hero-body-h)-var(--hero-h))]">
        <ul aria-label="Shop by category" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {getCategoryCards().map((card) => (
            <CategoryCard key={card.id} card={card} />
          ))}
        </ul>
        <ProductRail id={HOME_RAIL.id} title={HOME_RAIL.title} products={getHomeRailProducts()} className="mt-5 bg-white p-5" />
      </div>
    </div>
  );
}
