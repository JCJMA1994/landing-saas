import type { VerifiedUser } from "../auth/admin-access";
import {
  canAssignRole,
  canManageMembers,
  canMutateMember,
  type TenantRole,
} from "../../domain/tenant/roles";
import type { MemberRepository, TenantMember } from "./member-repository";
import type { AuditLogGateway } from "../audit/audit-gateway";

export class MemberAuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "MemberAuthorizationError";
  }
}

export class LastOwnerProtectionError extends Error {
  constructor(message = "A tenant must have at least one owner.") {
    super(message);
    this.name = "LastOwnerProtectionError";
  }
}

export async function listMembersUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  repo: MemberRepository,
): Promise<TenantMember[]> {
  if (!actor) throw new MemberAuthorizationError("Authentication required.");
  const actorMembership = await repo.getMember(tenantId, actor.id);
  if (!actorMembership) throw new MemberAuthorizationError();
  return repo.listMembers(tenantId);
}

export async function assignMemberUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  targetUserId: string,
  newRole: TenantRole,
  repo: MemberRepository,
  audit: AuditLogGateway,
): Promise<void> {
  if (!actor) throw new MemberAuthorizationError("Authentication required.");
  const actorMembership = await repo.getMember(tenantId, actor.id);
  if (!actorMembership || !canManageMembers(actorMembership.role)) {
    throw new MemberAuthorizationError();
  }
  if (!canAssignRole(actorMembership.role, newRole)) {
    throw new MemberAuthorizationError("Cannot assign role with higher privilege.");
  }

  const existingMember = await repo.getMember(tenantId, targetUserId);
  if (existingMember) {
    if (!canMutateMember(actorMembership.role, existingMember.role)) {
      throw new MemberAuthorizationError("Cannot modify member with equal or higher privilege.");
    }
    if (existingMember.role === "owner" && newRole !== "owner") {
      const ownerCount = await repo.countOwners(tenantId);
      if (ownerCount <= 1) {
        throw new LastOwnerProtectionError();
      }
    }
  }

  await repo.upsertMember({ tenantId, userId: targetUserId, role: newRole });
  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: existingMember ? "member.updated" : "member.added",
    resourceType: "tenant_member",
    resourceId: targetUserId,
    metadata: {
      role: newRole,
      previousRole: existingMember?.role ?? null,
    },
  });
}

export async function removeMemberUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  targetUserId: string,
  repo: MemberRepository,
  audit: AuditLogGateway,
): Promise<void> {
  if (!actor) throw new MemberAuthorizationError("Authentication required.");
  const actorMembership = await repo.getMember(tenantId, actor.id);
  if (!actorMembership || !canManageMembers(actorMembership.role)) {
    throw new MemberAuthorizationError();
  }

  const targetMember = await repo.getMember(tenantId, targetUserId);
  if (!targetMember) return;

  if (!canMutateMember(actorMembership.role, targetMember.role)) {
    throw new MemberAuthorizationError("Cannot remove member with equal or higher privilege.");
  }

  if (targetMember.role === "owner") {
    const ownerCount = await repo.countOwners(tenantId);
    if (ownerCount <= 1) {
      throw new LastOwnerProtectionError();
    }
  }

  await repo.removeMember(tenantId, targetUserId);
  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: "member.removed",
    resourceType: "tenant_member",
    resourceId: targetUserId,
    metadata: {
      removedRole: targetMember.role,
    },
  });
}
