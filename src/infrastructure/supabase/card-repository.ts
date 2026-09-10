import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardIconKey, SiteCard } from "../../domain/site/card";
import {
  CardRepositoryError,
  type CardRepository,
} from "../../application/site/card-repository";

export class SupabaseCardRepository implements CardRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listCards(siteId: string): Promise<SiteCard[]> {
    try {
      const { data, error } = await this.client
        .from("site_cards")
        .select("*")
        .eq("site_id", siteId)
        .order("sort_order", { ascending: true });

      if (error || !Array.isArray(data)) throw new CardRepositoryError();

      return data.map((row: Record<string, unknown>) => ({
        id: row["id"] as string,
        siteId: row["site_id"] as string,
        title: row["title"] as string,
        description: row["description"] as string,
        iconKey: row["icon_key"] as CardIconKey,
        badge: typeof row["badge"] === "string" ? row["badge"] : undefined,
        linkUrl: typeof row["link_url"] === "string" ? row["link_url"] : undefined,
        sortOrder: typeof row["sort_order"] === "number" ? row["sort_order"] : 0,
        createdAt: typeof row["created_at"] === "string" ? row["created_at"] : undefined,
        updatedAt: typeof row["updated_at"] === "string" ? row["updated_at"] : undefined,
      }));
    } catch {
      throw new CardRepositoryError();
    }
  }

  async saveCard(card: SiteCard): Promise<void> {
    try {
      const payload: Record<string, unknown> = {
        site_id: card.siteId,
        title: card.title,
        description: card.description,
        icon_key: card.iconKey,
        badge: card.badge ?? null,
        link_url: card.linkUrl ?? null,
        sort_order: card.sortOrder,
        updated_at: new Date().toISOString(),
      };
      if (card.id) {
        payload["id"] = card.id;
      }

      const { error } = await this.client.from("site_cards").upsert(payload);
      if (error) throw new CardRepositoryError();
    } catch {
      throw new CardRepositoryError();
    }
  }

  async deleteCard(siteId: string, cardId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from("site_cards")
        .delete()
        .eq("site_id", siteId)
        .eq("id", cardId);

      if (error) throw new CardRepositoryError();
    } catch {
      throw new CardRepositoryError();
    }
  }
}
