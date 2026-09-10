import type { SupabaseClient } from "@supabase/supabase-js";
import { type PlatformPalette, FALLBACK_SYSTEM_PALETTES } from "../../domain/site/palette";

export class SupabasePaletteRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listPalettes(): Promise<PlatformPalette[]> {
    try {
      const { data, error } = await this.client
        .from("platform_palettes")
        .select("*")
        .order("created_at", { ascending: true });

      if (error || !data || data.length === 0) {
        return FALLBACK_SYSTEM_PALETTES;
      }

      return data.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description ?? undefined,
        primaryColor: r.primary_color,
        secondaryColor: r.secondary_color,
        accentColor: r.accent_color,
        backgroundColor: r.background_color,
        textColor: r.text_color,
        isSystem: Boolean(r.is_system),
        createdAt: r.created_at,
      }));
    } catch {
      return FALLBACK_SYSTEM_PALETTES;
    }
  }

  async createPalette(
    palette: Omit<PlatformPalette, "id" | "createdAt">
  ): Promise<PlatformPalette | null> {
    const { data, error } = await this.client
      .from("platform_palettes")
      .insert({
        name: palette.name,
        description: palette.description ?? null,
        primary_color: palette.primaryColor,
        secondary_color: palette.secondaryColor,
        accent_color: palette.accentColor,
        background_color: palette.backgroundColor,
        text_color: palette.textColor,
        is_system: false,
      })
      .select()
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description ?? undefined,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      accentColor: data.accent_color,
      backgroundColor: data.background_color,
      textColor: data.text_color,
      isSystem: Boolean(data.is_system),
      createdAt: data.created_at,
    };
  }

  async deletePalette(id: string): Promise<boolean> {
    const { error } = await this.client
      .from("platform_palettes")
      .delete()
      .eq("id", id)
      .eq("is_system", false);

    return !error;
  }
}
