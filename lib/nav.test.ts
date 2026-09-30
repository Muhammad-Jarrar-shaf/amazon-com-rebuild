import { describe, expect, it } from "vitest";
import { DEPARTMENTS, departmentHref } from "@/lib/departments";
import { AVAILABLE_ROUTES, MOBILE_CHIPS, SECONDARY_NAV, formatCartCount, isAvailable } from "@/lib/nav";

describe("formatCartCount", () => {
  it("shows exact counts up to 99", () => {
    expect(formatCartCount(0)).toBe("0");
    expect(formatCartCount(1)).toBe("1");
    expect(formatCartCount(99)).toBe("99");
  });

  it("caps larger counts at 99+", () => {
    expect(formatCartCount(100)).toBe("99+");
    expect(formatCartCount(2500)).toBe("99+");
  });

  it("never renders invalid values", () => {
    expect(formatCartCount(-3)).toBe("0");
    expect(formatCartCount(Number.NaN)).toBe("0");
    expect(formatCartCount(Number.POSITIVE_INFINITY)).toBe("0");
    expect(formatCartCount(2.9)).toBe("2");
  });
});

describe("isAvailable", () => {
  it("treats only built routes as available, ignoring query and hash", () => {
    expect(isAvailable("/")).toBe(true);
    expect(isAvailable("/?ref=x")).toBe(true);
    expect(isAvailable("/#main")).toBe(true);
    expect(isAvailable("/cart")).toBe(false);
    expect(isAvailable("/s?dept=books")).toBe(false);
  });

  it("supports the dynamic product route via a prefix pattern, but not the bare prefix", () => {
    expect(isAvailable("/dp/B0HALO0AUR")).toBe(true);
    expect(isAvailable("/dp/B0HALO0AUR?variant=space-silver")).toBe(true);
    expect(isAvailable("/dp/")).toBe(false);
    expect(isAvailable("/dp")).toBe(false);
    expect(isAvailable("/dpx/B0HALO0AUR")).toBe(false);
  });

  it("only lists absolute paths without query strings", () => {
    for (const route of AVAILABLE_ROUTES) expect(route).toMatch(/^\/[^?#]*$/);
  });
});

describe("navigation data", () => {
  it("keeps the observed desktop sub-nav order", () => {
    expect(SECONDARY_NAV.map((item) => item.label)).toEqual([
      "Prime Video",
      "Coupons",
      "Customer Service",
      "Today's Deals",
      "Registry",
      "Gift Cards",
      "Sell",
    ]);
  });

  it("has unique labels in each list", () => {
    for (const list of [SECONDARY_NAV, MOBILE_CHIPS]) {
      const labels = list.map((item) => item.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
  });

  it("has six departments with unique slugs and search hrefs", () => {
    expect(DEPARTMENTS).toHaveLength(6);
    expect(new Set(DEPARTMENTS.map((d) => d.slug)).size).toBe(DEPARTMENTS.length);
    expect(departmentHref("books")).toBe("/s?dept=books");
  });
});
