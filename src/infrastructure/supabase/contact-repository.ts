import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteContacts } from "../../domain/site/contact";
import {
  ContactRepositoryError,
  type ContactRepository,
} from "../../application/site/contact-repository";

export class SupabaseContactRepository implements ContactRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getContacts(siteId: string): Promise<SiteContacts | null> {
    try {
      const { data, error } = await this.client
        .from("site_contacts")
        .select("*")
        .eq("site_id", siteId)
        .maybeSingle();

      if (error) throw new ContactRepositoryError();
      if (!data) return null;

      const record = data as Record<string, unknown>;
      return {
        siteId: record["site_id"] as string,
        whatsappNumber: typeof record["whatsapp_number"] === "string" ? record["whatsapp_number"] : undefined,
        whatsappMessage: typeof record["whatsapp_message"] === "string" ? record["whatsapp_message"] : undefined,
        instagramHandle: typeof record["instagram_handle"] === "string" ? record["instagram_handle"] : undefined,
        facebookUrl: typeof record["facebook_url"] === "string" ? record["facebook_url"] : undefined,
        email: typeof record["email"] === "string" ? record["email"] : undefined,
        phone: typeof record["phone"] === "string" ? record["phone"] : undefined,
        updatedAt: typeof record["updated_at"] === "string" ? record["updated_at"] : undefined,
      };
    } catch {
      throw new ContactRepositoryError();
    }
  }

  async saveContacts(contacts: SiteContacts): Promise<void> {
    try {
      const { error } = await this.client.from("site_contacts").upsert({
        site_id: contacts.siteId,
        whatsapp_number: contacts.whatsappNumber ?? null,
        whatsapp_message: contacts.whatsappMessage ?? null,
        instagram_handle: contacts.instagramHandle ?? null,
        facebook_url: contacts.facebookUrl ?? null,
        email: contacts.email ?? null,
        phone: contacts.phone ?? null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw new ContactRepositoryError();
    } catch {
      throw new ContactRepositoryError();
    }
  }
}
