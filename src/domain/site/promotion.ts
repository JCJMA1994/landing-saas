export interface SitePromotion {
  id?: string | undefined;
  siteId: string;
  title: string;
  description: string;
  discountLabel?: string | undefined;
  couponCode?: string | undefined;
  startsAt?: string | undefined;
  endsAt?: string | undefined;
  isActive: boolean;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export function isPromotionDateValid(startsAt?: string | undefined, endsAt?: string | undefined): boolean {
  if (!startsAt || !endsAt) return true;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (isNaN(start) || isNaN(end)) return false;
  return end > start;
}
