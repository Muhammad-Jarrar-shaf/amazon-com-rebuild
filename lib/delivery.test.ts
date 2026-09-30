import { afterEach, describe, expect, it, vi } from "vitest";
import { now } from "@/lib/clock";
import { addBusinessDays, estimateDelivery, formatDeliveryDate } from "@/lib/delivery";

const WEDNESDAY = new Date("2026-09-30T12:00:00Z");
const FRIDAY = new Date("2026-10-02T12:00:00Z");
const SATURDAY = new Date("2026-10-03T12:00:00Z");

describe("addBusinessDays", () => {
  it("adds weekdays and skips weekends", () => {
    expect(formatDeliveryDate(addBusinessDays(WEDNESDAY, 0))).toBe("Wednesday, September 30");
    expect(formatDeliveryDate(addBusinessDays(WEDNESDAY, 3))).toBe("Monday, October 5");
    expect(formatDeliveryDate(addBusinessDays(FRIDAY, 1))).toBe("Monday, October 5");
    expect(formatDeliveryDate(addBusinessDays(SATURDAY, 1))).toBe("Monday, October 5");
  });

  it("does not mutate its input", () => {
    const start = new Date(WEDNESDAY.getTime());
    addBusinessDays(start, 5);
    expect(start.getTime()).toBe(WEDNESDAY.getTime());
  });

  it("rejects negative or fractional day counts", () => {
    expect(() => addBusinessDays(WEDNESDAY, -1)).toThrow(RangeError);
    expect(() => addBusinessDays(WEDNESDAY, 1.5)).toThrow(RangeError);
  });
});

describe("estimateDelivery", () => {
  it("labels free and paid delivery", () => {
    expect(estimateDelivery(WEDNESDAY, 3, 0)).toEqual({ prefix: "FREE delivery", date: "Monday, October 5" });
    expect(estimateDelivery(WEDNESDAY, 3, 499)).toEqual({ prefix: "$4.99 delivery", date: "Monday, October 5" });
  });
});

describe("clock", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns the pinned instant when APP_FIXED_NOW is set", () => {
    vi.stubEnv("APP_FIXED_NOW", "2026-10-01T12:00:00Z");
    expect(now().toISOString()).toBe("2026-10-01T12:00:00.000Z");
  });

  it("falls back to the real time when unset or invalid", () => {
    vi.stubEnv("APP_FIXED_NOW", "");
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(2000);
    vi.stubEnv("APP_FIXED_NOW", "not a date");
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(2000);
  });
});
