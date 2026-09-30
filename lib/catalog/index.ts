import { PRODUCTS } from "@/data/products";
import { departmentHref, getDepartment, type DepartmentSlug } from "@/lib/departments";
import type { Product, SearchRecord } from "./types";
import { normalizeSearchText } from "@/lib/search/text";
import { getDefaultVariant } from "./variants";

export { getDefaultVariant, getVariant, getVariantAvailability, isPurchasable } from "./variants";
export { normalizeSearchText } from "@/lib/search/text";

// Pure, deterministic catalog access (server-side: it imports the seed data). Search ranking, filtering, sorting and
// pagination live in lib/search; getSearchIndex below is a flat record view of the catalog.

const BY_ID: ReadonlyMap<string, Product> = new Map(PRODUCTS.map((product) => [product.id, product]));

export function getAllProducts(): readonly Product[] {
  return PRODUCTS;
}

export function getProductById(id: string): Product | undefined {
  return BY_ID.get(id);
}

export function getProductsByDepartment(slug: DepartmentSlug): Product[] {
  return PRODUCTS.filter((product) => product.department === slug);
}

/** Related products in the authored order. Unknown ids, the product itself and duplicates are skipped. */
export function getRelatedProducts(product: Product, limit = 8): Product[] {
  const seen = new Set<string>([product.id]);
  const related: Product[] = [];
  for (const id of product.relatedIds) {
    const candidate = BY_ID.get(id);
    if (!candidate || seen.has(id)) continue;
    seen.add(id);
    related.push(candidate);
    if (related.length === limit) break;
  }
  return related;
}

/** Featured products, best rank first; ties break on id so the order never changes between calls. */
export function getFeaturedProducts(limit = 8): Product[] {
  return PRODUCTS.filter((product) => product.featuredRank !== undefined)
    .sort((a, b) => (a.featuredRank as number) - (b.featuredRank as number) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function getBreadcrumb(product: Product): { label: string; href: string }[] {
  const department = getDepartment(product.department);
  return [
    { label: department.label, href: departmentHref(department.slug) },
    { label: product.category, href: departmentHref(department.slug) },
  ];
}

/** Price shown on cards and rails: the default variant's. */
export function getDisplayPrice(product: Product): { priceCents: number; listPriceCents?: number } {
  const variant = getDefaultVariant(product);
  return { priceCents: variant.priceCents, listPriceCents: variant.listPriceCents };
}

export function toSearchRecord(product: Product): SearchRecord {
  return {
    id: product.id,
    department: product.department,
    title: product.title,
    brand: product.brand,
    category: product.category,
    tags: product.tags,
    text: normalizeSearchText([product.title, product.brand, product.category, ...product.tags].join(" ")),
  };
}

export function getSearchIndex(): readonly SearchRecord[] {
  return PRODUCTS.map(toSearchRecord);
}
