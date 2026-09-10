import type { VerifiedUser } from "../auth/admin-access";
import type { AccessibleSite, SiteRepository } from "./site-repository";

export async function listAccessibleSites(
  user: VerifiedUser | null,
  repository: SiteRepository,
): Promise<AccessibleSite[]> {
  if (!user) throw new Error("Authentication required.");
  return repository.listAccessible();
}
