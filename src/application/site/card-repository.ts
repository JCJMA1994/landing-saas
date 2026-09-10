import type { SiteCard } from "../../domain/site/card";

export interface CardRepository {
  listCards(siteId: string): Promise<SiteCard[]>;
  saveCard(card: SiteCard): Promise<void>;
  deleteCard(siteId: string, cardId: string): Promise<void>;
}

export class CardRepositoryError extends Error {
  constructor(message = "Cards are temporarily unavailable.") {
    super(message);
    this.name = "CardRepositoryError";
  }
}
