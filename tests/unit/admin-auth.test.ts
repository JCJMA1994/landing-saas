import { describe, expect, it, vi } from "vitest";
import { loginWithPassword, logoutLocally } from "../../src/application/auth/session";
import { decideAdminAccess } from "../../src/application/auth/admin-access";

describe("admin authentication", () => {
  it("returns a generic login failure without exposing the provider error", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({ error: { message: "provider detail" } });

    await expect(loginWithPassword({ signInWithPassword }, "person@example.com", "secret123"))
      .resolves.toEqual({ ok: false, error: "Invalid email or password." });
  });

  it("uses local scope when signing out an authenticated user", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });

    await expect(logoutLocally({ signOut }, { id: "user-1" })).resolves.toEqual({ ok: true });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does not call the auth provider when logout has no verified user", async () => {
    const signOut = vi.fn();

    await expect(logoutLocally({ signOut }, null)).resolves.toEqual({ ok: true });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("guards admin pages while keeping the login page public", () => {
    expect(decideAdminAccess("/admin", null)).toBe("redirect-login");
    expect(decideAdminAccess("/admin/sites", null)).toBe("redirect-login");
    expect(decideAdminAccess("/admin/login", null)).toBe("allow");
    expect(decideAdminAccess("/admin", { id: "user-1" })).toBe("allow");
    expect(decideAdminAccess("/administrator", null)).toBe("allow");
  });
});
