import type { SitePromotion } from "../../domain/site/promotion";

export interface PromotionRepository {
  listPromotions(siteId: string): Promise<SitePromotion[]>;
  savePromotion(promotion: SitePromotion): Promise<void>;
  deletePromotion(siteId: string, promotionId: string): Promise<void>;
}

export class PromotionRepositoryError extends Error {
  constructor(message = "Promotions are temporarily unavailable.") {
    super(message);
    this.name = "PromotionRepositoryError";
  }
}
