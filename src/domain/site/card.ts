import { isSafeLink } from "./hero";

export const ALLOWED_CARD_ICONS = [
  "wrench",
  "cpu",
  "shield",
  "bolt",
  "rocket",
  "star",
  "chart",
  "heart",
] as const;
export type CardIconKey = (typeof ALLOWED_CARD_ICONS)[number];

export interface SiteCard {
  id?: string | undefined;
  siteId: string;
  title: string;
  description: string;
  iconKey: CardIconKey;
  badge?: string | undefined;
  linkUrl?: string | undefined;
  sortOrder: number;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export function isValidCardLink(url?: string | undefined): boolean {
  if (!url) return true;
  return isSafeLink(url);
}
