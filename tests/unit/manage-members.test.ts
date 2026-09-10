import { describe, expect, it, vi } from "vitest";
import {
  assignMemberUseCase,
  listMembersUseCase,
  removeMemberUseCase,
  MemberAuthorizationError,
  LastOwnerProtectionError,
} from "../../src/application/members/manage-members";
import type { MemberRepository, TenantMember } from "../../src/application/members/member-repository";
import type { AuditLogGateway } from "../../src/application/audit/audit-gateway";

const mockTenantId = "10000000-0000-0000-0000-000000000001";
const ownerUser = { id: "00000000-0000-0000-0000-000000000001" };
const adminUser = { id: "00000000-0000-0000-0000-000000000002" };
const editorUser = { id: "00000000-0000-0000-0000-000000000003" };
const targetUser = "00000000-0000-0000-0000-000000000004";

function createMockRepo(overrides: Partial<MemberRepository> = {}): MemberRepository {
  return {
    listMembers: vi.fn().mockResolvedValue([]),
    getMember: vi.fn().mockImplementation(async (_tenantId: string, userId: string) => {
      if (userId === ownerUser.id) return { tenantId: mockTenantId, userId, role: "owner", createdAt: "2026-01-01" };
      if (userId === adminUser.id) return { tenantId: mockTenantId, userId, role: "admin", createdAt: "2026-01-01" };
      if (userId === editorUser.id) return { tenantId: mockTenantId, userId, role: "editor", createdAt: "2026-01-01" };
      return null;
    }),
    countOwners: vi.fn().mockResolvedValue(1),
    upsertMember: vi.fn().mockResolvedValue(undefined),
    removeMember: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockAudit(): AuditLogGateway {
  return {
    record: vi.fn().mockResolvedValue(undefined),
    listRecent: vi.fn().mockResolvedValue([]),
  };
}

describe("manage members use cases", () => {
  describe("listMembersUseCase", () => {
    it("throws when actor is not authenticated", async () => {
      const repo = createMockRepo();
      await expect(listMembersUseCase(null, mockTenantId, repo)).rejects.toThrow(MemberAuthorizationError);
    });

    it("throws when actor is not a member of the tenant", async () => {
      const repo = createMockRepo({ getMember: vi.fn().mockResolvedValue(null) });
      await expect(listMembersUseCase({ id: "outsider" }, mockTenantId, repo)).rejects.toThrow(
        MemberAuthorizationError,
      );
    });

    it("returns member list for valid tenant member", async () => {
      const members: TenantMember[] = [
        { tenantId: mockTenantId, userId: ownerUser.id, role: "owner", createdAt: "2026-01-01" },
      ];
      const repo = createMockRepo({ listMembers: vi.fn().mockResolvedValue(members) });
      const result = await listMembersUseCase(ownerUser, mockTenantId, repo);
      expect(result).toEqual(members);
    });
  });

  describe("assignMemberUseCase", () => {
    it("prevents non-managers from assigning members", async () => {
      const repo = createMockRepo();
      const audit = createMockAudit();
      await expect(
        assignMemberUseCase(editorUser, mockTenantId, targetUser, "viewer", repo, audit),
      ).rejects.toThrow(MemberAuthorizationError);
      expect(repo.upsertMember).not.toHaveBeenCalled();
    });

    it("prevents admin from assigning owner role", async () => {
      const repo = createMockRepo();
      const audit = createMockAudit();
      await expect(
        assignMemberUseCase(adminUser, mockTenantId, targetUser, "owner", repo, audit),
      ).rejects.toThrow(MemberAuthorizationError);
      expect(repo.upsertMember).not.toHaveBeenCalled();
    });

    it("allows owner to assign any role and writes audit log", async () => {
      const repo = createMockRepo();
      const audit = createMockAudit();
      await assignMemberUseCase(ownerUser, mockTenantId, targetUser, "editor", repo, audit);

      expect(repo.upsertMember).toHaveBeenCalledWith({
        tenantId: mockTenantId,
        userId: targetUser,
        role: "editor",
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          actorUserId: ownerUser.id,
          action: "member.added",
          resourceId: targetUser,
        }),
      );
    });

    it("protects last owner from being demoted", async () => {
      const repo = createMockRepo({
        countOwners: vi.fn().mockResolvedValue(1),
        getMember: vi.fn().mockImplementation(async (_t, uid) => {
          if (uid === ownerUser.id) {
            return { tenantId: mockTenantId, userId: ownerUser.id, role: "owner", createdAt: "2026-01-01" };
          }
          return null;
        }),
      });
      const audit = createMockAudit();

      await expect(
        assignMemberUseCase(ownerUser, mockTenantId, ownerUser.id, "editor", repo, audit),
      ).rejects.toThrow(LastOwnerProtectionError);
      expect(repo.upsertMember).not.toHaveBeenCalled();
    });
  });

  describe("removeMemberUseCase", () => {
    it("prevents admin from removing an owner", async () => {
      const repo = createMockRepo();
      const audit = createMockAudit();

      await expect(
        removeMemberUseCase(adminUser, mockTenantId, ownerUser.id, repo, audit),
      ).rejects.toThrow(MemberAuthorizationError);
      expect(repo.removeMember).not.toHaveBeenCalled();
    });

    it("protects last owner from being removed", async () => {
      const repo = createMockRepo({ countOwners: vi.fn().mockResolvedValue(1) });
      const audit = createMockAudit();

      await expect(
        removeMemberUseCase(ownerUser, mockTenantId, ownerUser.id, repo, audit),
      ).rejects.toThrow(LastOwnerProtectionError);
      expect(repo.removeMember).not.toHaveBeenCalled();
    });

    it("allows owner to remove another member and writes audit log", async () => {
      const repo = createMockRepo();
      const audit = createMockAudit();

      await removeMemberUseCase(ownerUser, mockTenantId, editorUser.id, repo, audit);

      expect(repo.removeMember).toHaveBeenCalledWith(mockTenantId, editorUser.id);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          actorUserId: ownerUser.id,
          action: "member.removed",
          resourceId: editorUser.id,
        }),
      );
    });
  });
});
