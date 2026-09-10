import { describe, expect, it } from "vitest";
import {
  generateWhatsAppUrl,
  isValidE164Phone,
  isValidInstagramHandle,
} from "../../src/domain/site/contact";

describe("site contacts domain", () => {
  it("validates international E.164 phone numbers", () => {
    expect(isValidE164Phone("+5491122334455")).toBe(true);
    expect(isValidE164Phone("+14155552671")).toBe(true);

    // Invalid numbers
    expect(isValidE164Phone("1122334455")).toBe(false);
    expect(isValidE164Phone("+0123456789")).toBe(false);
    expect(isValidE164Phone("+1")).toBe(false);
    expect(isValidE164Phone("phone")).toBe(false);
  });

  it("validates Instagram handles without @", () => {
    expect(isValidInstagramHandle("mybrand")).toBe(true);
    expect(isValidInstagramHandle("my_brand.saas")).toBe(true);

    expect(isValidInstagramHandle("@mybrand")).toBe(false);
    expect(isValidInstagramHandle("my brand")).toBe(false);
    expect(isValidInstagramHandle("")).toBe(false);
  });

  it("generates formatted WhatsApp direct URLs", () => {
    expect(generateWhatsAppUrl("+5491122334455")).toBe("https://wa.me/5491122334455");
    expect(generateWhatsAppUrl("+5491122334455", "Hello world")).toBe(
      "https://wa.me/5491122334455?text=Hello%20world",
    );
  });
});
