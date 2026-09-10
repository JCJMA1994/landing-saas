import type { SiteDomain } from "../../domain/domain/site-domain";

export type SaveDomainInput = Omit<SiteDomain, "id" | "createdAt" | "updatedAt"> & {
  id?: string | undefined;
};

export interface DomainRepository {
  listDomains(siteId: string): Promise<SiteDomain[]>;
  getDomain(domainId: string): Promise<SiteDomain | null>;
  getDomainByName(domain: string): Promise<SiteDomain | null>;
  getVerifiedDomain(domain: string): Promise<SiteDomain | null>;
  saveDomain(input: SaveDomainInput): Promise<SiteDomain>;
  deleteDomain(tenantId: string, siteId: string, domainId: string): Promise<void>;
}

export class DomainRepositoryError extends Error {
  constructor(message = "Domain repository temporarily unavailable.") {
    super(message);
    this.name = "DomainRepositoryError";
  }
}
