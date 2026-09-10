import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteTheme, ThemeButtonVariant, ThemeCardVariant, ThemeFont, ThemeRadius } from "../../domain/site/theme";
import {
  ThemeRepositoryError,
  type ThemeRepository,
} from "../../application/site/theme-repository";

export class SupabaseThemeRepository implements ThemeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getTheme(siteId: string): Promise<SiteTheme | null> {
    try {
      const { data, error } = await this.client
        .from("site_theme")
        .select("*")
        .eq("site_id", siteId)
        .maybeSingle();

      if (error) throw new ThemeRepositoryError();
      if (!data) return null;

      const record = data as Record<string, unknown>;
      return {
        siteId: record["site_id"] as string,
        primaryColor: record["primary_color"] as string,
        secondaryColor: record["secondary_color"] as string,
        accentColor: record["accent_color"] as string,
        backgroundColor: record["background_color"] as string,
        textColor: record["text_color"] as string,
        fontKey: record["font_key"] as ThemeFont,
        radiusKey: record["radius_key"] as ThemeRadius,
        buttonVariant: record["button_variant"] as ThemeButtonVariant,
        cardVariant: record["card_variant"] as ThemeCardVariant,
        updatedAt: typeof record["updated_at"] === "string" ? record["updated_at"] : undefined,
      };
    } catch {
      throw new ThemeRepositoryError();
    }
  }

  async saveTheme(theme: SiteTheme): Promise<void> {
    try {
      const { error } = await this.client
        .from("site_theme")
        .upsert({
          site_id: theme.siteId,
          primary_color: theme.primaryColor,
          secondary_color: theme.secondaryColor,
          accent_color: theme.accentColor,
          background_color: theme.backgroundColor,
          text_color: theme.textColor,
          font_key: theme.fontKey,
          radius_key: theme.radiusKey,
          button_variant: theme.buttonVariant,
          card_variant: theme.cardVariant,
          updated_at: new Date().toISOString(),
        });

      if (error) throw new ThemeRepositoryError();
    } catch {
      throw new ThemeRepositoryError();
    }
  }
}
