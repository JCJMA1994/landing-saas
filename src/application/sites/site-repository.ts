export interface AccessibleSite {
  id: string;
  name: string;
  slug: string;
}

export interface SiteRepository {
  listAccessible(): Promise<AccessibleSite[]>;
}

export class SiteRepositoryError extends Error {
  constructor() {
    super("Sites are temporarily unavailable.");
    this.name = "SiteRepositoryError";
  }
}
