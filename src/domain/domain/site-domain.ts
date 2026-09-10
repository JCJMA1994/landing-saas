import { randomUUID } from "node:crypto";

export type DomainStatus = "pending" | "verified" | "failed";
export type VerificationType = "cname" | "txt";
export type SslStatus = "pending" | "active" | "error";

export interface SiteDomain {
  id: string;
  tenantId: string;
  siteId: string;
  domain: string;
  status: DomainStatus;
  verificationType: VerificationType;
  verificationToken: string;
  verifiedAt?: string | undefined;
  lastCheckedAt?: string | undefined;
  sslStatus: SslStatus;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4_REGEX = /^(?:\d{1,3}\.){3}\d{1,3}$/;

/**
 * Validates a domain name according to RFC 1035 and RFC 1123.
 * Disallows single-label names, IP addresses, localhost, and invalid characters.
 */
export function isValidDomain(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const domain = value.trim().toLowerCase();

  if (domain.length < 3 || domain.length > 253) return false;
  if (domain === "localhost" || domain.endsWith(".localhost") || domain.endsWith(".local")) return false;
  if (IPV4_REGEX.test(domain)) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;

  // The TLD must be at least 2 alpha characters
  const tld = labels[labels.length - 1];
  if (!tld || !/^[a-z]{2,}$/.test(tld)) return false;

  for (const label of labels) {
    if (!label || label.length > 63) return false;
    if (!DOMAIN_LABEL_REGEX.test(label)) return false;
  }

  return true;
}

/**
 * Generates a cryptographically strong challenge token for domain verification.
 */
export function generateVerificationToken(): string {
  return `saas-verify-${randomUUID()}`;
}

export interface DnsChallengeRecord {
  type: "TXT" | "CNAME";
  host: string;
  target: string;
  instruction: string;
}

/**
 * Computes the required DNS records for custom domain verification.
 */
export function getDnsChallengeRecords(
  domain: string,
  token: string,
  cnameTarget = "cname.landingsaas.com"
): { txt: DnsChallengeRecord; cname: DnsChallengeRecord } {
  const normalized = domain.toLowerCase().trim();
  return {
    txt: {
      type: "TXT",
      host: `_saas-challenge.${normalized}`,
      target: token,
      instruction: `Crea un registro TXT con el nombre "_saas-challenge.${normalized}" y el valor "${token}".`,
    },
    cname: {
      type: "CNAME",
      host: normalized,
      target: cnameTarget,
      instruction: `Crea un registro CNAME con el nombre "${normalized}" apuntando a "${cnameTarget}".`,
    },
  };
}
