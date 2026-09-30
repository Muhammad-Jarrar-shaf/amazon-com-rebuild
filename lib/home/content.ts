import type { CategoryCard, HeroSlide } from "./types";

// Authored home content. Headlines and copy are ours (designed, not Amazon's); every destination is a scoped results
// page and every picture is a catalog product, so a test can prove that no entry leads to an empty page and that the
// pictured product is actually among the results it links to (lib/home/home.test.ts).

/** FR-HOME-1: 3-4 slides, no autoplay. Pictures reuse the licensed product photographs (ADR-0004). */
export const HERO_SLIDES: readonly HeroSlide[] = [
  {
    id: "hero-headphones",
    headline: "Hear every detail",
    body: "Wireless over-ear and in-ear headphones with all-day battery life.",
    cta: "Shop headphones",
    scope: { query: "headphones" },
    picture: { productId: "B0HALO0AUR" },
    background: ["#f3e7dc", "#dfe9f3"],
  },
  {
    id: "hero-computers",
    headline: "Work from anywhere",
    body: "Laptops, keyboards and desk accessories for a better setup.",
    cta: "Shop computers",
    scope: { dept: "computers" },
    picture: { productId: "B0ORBT0AER" },
    background: ["#e4ecf5", "#eef3e6"],
  },
  {
    id: "hero-kitchen",
    headline: "Brew a better morning",
    body: "Kettles, coffee presses and kitchen essentials.",
    cta: "Shop Home & Kitchen",
    scope: { dept: "home-kitchen" },
    picture: { productId: "B0KETL0STV" },
    background: ["#f5ecd9", "#f1e2e2"],
  },
  {
    id: "hero-books",
    headline: "Stories worth staying up for",
    body: "Fiction, cookbooks and nonfiction picks for every reader.",
    cta: "Shop books",
    scope: { dept: "books" },
    picture: { productId: "B0BOOK0SLT" },
    background: ["#ebe6f3", "#e2eff0"],
  },
];

/** FR-HOME-2: at least 8 cards of 2x2 captioned tiles, each tile a scoped results page. */
export const CATEGORY_CARDS: readonly CategoryCard[] = [
  {
    id: "electronics",
    headline: "Shop Electronics",
    tiles: [
      { id: "electronics-headphones", label: "Headphones", scope: { query: "headphones", dept: "electronics" }, picture: { productId: "B0HALO0AUR" } },
      { id: "electronics-earbuds", label: "Earbuds", scope: { query: "earbuds", dept: "electronics" }, picture: { productId: "B0HALO0PUL" } },
      { id: "electronics-speakers", label: "Speakers", scope: { query: "speaker", dept: "electronics" }, picture: { productId: "B0VOXL0SPK" } },
      { id: "electronics-power-banks", label: "Power banks", scope: { query: "power bank", dept: "electronics" }, picture: { productId: "B0NIMB0PWR" } },
    ],
    more: { label: "See more in Electronics", scope: { dept: "electronics" } },
  },
  {
    id: "record-stream-play",
    headline: "Record, stream & play",
    tiles: [
      { id: "stream-microphones", label: "Microphones", scope: { query: "microphone", dept: "electronics" }, picture: { productId: "B0VOXL0MIC" } },
      { id: "stream-soundbars", label: "Soundbars", scope: { query: "soundbar", dept: "electronics" }, picture: { productId: "B0VOXL0BAR" } },
      { id: "stream-kids-headphones", label: "Kids' headphones", scope: { query: "kids headphones", dept: "electronics" }, picture: { productId: "B0HALO0KID" } },
      { id: "stream-cables", label: "USB-C cables", scope: { query: "cable", dept: "electronics" }, picture: { productId: "B0NIMB0CBL" } },
    ],
  },
  {
    id: "computers",
    headline: "Computers & accessories",
    tiles: [
      { id: "computers-laptops", label: "Laptops", scope: { query: "laptop", dept: "computers" }, picture: { productId: "B0ORBT0AER" } },
      { id: "computers-keyboards", label: "Keyboards", scope: { query: "keyboard", dept: "computers" }, picture: { productId: "B0KEYS0K84" } },
      { id: "computers-mice", label: "Mice", scope: { query: "mouse", dept: "computers" }, picture: { productId: "B0ORBT0MSE" } },
      { id: "computers-docks", label: "Docks & hubs", scope: { query: "dock", dept: "computers" }, picture: { productId: "B0ORBT0DCK" } },
    ],
    more: { label: "See more in Computers", scope: { dept: "computers" } },
  },
  {
    id: "desk-setup",
    headline: "Upgrade your desk",
    tiles: [
      { id: "desk-stands", label: "Laptop stands", scope: { query: "laptop stand" }, picture: { productId: "B0KEYS0STD" } },
      { id: "desk-coffee", label: "Coffee presses", scope: { query: "french press" }, picture: { productId: "B0KETL0FRP" } },
      { id: "desk-tea", label: "Tea kettles", scope: { query: "kettle" }, picture: { productId: "B0KETL0STV" } },
      { id: "desk-productivity", label: "Productivity books", scope: { query: "productivity", dept: "books" }, picture: { productId: "B0BOOK0QTR" } },
    ],
  },
  {
    id: "home-kitchen",
    headline: "Home & Kitchen",
    tiles: [
      { id: "kitchen-cookware", label: "Cookware", scope: { query: "skillet", dept: "home-kitchen" }, picture: { productId: "B0HRTH0CST" } },
      { id: "kitchen-knives", label: "Knives", scope: { query: "knife", dept: "home-kitchen" }, picture: { productId: "B0HRTH0KNF" } },
      { id: "kitchen-air-fryers", label: "Air fryers", scope: { query: "air fryer", dept: "home-kitchen" }, picture: { productId: "B0PINE0AIR" } },
      { id: "kitchen-blenders", label: "Blenders", scope: { query: "blender", dept: "home-kitchen" }, picture: { productId: "B0PINE0BLD" } },
    ],
    more: { label: "See more in Home & Kitchen", scope: { dept: "home-kitchen" } },
  },
  {
    id: "books",
    headline: "Books for every reader",
    tiles: [
      { id: "books-fiction", label: "Fiction", scope: { query: "fiction", dept: "books" }, picture: { productId: "B0BOOK0SLT" } },
      { id: "books-cookbooks", label: "Cookbooks", scope: { query: "cookbook", dept: "books" }, picture: { productId: "B0BOOK0RIV" } },
      { id: "books-space", label: "Space & science", scope: { query: "astronomy", dept: "books" }, picture: { productId: "B0BOOK0SKY" } },
      { id: "books-business", label: "Business", scope: { query: "business", dept: "books" }, picture: { productId: "B0BOOK0QTR" } },
    ],
    more: { label: "See more in Books", scope: { dept: "books" } },
  },
  {
    id: "toys-games",
    headline: "Toys & Games",
    tiles: [
      { id: "toys-blocks", label: "Building blocks", scope: { query: "blocks", dept: "toys-games" }, picture: { productId: "B0BRCK0BLK" } },
      { id: "toys-magnetic", label: "Magnetic tiles", scope: { query: "magnetic", dept: "toys-games" }, picture: { productId: "B0BRCK0MAR" } },
      { id: "toys-puzzles", label: "Puzzles", scope: { query: "puzzle", dept: "toys-games" }, picture: { productId: "B0TNKR0PZL" } },
      { id: "toys-chess", label: "Chess sets", scope: { query: "chess", dept: "toys-games" }, picture: { productId: "B0TNKR0CHS" } },
    ],
    more: { label: "See more in Toys & Games", scope: { dept: "toys-games" } },
  },
  {
    id: "beauty",
    headline: "Beauty & personal care",
    tiles: [
      { id: "beauty-serums", label: "Face serums", scope: { query: "serum", dept: "beauty" }, picture: { productId: "B0LUMN0SRM" } },
      { id: "beauty-moisturizers", label: "Moisturizers", scope: { query: "moisturizer", dept: "beauty" }, picture: { productId: "B0LUMN0MST" } },
      { id: "beauty-brushes", label: "Cleansing brushes", scope: { query: "cleansing brush", dept: "beauty" }, picture: { productId: "B0DEWL0BRS" } },
      // max=29 keeps prices up to $29.99 (lib/search/url.ts), so the $29.99 brush pictured here is in the results.
      { id: "beauty-under-30", label: "Beauty under $30", scope: { dept: "beauty", maxPrice: 29 }, picture: { productId: "B0DEWL0BRS", variantId: "sage" } },
    ],
    more: { label: "See more in Beauty", scope: { dept: "beauty" } },
  },
];

/** FR-HOME-3: the product rail shows the catalog's featured products. */
export const HOME_RAIL = { id: "popular-products", title: "Popular products", limit: 8 } as const;
