import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_HERO, isSafeLink } from "../../src/domain/site/hero";

describe("site hero domain", () => {
  it("permits secure and standard web links", () => {
    expect(isSafeLink("https://example.com")).toBe(true);
    expect(isSafeLink("http://example.com")).toBe(true);
    expect(isSafeLink("/pricing")).toBe(true);
    expect(isSafeLink("#contact")).toBe(true);
    expect(isSafeLink("mailto:hello@example.com")).toBe(true);
    expect(isSafeLink("tel:+1234567890")).toBe(true);
  });

  it("strictly blocks malicious protocol links and invalid values", () => {
    expect(isSafeLink("javascript:alert(1)")).toBe(false);
    expect(isSafeLink("JAVASCRIPT:alert(1)")).toBe(false);
    expect(isSafeLink("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeLink("ftp://example.com")).toBe(false);
    expect(isSafeLink("")).toBe(false);
    expect(isSafeLink("a".repeat(300))).toBe(false);
  });

  it("contains valid default hero contents", () => {
    expect(DEFAULT_SITE_HERO.headline.length).toBeGreaterThan(0);
    expect(DEFAULT_SITE_HERO.subheadline.length).toBeGreaterThan(0);
    expect(isSafeLink(DEFAULT_SITE_HERO.ctaLink)).toBe(true);
  });
});
