import { describe, expect, it } from "vitest";
import { parseServerEnv } from "../../src/infrastructure/config/env";
const base = { APP_ENV: "development", APP_HOSTNAME: "localhost", SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test" };
const jwt = (role: string) => "header." + Buffer.from(JSON.stringify({ role })).toString("base64url") + ".signature";
describe("server environment", () => {
  it("accepts local development and publishable keys", () => expect(parseServerEnv(base).appHostname).toBe("localhost"));
  it("supports the local CLI's legacy anon JWT", () => expect(parseServerEnv({ ...base, SUPABASE_PUBLISHABLE_KEY: jwt("anon") }).supabaseKey).toBe(jwt("anon")));
  it.each(["service_role", "authenticated"])("rejects %s JWT keys", (role) => expect(() => parseServerEnv({ ...base, SUPABASE_PUBLISHABLE_KEY: jwt(role) })).toThrow());
  it.each(["sb_secret_private", "arbitrary", ""])("rejects unsafe/invalid keys", (key) => expect(() => parseServerEnv({ ...base, SUPABASE_PUBLISHABLE_KEY: key })).toThrow());
  it.each(["staging", "production"])("requires HTTPS in %s", (appEnv) => expect(() => parseServerEnv({ ...base, APP_ENV: appEnv })).toThrow());
  it("rejects HTTP for non-local development servers", () => expect(() => parseServerEnv({ ...base, SUPABASE_URL: "http://example.test" })).toThrow());
  it.each(["https://user:pass@example.test", "https://example.test/api", "https://example.test?key=x", "https://example.test/#fragment"])("rejects unsafe URL %s", (url) => expect(() => parseServerEnv({ ...base, SUPABASE_URL: url })).toThrow());
  it.each(["example.test:4321", "https://example.test", "", "*.example.test"])("rejects hostname %s", (host) => expect(() => parseServerEnv({ ...base, APP_HOSTNAME: host })).toThrow());
  it("requires an explicit deployment environment", () => expect(() => parseServerEnv({ ...base, APP_ENV: undefined })).toThrow());
});
