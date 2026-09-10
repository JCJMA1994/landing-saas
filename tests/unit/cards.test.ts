import { describe, expect, it } from "vitest";
import { ALLOWED_CARD_ICONS, isValidCardLink } from "../../src/domain/site/card";

describe("site cards domain", () => {
  it("defines standard card icons", () => {
    expect(ALLOWED_CARD_ICONS).toContain("wrench");
    expect(ALLOWED_CARD_ICONS).toContain("shield");
    expect(ALLOWED_CARD_ICONS).toContain("bolt");
  });

  it("validates safe card links", () => {
    expect(isValidCardLink("https://example.com/feature")).toBe(true);
    expect(isValidCardLink("/features/diagnostics")).toBe(true);
    expect(isValidCardLink("#plans")).toBe(true);
    expect(isValidCardLink(undefined)).toBe(true);

    expect(isValidCardLink("javascript:alert(1)")).toBe(false);
    expect(isValidCardLink("data:text/html,hack")).toBe(false);
  });
});
