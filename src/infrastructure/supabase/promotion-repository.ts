import type { SupabaseClient } from "@supabase/supabase-js";
import type { SitePromotion } from "../../domain/site/promotion";
import {
  PromotionRepositoryError,
  type PromotionRepository,
} from "../../application/site/promotion-repository";

export class SupabasePromotionRepository implements PromotionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listPromotions(siteId: string): Promise<SitePromotion[]> {
    try {
      const { data, error } = await this.client
        .from("site_promotions")
        .select("*")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(data)) throw new PromotionRepositoryError();

      return data.map((row: Record<string, unknown>) => ({
        id: row["id"] as string,
        siteId: row["site_id"] as string,
        title: row["title"] as string,
        description: row["description"] as string,
        discountLabel: typeof row["discount_label"] === "string" ? row["discount_label"] : undefined,
        couponCode: typeof row["coupon_code"] === "string" ? row["coupon_code"] : undefined,
        startsAt: typeof row["starts_at"] === "string" ? row["starts_at"] : undefined,
        endsAt: typeof row["ends_at"] === "string" ? row["ends_at"] : undefined,
        isActive: Boolean(row["is_active"]),
        createdAt: typeof row["created_at"] === "string" ? row["created_at"] : undefined,
        updatedAt: typeof row["updated_at"] === "string" ? row["updated_at"] : undefined,
      }));
    } catch {
      throw new PromotionRepositoryError();
    }
  }

  async savePromotion(promotion: SitePromotion): Promise<void> {
    try {
      const payload: Record<string, unknown> = {
        site_id: promotion.siteId,
        title: promotion.title,
        description: promotion.description,
        discount_label: promotion.discountLabel ?? null,
        coupon_code: promotion.couponCode ?? null,
        starts_at: promotion.startsAt ?? null,
        ends_at: promotion.endsAt ?? null,
        is_active: promotion.isActive,
        updated_at: new Date().toISOString(),
      };
      if (promotion.id) {
        payload["id"] = promotion.id;
      }

      const { error } = await this.client.from("site_promotions").upsert(payload);
      if (error) throw new PromotionRepositoryError();
    } catch {
      throw new PromotionRepositoryError();
    }
  }

  async deletePromotion(siteId: string, promotionId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from("site_promotions")
        .delete()
        .eq("site_id", siteId)
        .eq("id", promotionId);

      if (error) throw new PromotionRepositoryError();
    } catch {
      throw new PromotionRepositoryError();
    }
  }
}
