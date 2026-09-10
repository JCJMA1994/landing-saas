import { describe, expect, it, vi } from "vitest";
import { listAccessibleSites } from "../../src/application/sites/list-accessible-sites";
import { SiteRepositoryError } from "../../src/application/sites/site-repository";
import { SupabaseSiteRepository } from "../../src/infrastructure/supabase/site-repository";

describe("listAccessibleSites", () => {
  it("requires a network-verified user before querying", async () => {
    const repository = { listAccessible: vi.fn() };

    await expect(listAccessibleSites(null, repository)).rejects.toThrow("Authentication required.");
    expect(repository.listAccessible).not.toHaveBeenCalled();
  });

  it("lists sites without accepting a tenant or site identifier", async () => {
    const sites = [{ id: "site-1", name: "North Shop", slug: "north-shop" }];
    const repository = { listAccessible: vi.fn().mockResolvedValue(sites) };

    await expect(listAccessibleSites({ id: "user-1" }, repository)).resolves.toEqual(sites);
    expect(repository.listAccessible).toHaveBeenCalledWith();
  });
});

describe("SupabaseSiteRepository", () => {
  it("maps RLS-scoped rows", async () => {
    const repository = new SupabaseSiteRepository(async () => ({
      data: [{ id: "site-1", name: " North Shop ", slug: "north-shop" }],
      error: null,
    }));

    await expect(repository.listAccessible()).resolves.toEqual([
      { id: "site-1", name: "North Shop", slug: "north-shop" },
    ]);
  });

  it("converts provider and malformed-data failures to a safe repository error", async () => {
    const providerFailure = new SupabaseSiteRepository(async () => ({ data: null, error: { message: "secret" } }));
    const malformedRows = new SupabaseSiteRepository(async () => ({ data: [{ id: 4 }], error: null }));

    await expect(providerFailure.listAccessible()).rejects.toBeInstanceOf(SiteRepositoryError);
    await expect(malformedRows.listAccessible()).rejects.toBeInstanceOf(SiteRepositoryError);
  });

  it("converts a thrown transport failure to a safe repository error", async () => {
    const repository = new SupabaseSiteRepository(async () => { throw new Error("network detail"); });

    await expect(repository.listAccessible()).rejects.toEqual(new SiteRepositoryError());
  });
});
