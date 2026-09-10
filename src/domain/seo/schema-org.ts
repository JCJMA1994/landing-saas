import type { PublicationSnapshot } from "../publication/snapshot";
import type { SiteCard } from "../site/card";

export interface SchemaOrgGraph {
  "@context": "https://schema.org";
  "@graph": Record<string, any>[];
}

export function generateSchemaOrgJsonLd(
  snapshot: PublicationSnapshot,
  canonicalUrl: string,
  imageUrl?: string | undefined
): SchemaOrgGraph {
  const businessType =
    snapshot.templateKey === "repair-workshop"
      ? "AutoRepair"
      : snapshot.templateKey === "tech-diagnostic"
        ? "ProfessionalService"
        : "LocalBusiness";

  const businessNode: Record<string, any> = {
    "@type": businessType,
    "@id": `${canonicalUrl}#business`,
    name: snapshot.siteName,
    url: canonicalUrl,
    description: snapshot.hero?.subheadline || `${snapshot.siteName} — Soluciones técnicas.`,
  };

  if (imageUrl) {
    businessNode.image = imageUrl;
  }

  if (snapshot.contacts) {
    if (snapshot.contacts.phone || snapshot.contacts.whatsappNumber) {
      businessNode.telephone = snapshot.contacts.phone || snapshot.contacts.whatsappNumber;
    }
    if (snapshot.contacts.email) {
      businessNode.email = snapshot.contacts.email;
    }
  }

  // OfferCatalog from cards
  if (snapshot.cards && snapshot.cards.length > 0) {
    businessNode.hasOfferCatalog = {
      "@type": "OfferCatalog",
      name: "Servicios y Capacidades",
      itemListElement: snapshot.cards.map((card: SiteCard, idx: number) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: card.title,
          description: card.description,
        },
        position: idx + 1,
      })),
    };
  }

  const websiteNode = {
    "@type": "WebSite",
    "@id": `${canonicalUrl}#website`,
    url: canonicalUrl,
    name: snapshot.siteName,
    publisher: {
      "@id": `${canonicalUrl}#business`,
    },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [businessNode, websiteNode],
  };
}
