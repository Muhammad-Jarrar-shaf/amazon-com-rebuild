import { describe, expect, it } from "vitest";
import { shouldSyncFieldFromUrl } from "@/lib/search/field-sync";

describe("shouldSyncFieldFromUrl", () => {
  it("fills an untouched field from the URL on load", () => {
    expect(shouldSyncFieldFromUrl(null, "/s?k=headphones", false)).toBe(true);
  });

  it("never overwrites what was typed before the first sync (the hydration race)", () => {
    expect(shouldSyncFieldFromUrl(null, "/s?k=headphones", true)).toBe(false);
  });

  it("follows every later URL change, typed text or not (search, Back/Forward, filters)", () => {
    expect(shouldSyncFieldFromUrl("/s?k=headphones", "/s?k=laptop", false)).toBe(true);
    expect(shouldSyncFieldFromUrl("/s?k=headphones", "/s?k=laptop", true)).toBe(true);
  });

  it("does nothing when the same URL is synced again (a repeated effect)", () => {
    expect(shouldSyncFieldFromUrl("/s?k=headphones", "/s?k=headphones", false)).toBe(false);
    expect(shouldSyncFieldFromUrl("/s?k=headphones", "/s?k=headphones", true)).toBe(false);
  });
});
