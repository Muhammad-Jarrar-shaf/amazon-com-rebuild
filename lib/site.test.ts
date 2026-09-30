import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/site";

describe("SITE metadata", () => {
  it("has a name that appears in the title", () => {
    expect(SITE.name.length).toBeGreaterThan(0);
    expect(SITE.title).toContain(SITE.name);
  });

  it("keeps the description within search-snippet length", () => {
    expect(SITE.description.length).toBeGreaterThan(0);
    expect(SITE.description.length).toBeLessThanOrEqual(160);
  });
});
