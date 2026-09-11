import type { User } from "@supabase/supabase-js";
import type { AuditLogGateway } from "../audit/audit-gateway";
import type { DnsResolverGateway } from "./dns-gateway";
import type { DomainRepository } from "./domain-repository";
import {
  isValidDomain,
  generateVerificationToken,
  type SiteDomain,
  type VerificationType,
} from "../../domain/domain/site-domain";
import { canEditContent, type TenantRole } from "../../domain/tenant/roles";

export class DomainAuthorizationError extends Error {
  constructor() {
    super("Insufficient permissions to manage site domains.");
    this.name = "DomainAuthorizationError";
  }
}

export class InvalidDomainError extends Error {
  constructor(message = "The provided domain name is invalid.") {
    super(message);
    this.name = "InvalidDomainError";
  }
}

export class DomainAlreadyRegisteredError extends Error {
  constructor() {
    super("This domain is already registered on the platform.");
    this.name = "DomainAlreadyRegisteredError";
  }
}

export class DomainNotFoundError extends Error {
  constructor() {
    super("Domain not found.");
    this.name = "DomainNotFoundError";
  }
}

export interface AddDomainInput {
  siteId: string;
  domain: string;
  verificationType?: VerificationType | undefined;
}

export async function addSiteDomainUseCase(
  actor: User,
  tenantId: string,
  input: AddDomainInput,
  role: TenantRole,
  domainRepo: DomainRepository,
  auditGateway: AuditLogGateway,
  appHostname?: string | undefined
): Promise<SiteDomain> {
  if (!canEditContent(role)) {
    throw new DomainAuthorizationError();
  }

  const normalizedDomain = input.domain.trim().toLowerCase();
  if (!isValidDomain(normalizedDomain)) {
    throw new InvalidDomainError();
  }

  if (appHostname) {
    const cleanAppHostname = appHostname.trim().toLowerCase();
    if (normalizedDomain === cleanAppHostname || normalizedDomain.endsWith(`.${cleanAppHostname}`)) {
      throw new InvalidDomainError(
        `El dominio "${normalizedDomain}" es un subdominio propio de la plataforma y ya está activo automáticamente arriba. No requiere ser agregado como dominio personalizado.`
      );
    }
  }

  const existing = await domainRepo.getDomainByName(normalizedDomain);
  if (existing) {
    throw new DomainAlreadyRegisteredError();
  }

  const verificationType = input.verificationType || "cname";
  const verificationToken = generateVerificationToken();

  const saved = await domainRepo.saveDomain({
    tenantId,
    siteId: input.siteId,
    domain: normalizedDomain,
    status: "pending",
    verificationType,
    verificationToken,
    sslStatus: "pending",
    isPrimary: false,
  });

  await auditGateway.record({
    tenantId,
    actorUserId: actor.id,
    action: "domain.added",
    resourceType: "domain",
    resourceId: saved.id,
    metadata: {
      siteId: input.siteId,
      domain: normalizedDomain,
      verificationType,
    },
  });

  return saved;
}

export interface VerifyDomainResult {
  verified: boolean;
  message: string;
  domain: SiteDomain;
}

export async function verifySiteDomainUseCase(
  actor: User,
  tenantId: string,
  siteId: string,
  domainId: string,
  role: TenantRole,
  cnameTarget: string,
  domainRepo: DomainRepository,
  dnsGateway: DnsResolverGateway,
  auditGateway: AuditLogGateway
): Promise<VerifyDomainResult> {
  if (!canEditContent(role)) {
    throw new DomainAuthorizationError();
  }

  const domain = await domainRepo.getDomain(domainId);
  if (!domain || domain.siteId !== siteId || domain.tenantId !== tenantId) {
    throw new DomainNotFoundError();
  }

  let verified = false;
  let detail = "";

  try {
    if (domain.verificationType === "cname") {
      const cnames = await dnsGateway.resolveCname(domain.domain);
      const cleanTarget = cnameTarget.toLowerCase().replace(/\.$/, "");
      verified = cnames.some((c) => c.toLowerCase().replace(/\.$/, "") === cleanTarget);
      detail = verified
        ? `CNAME verificado hacia ${cnameTarget}`
        : `El registro CNAME actual (${cnames.join(", ") || "ninguno"}) no coincide con ${cnameTarget}`;
    } else {
      const txtRecords = await dnsGateway.resolveTxt(`_saas-challenge.${domain.domain}`);
      const flattened = txtRecords.flat();
      verified = flattened.includes(domain.verificationToken);
      detail = verified
        ? "Registro TXT de desafío verificado correctamente"
        : "El registro TXT en _saas-challenge no contiene el token esperado";
    }
  } catch (err: any) {
    verified = false;
    detail = `Error al consultar DNS: ${err.message || "registro no encontrado"}`;
  }

  const now = new Date().toISOString();
  const updatedDomain = await domainRepo.saveDomain({
    id: domain.id,
    tenantId: domain.tenantId,
    siteId: domain.siteId,
    domain: domain.domain,
    status: verified ? "verified" : "failed",
    verificationType: domain.verificationType,
    verificationToken: domain.verificationToken,
    verifiedAt: verified ? now : domain.verifiedAt,
    lastCheckedAt: now,
    sslStatus: verified ? "active" : "pending",
    isPrimary: domain.isPrimary,
  });

  if (verified) {
    await auditGateway.record({
      tenantId,
      actorUserId: actor.id,
      action: "domain.verified",
      resourceType: "domain",
      resourceId: domain.id,
      metadata: {
        domain: domain.domain,
        method: domain.verificationType,
      },
    });
  }

  return {
    verified,
    message: verified ? "Dominio verificado con éxito y SSL activo." : detail,
    domain: updatedDomain,
  };
}

export async function deleteSiteDomainUseCase(
  actor: User,
  tenantId: string,
  siteId: string,
  domainId: string,
  role: TenantRole,
  domainRepo: DomainRepository,
  auditGateway: AuditLogGateway
): Promise<void> {
  if (!canEditContent(role)) {
    throw new DomainAuthorizationError();
  }

  const domain = await domainRepo.getDomain(domainId);
  if (!domain || domain.siteId !== siteId || domain.tenantId !== tenantId) {
    throw new DomainNotFoundError();
  }

  await domainRepo.deleteDomain(tenantId, siteId, domainId);

  await auditGateway.record({
    tenantId,
    actorUserId: actor.id,
    action: "domain.deleted",
    resourceType: "domain",
    resourceId: domainId,
    metadata: {
      siteId,
      domain: domain.domain,
    },
  });
}

export interface VerifyPendingDomainsResult {
  totalChecked: number;
  verifiedCount: number;
  results: Array<{
    domainId: string;
    domain: string;
    verified: boolean;
    message: string;
  }>;
}

export async function verifyPendingDomainsUseCase(
  cnameTarget: string,
  domainRepo: DomainRepository,
  dnsGateway: DnsResolverGateway,
  auditGateway: AuditLogGateway,
  limit = 50
): Promise<VerifyPendingDomainsResult> {
  const pendingDomains = await domainRepo.listPendingDomains(limit);
  const results: VerifyPendingDomainsResult["results"] = [];
  let verifiedCount = 0;

  for (const domain of pendingDomains) {
    let verified = false;
    let detail = "";

    try {
      if (domain.verificationType === "cname") {
        const cnames = await dnsGateway.resolveCname(domain.domain);
        const cleanTarget = cnameTarget.toLowerCase().replace(/\.$/, "");
        verified = cnames.some((c) => c.toLowerCase().replace(/\.$/, "") === cleanTarget);
        detail = verified
          ? `CNAME verificado hacia ${cnameTarget}`
          : `CNAME actual (${cnames.join(", ") || "ninguno"}) no coincide`;
      } else {
        const txtRecords = await dnsGateway.resolveTxt(`_saas-challenge.${domain.domain}`);
        const flattened = txtRecords.flat();
        verified = flattened.includes(domain.verificationToken);
        detail = verified
          ? "Registro TXT de desafío verificado correctamente"
          : "Registro TXT no coincide con token esperado";
      }
    } catch (err: any) {
      verified = false;
      detail = `Error DNS: ${err.message || "registro no encontrado"}`;
    }

    const now = new Date().toISOString();
    if (verified) {
      verifiedCount++;
      await domainRepo.saveDomain({
        id: domain.id,
        tenantId: domain.tenantId,
        siteId: domain.siteId,
        domain: domain.domain,
        status: "verified",
        verificationType: domain.verificationType,
        verificationToken: domain.verificationToken,
        verifiedAt: now,
        lastCheckedAt: now,
        sslStatus: "active",
        isPrimary: domain.isPrimary,
      });

      await auditGateway.record({
        tenantId: domain.tenantId,
        actorUserId: "system:cron",
        action: "domain.verified_automatically",
        resourceType: "domain",
        resourceId: domain.id,
        metadata: {
          domain: domain.domain,
          method: domain.verificationType,
          source: "cron",
        },
      });
    } else {
      await domainRepo.saveDomain({
        id: domain.id,
        tenantId: domain.tenantId,
        siteId: domain.siteId,
        domain: domain.domain,
        status: "pending",
        verificationType: domain.verificationType,
        verificationToken: domain.verificationToken,
        verifiedAt: domain.verifiedAt,
        lastCheckedAt: now,
        sslStatus: domain.sslStatus,
        isPrimary: domain.isPrimary,
      });
    }

    results.push({
      domainId: domain.id,
      domain: domain.domain,
      verified,
      message: detail,
    });
  }

  return {
    totalChecked: pendingDomains.length,
    verifiedCount,
    results,
  };
}
