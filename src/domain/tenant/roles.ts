export type TenantRole = "owner" | "admin" | "editor" | "viewer";

export const TENANT_ROLES = ["owner", "admin", "editor", "viewer"] as const;

export function isTenantRole(value: unknown): value is TenantRole {
  return typeof value === "string" && (TENANT_ROLES as readonly string[]).includes(value);
}

export function canManageMembers(actorRole: TenantRole): boolean {
  return actorRole === "owner" || actorRole === "admin";
}

export function canAssignRole(actorRole: TenantRole, targetRole: TenantRole): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return targetRole !== "owner";
  return false;
}

export function canMutateMember(actorRole: TenantRole, targetCurrentRole: TenantRole): boolean {
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return targetCurrentRole !== "owner";
  return false;
}

export function canViewAuditLog(actorRole: TenantRole): boolean {
  return actorRole === "owner" || actorRole === "admin";
}

export function canEditContent(actorRole: TenantRole): boolean {
  return actorRole === "owner" || actorRole === "admin" || actorRole === "editor";
}

