import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientOnboardingGateway } from "../../application/saas/onboard-client";
import type { TemplateKey } from "../../domain/template/manifest";
import { TEMPLATE_MANIFESTS } from "../../domain/template/manifest";
import type { PlanId } from "../../domain/saas/plan";
import type { TenantRole } from "../../domain/tenant/roles";

export class SupabaseClientOnboardingGateway implements ClientOnboardingGateway {
  constructor(private readonly adminClient: SupabaseClient) {}

  async isSlugTaken(slug: string): Promise<boolean> {
    const { data } = await this.adminClient
      .from("sites")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    return Boolean(data?.id);
  }

  async findOrCreateUser(email: string, password: string): Promise<{ id: string; email: string }> {
    const { data, error } = await this.adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (data?.user) {
      return {
        id: data.user.id,
        email: data.user.email || email,
      };
    }

    // If user already exists in auth, retrieve and update password
    const { data: usersData } = await this.adminClient.auth.admin.listUsers();
    const existing = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      if (password) {
        await this.adminClient.auth.admin.updateUserById(existing.id, { password });
      }
      return {
        id: existing.id,
        email: existing.email || email,
      };
    }

    throw new Error(`Failed to create or resolve client user: ${error?.message || "Unknown error"}`);
  }

  async createTenant(name: string): Promise<{ id: string; name: string }> {
    const { data, error } = await this.adminClient
      .from("tenants")
      .insert({ name })
      .select("id, name")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create tenant: ${error?.message || "Insert failed"}`);
    }

    return { id: data.id, name: data.name };
  }

  async addTenantMember(tenantId: string, userId: string, role: TenantRole): Promise<void> {
    const { error } = await this.adminClient
      .from("tenant_members")
      .upsert(
        {
          tenant_id: tenantId,
          user_id: userId,
          role,
        },
        { onConflict: "tenant_id,user_id" }
      );

    if (error) {
      throw new Error(`Failed to assign tenant member: ${error.message}`);
    }
  }

  async createSite(
    tenantId: string,
    name: string,
    slug: string,
    templateKey: TemplateKey
  ): Promise<{ id: string; name: string; slug: string }> {
    const { data, error } = await this.adminClient
      .from("sites")
      .insert({
        tenant_id: tenantId,
        name,
        slug,
        template_key: templateKey,
      })
      .select("id, name, slug")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create site: ${error?.message || "Insert failed"}`);
    }

    return { id: data.id, name: data.name, slug: data.slug };
  }

  async createSubscription(tenantId: string, planId: PlanId): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { error } = await this.adminClient
      .from("tenant_subscriptions")
      .upsert(
        {
          tenant_id: tenantId,
          plan_id: planId,
          status: "active",
          current_period_starts_at: now.toISOString(),
          current_period_ends_at: periodEnd.toISOString(),
          cancel_at_period_end: false,
          updated_at: now.toISOString(),
        },
        { onConflict: "tenant_id" }
      );

    if (error) {
      throw new Error(`Failed to register tenant subscription: ${error.message}`);
    }
  }

  async initializeSiteContent(
    siteId: string,
    siteName: string,
    templateKey: TemplateKey
  ): Promise<void> {
    const manifest = TEMPLATE_MANIFESTS[templateKey];
    const fontKey = manifest?.defaultVariants?.fontKey || "inter";
    const radiusKey = manifest?.defaultVariants?.radiusKey || "subtle";
    const buttonVariant = manifest?.defaultVariants?.buttonVariant || "solid";
    const cardVariant = manifest?.defaultVariants?.cardVariant || "bordered";

    await this.adminClient.from("site_theme").upsert(
      {
        site_id: siteId,
        primary_color: "#3b82f6",
        secondary_color: "#64748b",
        accent_color: "#f59e0b",
        background_color: "#0a0f1e",
        text_color: "#f8fafc",
        font_key: fontKey,
        radius_key: radiusKey,
        button_variant: buttonVariant,
        card_variant: cardVariant,
      },
      { onConflict: "site_id" }
    );

    await this.adminClient.from("site_hero").upsert(
      {
        site_id: siteId,
        headline: `Bienvenido a ${siteName}`,
        subheadline: `Creamos soluciones de alta calidad diseñadas para impulsar tu negocio.`,
        cta_text: "Contactar",
        cta_link: "#contacto",
        badge_text: "Lanzamiento",
      },
      { onConflict: "site_id" }
    );
  }
}
