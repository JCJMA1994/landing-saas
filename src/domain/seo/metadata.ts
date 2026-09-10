import type { PublicationSnapshot } from "../publication/snapshot";

export interface OpenGraphMetadata {
  title: string;
  description: string;
  url: string;
  type: string;
  siteName: string;
  locale: string;
  imageUrl?: string | undefined;
}

export interface TwitterMetadata {
  card: "summary" | "summary_large_image";
  title: string;
  description: string;
  imageUrl?: string | undefined;
}

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  openGraph: OpenGraphMetadata;
  twitter: TwitterMetadata;
  themeColor?: string | undefined;
}

export interface BuildSeoMetadataInput {
  snapshot: PublicationSnapshot;
  host: string;
  pathname?: string | undefined;
  protocol?: string | undefined;
  customDomain?: string | null | undefined;
  isDraftOrPreview?: boolean | undefined;
  imageUrl?: string | undefined;
}

/**
 * Truncates text cleanly at word boundaries with an ellipsis if it exceeds maxLength.
 */
export function truncateCleanly(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const sub = text.slice(0, maxLength);
  const lastSpace = sub.lastIndexOf(" ");
  return lastSpace > 0 ? `${sub.slice(0, lastSpace)}...` : `${sub}...`;
}

/**
 * Generates comprehensive SEO, OpenGraph and Twitter metadata from a published site snapshot.
 */
export function generateSeoMetadata(input: BuildSeoMetadataInput): SeoMetadata {
  const {
    snapshot,
    host,
    pathname = "/",
    protocol = "https",
    customDomain,
    isDraftOrPreview = false,
    imageUrl,
  } = input;

  const resolvedHost = customDomain || host;
  const cleanPath = pathname === "/" ? "" : pathname;
  const canonicalUrl = `${protocol}://${resolvedHost}${cleanPath}`;

  const baseTitle = snapshot.siteName || "Landing Page";
  const heroHeadline = snapshot.hero?.headline?.trim();
  const title = heroHeadline && heroHeadline !== baseTitle
    ? `${baseTitle} — ${heroHeadline}`
    : baseTitle;

  const rawDescription = snapshot.hero?.subheadline?.trim() || `${baseTitle} — Servicios profesionales y soluciones técnicas de alta calidad.`;
  const description = truncateCleanly(rawDescription, 160);

  const resolvedImageUrl = imageUrl || undefined;
  const robots = isDraftOrPreview ? "noindex, nofollow" : "index, follow";

  return {
    title,
    description,
    canonicalUrl,
    robots,
    themeColor: snapshot.theme?.primaryColor || "#3b82f6",
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: snapshot.siteName,
      locale: "es_PE",
      imageUrl: resolvedImageUrl,
    },
    twitter: {
      card: resolvedImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      imageUrl: resolvedImageUrl,
    },
  };
}
