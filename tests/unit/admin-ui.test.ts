import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("admin login UI", () => {
  it("uses an accessible zero-JavaScript action form with generic failure copy", async () => {
    const page = await readFile(new URL("../../src/pages/admin/login.astro", import.meta.url), "utf8");

    expect(page).toContain('action={actions.login}');
    expect(page).toContain('autocomplete="email"');
    expect(page).toContain('autocomplete="current-password"');
    expect(page).toContain('role="alert"');
    expect(page).toContain("Invalid email or password.");
    expect(page).not.toContain("client:");
  });
});
