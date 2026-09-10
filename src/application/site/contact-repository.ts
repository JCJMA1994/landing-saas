import type { SiteContacts } from "../../domain/site/contact";

export interface ContactRepository {
  getContacts(siteId: string): Promise<SiteContacts | null>;
  saveContacts(contacts: SiteContacts): Promise<void>;
}

export class ContactRepositoryError extends Error {
  constructor(message = "Contacts are temporarily unavailable.") {
    super(message);
    this.name = "ContactRepositoryError";
  }
}
