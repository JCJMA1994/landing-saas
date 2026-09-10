import { describe, expect, it } from "vitest";
import { isPromotionDateValid } from "../../src/domain/site/promotion";

describe("site promotions domain", () => {
  it("validates chronological promotion dates", () => {
    expect(isPromotionDateValid(undefined, undefined)).toBe(true);
    expect(isPromotionDateValid("2026-09-01T00:00:00Z", undefined)).toBe(true);
    expect(isPromotionDateValid(undefined, "2026-09-30T00:00:00Z")).toBe(true);
    expect(isPromotionDateValid("2026-09-01T00:00:00Z", "2026-09-30T00:00:00Z")).toBe(true);

    // Invalid dates
    expect(isPromotionDateValid("2026-09-30T00:00:00Z", "2026-09-01T00:00:00Z")).toBe(false);
    expect(isPromotionDateValid("invalid-date", "2026-09-30T00:00:00Z")).toBe(false);
  });
});
