import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteHero } from "../../domain/site/hero";
import {
  HeroRepositoryError,
  type HeroRepository,
} from "../../application/site/hero-repository";

export class SupabaseHeroRepository implements HeroRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getHero(siteId: string): Promise<SiteHero | null> {
    try {
      const { data, error } = await this.client
        .from("site_hero")
        .select("*")
        .eq("site_id", siteId)
        .maybeSingle();

      if (error) throw new HeroRepositoryError();
      if (!data) return null;

      const record = data as Record<string, unknown>;
      return {
        siteId: record["site_id"] as string,
        headline: record["headline"] as string,
        subheadline: record["subheadline"] as string,
        ctaText: record["cta_text"] as string,
        ctaLink: record["cta_link"] as string,
        badgeText: typeof record["badge_text"] === "string" ? record["badge_text"] : undefined,
        updatedAt: typeof record["updated_at"] === "string" ? record["updated_at"] : undefined,
      };
    } catch {
      throw new HeroRepositoryError();
    }
  }

  async saveHero(hero: SiteHero): Promise<void> {
    try {
      const { error } = await this.client
        .from("site_hero")
        .upsert({
          site_id: hero.siteId,
          headline: hero.headline,
          subheadline: hero.subheadline,
          cta_text: hero.ctaText,
          cta_link: hero.ctaLink,
          badge_text: hero.badgeText ?? null,
          updated_at: new Date().toISOString(),
        });

      if (error) throw new HeroRepositoryError();
    } catch {
      throw new HeroRepositoryError();
    }
  }
}
