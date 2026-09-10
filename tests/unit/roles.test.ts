import { describe, expect, it } from "vitest";
import {
  canAssignRole,
  canManageMembers,
  canMutateMember,
  canViewAuditLog,
  isTenantRole,
} from "../../src/domain/tenant/roles";

describe("tenant roles domain logic", () => {
  it("validates valid tenant roles", () => {
    expect(isTenantRole("owner")).toBe(true);
    expect(isTenantRole("admin")).toBe(true);
    expect(isTenantRole("editor")).toBe(true);
    expect(isTenantRole("viewer")).toBe(true);
    expect(isTenantRole("superadmin")).toBe(false);
    expect(isTenantRole(null)).toBe(false);
    expect(isTenantRole(123)).toBe(false);
  });

  it("checks member management privileges", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("editor")).toBe(false);
    expect(canManageMembers("viewer")).toBe(false);
  });

  it("authorizes role assignments", () => {
    // Owner can assign any role
    expect(canAssignRole("owner", "owner")).toBe(true);
    expect(canAssignRole("owner", "admin")).toBe(true);
    expect(canAssignRole("owner", "editor")).toBe(true);
    expect(canAssignRole("owner", "viewer")).toBe(true);

    // Admin cannot assign owner role
    expect(canAssignRole("admin", "owner")).toBe(false);
    expect(canAssignRole("admin", "admin")).toBe(true);
    expect(canAssignRole("admin", "editor")).toBe(true);
    expect(canAssignRole("admin", "viewer")).toBe(true);

    // Editor and viewer cannot assign any role
    expect(canAssignRole("editor", "viewer")).toBe(false);
    expect(canAssignRole("viewer", "viewer")).toBe(false);
  });

  it("authorizes member mutations", () => {
    // Owner can mutate any role
    expect(canMutateMember("owner", "owner")).toBe(true);
    expect(canMutateMember("owner", "admin")).toBe(true);

    // Admin cannot mutate owner
    expect(canMutateMember("admin", "owner")).toBe(false);
    expect(canMutateMember("admin", "admin")).toBe(true);
    expect(canMutateMember("admin", "editor")).toBe(true);

    // Editor/viewer cannot mutate any member
    expect(canMutateMember("editor", "editor")).toBe(false);
  });

  it("authorizes audit log viewing", () => {
    expect(canViewAuditLog("owner")).toBe(true);
    expect(canViewAuditLog("admin")).toBe(true);
    expect(canViewAuditLog("editor")).toBe(false);
    expect(canViewAuditLog("viewer")).toBe(false);
  });
});
