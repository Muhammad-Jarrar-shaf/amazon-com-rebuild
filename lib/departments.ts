// Departments offered by the search dropdown, the menu drawer and (from S2) the seed catalog.
// Amazon lists ~27; the rebuild deliberately supports six (docs/architecture.md, ADR-0003).
export const DEPARTMENTS = [
  { slug: "electronics", label: "Electronics" },
  { slug: "computers", label: "Computers" },
  { slug: "home-kitchen", label: "Home & Kitchen" },
  { slug: "books", label: "Books" },
  { slug: "toys-games", label: "Toys & Games" },
  { slug: "beauty", label: "Beauty & Personal Care" },
] as const;

export type DepartmentSlug = (typeof DEPARTMENTS)[number]["slug"];

export const ALL_DEPARTMENTS_LABEL = "All Departments";

export function getDepartment(slug: DepartmentSlug): (typeof DEPARTMENTS)[number] {
  const department = DEPARTMENTS.find((candidate) => candidate.slug === slug);
  if (!department) throw new Error(`unknown department: ${slug}`);
  return department;
}

// The results route arrives in S3; this is the URL shape that slice will parse (FR-SRCH-8).
export function departmentHref(slug: DepartmentSlug): string {
  return `/s?dept=${slug}`;
}
