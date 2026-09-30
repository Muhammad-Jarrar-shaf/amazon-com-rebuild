import type { ImageRef } from "@/lib/catalog/types";
import type { DepartmentSlug } from "@/lib/departments";
import type { SearchState } from "@/lib/search/types";

// Home page content (FR-HOME-1..3). Authored entries name a search scope and a pictured product; the server resolves
// them into view models (lib/home/server.ts) so client components receive plain data and never import the catalog.

/** The results page an entry leads to; always rendered through buildSearchUrl so the URL is canonical. */
export type HomeScope = Pick<Partial<SearchState>, "query" | "dept" | "minRating" | "minPrice" | "maxPrice">;

/** A catalog product whose (default or named) variant's first image pictures the entry. */
export interface HomePicture {
  productId: string;
  variantId?: string;
}

export interface HeroSlide {
  id: string;
  headline: string;
  body: string;
  /** Visible call to action; the whole slide is one link. */
  cta: string;
  scope: HomeScope;
  picture: HomePicture;
  /** Light gradient behind the slide, from -> to (#rrggbb). Dark text sits on it, so both stops stay light. */
  background: readonly [string, string];
}

export interface CategoryTile {
  id: string;
  /** Caption under the image. */
  label: string;
  scope: HomeScope;
  picture: HomePicture;
}

export interface CategoryCard {
  id: string;
  headline: string;
  /** Exactly four tiles, shown as a 2x2 grid. */
  tiles: readonly [CategoryTile, CategoryTile, CategoryTile, CategoryTile];
  /** Optional footer link ("See more"). */
  more?: { label: string; scope: HomeScope };
}

/** What the page renders: an image ready for ProductImage plus a canonical href. */
export interface ResolvedImage {
  image: ImageRef;
  department: DepartmentSlug;
  /** The pictured variant's swatch (tints the generated illustration). */
  tone: string;
}

export interface HeroSlideView extends ResolvedImage {
  id: string;
  headline: string;
  body: string;
  cta: string;
  href: string;
  background: readonly [string, string];
}

export interface CategoryTileView extends ResolvedImage {
  id: string;
  label: string;
  href: string;
}

export interface CategoryCardView {
  id: string;
  headline: string;
  tiles: CategoryTileView[];
  more?: { label: string; href: string };
}
