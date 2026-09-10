import { describe, expect, it } from "vitest";
import { generateSchemaOrgJsonLd } from "../../src/domain/seo/schema-org";
import type { PublicationSnapshot } from "../../src/domain/publication/snapshot";

describe("Schema.org JSON-LD Generator", () => {
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
      headline: "Diagnóstico Computarizado",
      subheadline: "Taller mecánico multimarca con certificación técnica.",
      ctaText: "Cotizar",
      ctaLink: "#",
    },
    cards: [
      {
        id: "c-1",
        siteId: "site-1",
        title: "Escaneo OBD-II",
        description: "Diagnóstico de fallas electrónicas.",
        iconKey: "cpu",
        sortOrder: 1,
      },
    ],
    promotions: [],
    contacts: {
      siteId: "site-1",
      email: "info@elrayo.pe",
      phone: "+51999888777",
      whatsappNumber: "+51999888777",
    },
  };

  it("generates structured data with correct AutoRepair type for workshop template", () => {
    const jsonLd = generateSchemaOrgJsonLd(
      mockSnapshot,
      "https://taller-el-rayo.pe",
      "https://example.com/image.jpg"
    );

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@graph"]).toHaveLength(2);

    const business = jsonLd["@graph"].find((n) => n["@type"] === "AutoRepair");
    expect(business).toBeDefined();
    expect(business?.name).toBe("Taller Mecánico El Rayo");
    expect(business?.url).toBe("https://taller-el-rayo.pe");
    expect(business?.image).toBe("https://example.com/image.jpg");
    expect(business?.telephone).toBe("+51999888777");
    expect(business?.hasOfferCatalog?.itemListElement).toHaveLength(1);
    expect(business?.hasOfferCatalog?.itemListElement[0].itemOffered.name).toBe("Escaneo OBD-II");

    const website = jsonLd["@graph"].find((n) => n["@type"] === "WebSite");
    expect(website).toBeDefined();
    expect(website?.name).toBe("Taller Mecánico El Rayo");
  });

  it("assigns ProfessionalService for tech-diagnostic template", () => {
    const diagSnapshot: PublicationSnapshot = {
      ...mockSnapshot,
      templateKey: "tech-diagnostic",
    };

    const jsonLd = generateSchemaOrgJsonLd(diagSnapshot, "https://diag.example.com");
    const business = jsonLd["@graph"].find((n) => n["@type"] === "ProfessionalService");
    expect(business).toBeDefined();
  });
});
