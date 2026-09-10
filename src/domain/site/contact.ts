export interface SiteContacts {
  siteId: string;
  whatsappNumber?: string | undefined;
  whatsappMessage?: string | undefined;
  instagramHandle?: string | undefined;
  facebookUrl?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  updatedAt?: string | undefined;
}

const E164_PHONE_REGEX = /^\+[1-9][0-9]{6,14}$/;
const INSTAGRAM_HANDLE_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

export function isValidE164Phone(number: string): boolean {
  return E164_PHONE_REGEX.test(number.trim());
}

export function isValidInstagramHandle(handle: string): boolean {
  return INSTAGRAM_HANDLE_REGEX.test(handle.trim());
}

export function generateWhatsAppUrl(number: string, message?: string | undefined): string {
  const cleanNumber = number.replace(/[^0-9]/g, "");
  if (!cleanNumber) return "";
  const base = `https://wa.me/${cleanNumber}`;
  if (!message || message.trim().length === 0) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}
