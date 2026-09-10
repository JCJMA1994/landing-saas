import { describe, expect, it } from "vitest";
import { classifyHost, normalizeHost } from "../../src/domain/tenant/host";
describe("host boundary", () => {
  it.each(["LOCALHOST:4321", "localhost.", "localhost"])("normalizes %s", (host) => expect(normalizeHost(host)).toBe("localhost"));
  it.each([null, "", "evil.test,localhost", "localhost/path", "user@localhost", "localhost:abc", "localhost:0", "localhost:65536", "localhost.evil.test", "https://localhost", " localHost", "localhost\\evil"])("fails closed for %s", (host) => expect(classifyHost(host, "localhost")).toEqual({ kind: "unknown" }));
  it("does not infer tenant ownership from a subdomain", () => expect(classifyHost("customer.example.test", "example.test")).toEqual({ kind: "unknown" }));
  it("returns only platform context for the configured host", () => expect(classifyHost("example.test:443", "example.test")).toEqual({ kind: "platform" }));
});
