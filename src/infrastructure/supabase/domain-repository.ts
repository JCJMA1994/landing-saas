import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DomainRepositoryError,
  type DomainRepository,
  type SaveDomainInput,
} from "../../application/domain/domain-repository";
import type { SiteDomain } from "../../domain/domain/site-domain";

interface DbDomainRow {
  id: string;
  tenant_id: string;
  site_id: string;
  domain: string;
  status: string;
  verification_type: string;
  verification_token: string;
  verified_at: string | null;
  last_checked_at: string | null;
  ssl_status: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

function mapDomain(row: DbDomainRow): SiteDomain {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    siteId: row.site_id,
    domain: row.domain,
    status: row.status as any,
    verificationType: row.verification_type as any,
    verificationToken: row.verification_token,
    verifiedAt: row.verified_at ?? undefined,
    lastCheckedAt: row.last_checked_at ?? undefined,
    sslStatus: row.ssl_status as any,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseDomainRepository implements DomainRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listDomains(siteId: string): Promise<SiteDomain[]> {
    try {
      const { data, error } = await this.supabase
        .from("site_domains")
        .select("*")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as DbDomainRow[]).map(mapDomain);
    } catch (err: any) {
      throw new DomainRepositoryError(err.message);
    }
  }

  async getDomain(domainId: string): Promise<SiteDomain | null> {
    try {
      const { data, error } = await this.supabase
        .from("site_domains")
        .select("*")
        .eq("id", domainId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapDomain(data as DbDomainRow);
    } catch (err: any) {
      throw new DomainRepositoryError(err.message);
    }
  }

  async getDomainByName(domain: string): Promise<SiteDomain | null> {
    try {
      const { data, error } = await this.supabase
        .from("site_domains")
        .select("*")
        .eq("domain", domain.toLowerCase().trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapDomain(data as DbDomainRow);
    } catch (err: any) {
      throw new DomainRepositoryError(err.message);
    }
  }

  async getVerifiedDomain(domain: string): Promise<SiteDomain | null> {
    try {
      const { data, error } = await this.supabase
        .from("site_domains")
        .select("*")
        .eq("domain", domain.toLowerCase().trim())
        .eq("status", "verified")
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return mapDomain(data as DbDomainRow);
    } catch (err: any) {
      throw new DomainRepositoryError(err.message);
    }
  }

  async saveDomain(input: SaveDomainInput): Promise<SiteDomain> {
    try {
      const row = {
        tenant_id: input.tenantId,
        site_id: input.siteId,
        domain: input.domain.toLowerCase().trim(),
        status: input.status,
        verification_type: input.verificationType,
        verification_token: input.verificationToken,
        verified_at: input.verifiedAt ?? null,
        last_checked_at: input.lastCheckedAt ?? null,
        ssl_status: input.sslStatus,
        is_primary: input.isPrimary,
        updated_at: new Date().toISOString(),
      };

      if (input.id) {
        const { data, error } = await this.supabase
          .from("site_domains")
          .update(row)
          .eq("id", input.id)
          .select()
          .single();

        if (error) throw error;
        return mapDomain(data as DbDomainRow);
      } else {
        const { data, error } = await this.supabase
          .from("site_domains")
          .insert(row)
          .select()
          .single();

        if (error) throw error;
        return mapDomain(data as DbDomainRow);
      }
    } catch (err: any) {
      throw new DomainRepositoryError(err.message);
    }
  }

  async deleteDomain(tenantId: string, siteId: string, domainId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("site_domains")
        .delete()
        .eq("id", domainId)
        .eq("tenant_id", tenantId)
        .eq("site_id", siteId);

      if (error) throw error;
    } catch (err: any) {
      throw new DomainRepositoryError(err.message);
    }
  }
}
