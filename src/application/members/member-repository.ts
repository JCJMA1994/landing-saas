import type { TenantRole } from "../../domain/tenant/roles";

export interface TenantMember {
  tenantId: string;
  userId: string;
  role: TenantRole;
  createdAt: string;
}

export interface MemberRepository {
  listMembers(tenantId: string): Promise<TenantMember[]>;
  getMember(tenantId: string, userId: string): Promise<TenantMember | null>;
  countOwners(tenantId: string): Promise<number>;
  upsertMember(member: { tenantId: string; userId: string; role: TenantRole }): Promise<void>;
  removeMember(tenantId: string, userId: string): Promise<void>;
}

export class MemberRepositoryError extends Error {
  constructor(message = "Members are temporarily unavailable.") {
    super(message);
    this.name = "MemberRepositoryError";
  }
}
