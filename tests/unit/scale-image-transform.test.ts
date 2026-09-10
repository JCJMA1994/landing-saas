import { describe, expect, it } from "vitest";
import {
  buildTransformedImageUrl,
  InvalidImageTransformError,
  negotiateImageFormat,
  parseImageTransformParams,
} from "../../src/domain/scale/image-transform";

describe("Scale & Edge Image Transformations", () => {
  it("parses valid transformation parameters", () => {
    const sp = new URLSearchParams({
      url: "https://example.com/photo.jpg",
      w: "800",
      h: "600",
      q: "85",
      fit: "cover",
      format: "webp",
    });

    const params = parseImageTransformParams(sp);
    expect(params.url).toBe("https://example.com/photo.jpg");
    expect(params.width).toBe(800);
    expect(params.height).toBe(600);
    expect(params.quality).toBe(85);
    expect(params.fit).toBe("cover");
    expect(params.format).toBe("webp");
  });

  it("throws on missing or invalid image URL", () => {
    expect(() => parseImageTransformParams(new URLSearchParams())).toThrow(
      InvalidImageTransformError
    );
    expect(() =>
      parseImageTransformParams(new URLSearchParams({ url: "ftp://not-http.jpg" }))
    ).toThrow(InvalidImageTransformError);
  });

  it("throws on out-of-bounds width or quality", () => {
    expect(() =>
      parseImageTransformParams(
        new URLSearchParams({ url: "https://example.com/p.jpg", w: "5" }) // < 16
      )
    ).toThrow(InvalidImageTransformError);

    expect(() =>
      parseImageTransformParams(
        new URLSearchParams({ url: "https://example.com/p.jpg", q: "150" }) // > 100
      )
    ).toThrow(InvalidImageTransformError);
  });

  it("negotiates optimal modern formats from Accept header", () => {
    expect(negotiateImageFormat("image/avif,image/webp,*/*")).toBe("avif");
    expect(negotiateImageFormat("image/webp,image/apng,*/*")).toBe("webp");
    expect(negotiateImageFormat("text/html,application/xhtml+xml")).toBe("jpeg");
    expect(negotiateImageFormat(null)).toBe("webp"); // Default modern fallback
    expect(negotiateImageFormat("image/avif", "png")).toBe("png"); // Explicit override wins
  });

  it("serializes transformed image URL cleanly", () => {
    const url = buildTransformedImageUrl("/api/images/transform", {
      url: "https://example.com/hero.jpg",
      width: 1200,
      quality: 85,
    });

    expect(url).toContain("/api/images/transform?");
    expect(url).toContain("url=https%3A%2F%2Fexample.com%2Fhero.jpg");
    expect(url).toContain("w=1200");
    expect(url).toContain("q=85");
  });
});
