import type { SiteTheme } from "../../domain/site/theme";

export interface ThemeRepository {
  getTheme(siteId: string): Promise<SiteTheme | null>;
  saveTheme(theme: SiteTheme): Promise<void>;
}

export class ThemeRepositoryError extends Error {
  constructor(message = "Theme data is temporarily unavailable.") {
    super(message);
    this.name = "ThemeRepositoryError";
  }
}
