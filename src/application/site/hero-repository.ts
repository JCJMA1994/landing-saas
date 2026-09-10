import type { SiteHero } from "../../domain/site/hero";

export interface HeroRepository {
  getHero(siteId: string): Promise<SiteHero | null>;
  saveHero(hero: SiteHero): Promise<void>;
}

export class HeroRepositoryError extends Error {
  constructor(message = "Hero data is temporarily unavailable.") {
    super(message);
    this.name = "HeroRepositoryError";
  }
}
