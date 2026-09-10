import { describe, expect, it } from "vitest";
import { generateSeoMetadata, truncateCleanly } from "../../src/domain/seo/metadata";
import type { PublicationSnapshot } from "../../src/domain/publication/snapshot";

describe("SEO & Social Metadata Generator", () => {
  const mockSnapshot: PublicationSnapshot = {
    schemaVersion: 1,
    templateVersion: 1,
    siteId: "site-1",
    siteName: "Taller Mecánico El Rayo",
    siteSlug: "taller-el-rayo",
    templateKey: "repair-workshop",
    publishedAt: "2026-09-10T12:00:00Z",
    theme: {
      siteId: "site-1",
      primaryColor: "#0284c7",
      secondaryColor: "#0f172a",
      accentColor: "#f59e0b",
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      fontKey: "inter",
      radiusKey: "subtle",
      buttonVariant: "solid",
      cardVariant: "bordered",
    },
    hero: {
      siteId: "site-1",
      headline: "Especialistas en Diagnóstico y Reparación",
      subheadline: "Servicio automotriz de alta precisión con tecnología computarizada de última generación para todas las marcas líderes del mercado.",
      ctaText: "Agendar Cita",
      ctaLink: "#contacto",
    },
    cards: [],
    promotions: [],
    contacts: {
      siteId: "site-1",
      email: "contacto@elrayo.pe",
      phone: "+51999888777",
      whatsappNumber: "+51999888777",
    },
  };

  it("truncates long descriptions cleanly at word boundaries", () => {
    const longText = "Este es un texto sumamente largo que describe las capacidades de nuestro taller automotriz con todo detalle y precisión para los clientes.";
    const truncated = truncateCleanly(longText, 60);
    expect(truncated.length).toBeLessThanOrEqual(63); // 60 + '...'
    expect(truncated).toMatch(/\.\.\.$/);
  });

  it("generates comprehensive SEO and social metadata", () => {
    const seo = generateSeoMetadata({
      snapshot: mockSnapshot,
      host: "landingsaas.com",
      pathname: "/sites/taller-el-rayo",
      protocol: "https",
      imageUrl: "https://assets.example.com/hero.jpg",
    });

    expect(seo.title).toBe("Taller Mecánico El Rayo — Especialistas en Diagnóstico y Reparación");
    expect(seo.canonicalUrl).toBe("https://landingsaas.com/sites/taller-el-rayo");
    expect(seo.robots).toBe("index, follow");
    expect(seo.openGraph.type).toBe("website");
    expect(seo.openGraph.imageUrl).toBe("https://assets.example.com/hero.jpg");
    expect(seo.twitter.card).toBe("summary_large_image");
    expect(seo.themeColor).toBe("#0284c7");
  });

  it("uses verified custom domain for canonical URL when present", () => {
    const seo = generateSeoMetadata({
      snapshot: mockSnapshot,
      host: "landingsaas.com",
      customDomain: "taller-el-rayo.pe",
    });

    expect(seo.canonicalUrl).toBe("https://taller-el-rayo.pe");
    expect(seo.openGraph.url).toBe("https://taller-el-rayo.pe");
  });

  it("sets noindex, nofollow for drafts or previews", () => {
    const seo = generateSeoMetadata({
      snapshot: mockSnapshot,
      host: "landingsaas.com",
      isDraftOrPreview: true,
    });

    expect(seo.robots).toBe("noindex, nofollow");
  });
});
