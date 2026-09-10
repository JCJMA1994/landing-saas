export interface VerifiedUser {
  id: string;
}

export type AdminAccessDecision = "allow" | "redirect-login";

export function decideAdminAccess(pathname: string, user: VerifiedUser | null): AdminAccessDecision {
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isAdminRoute || pathname === "/admin/login") return "allow";
  return user ? "allow" : "redirect-login";
}
