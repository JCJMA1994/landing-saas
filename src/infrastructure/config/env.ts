import { normalizeHost } from "../../domain/tenant/host";
export interface ServerEnv { appEnv: "development" | "staging" | "production"; appHostname: string; supabaseUrl: string; supabaseKey: string; }

export interface ServerEnvSource {
  readonly [key: string]: unknown;
  readonly APP_ENV?: unknown;
  readonly APP_HOSTNAME?: unknown;
  readonly SUPABASE_URL?: unknown;
  readonly SUPABASE_PUBLISHABLE_KEY?: unknown;
}

function isPublicKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  const parts = key.split(".");
  if (parts.length !== 3 || !parts[1]) return false;
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload === "object" && payload !== null && "role" in payload && payload.role === "anon";
  } catch { return false; }
}

function latestString(
  key: "APP_ENV" | "APP_HOSTNAME" | "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY",
  sources: readonly ServerEnvSource[],
): string | undefined {
  let result: string | undefined;

  for (const source of sources) {
    const value = source[key];
    if (typeof value === "string") result = value;
  }

  return result;
}

export function parseServerEnv(...sources: readonly ServerEnvSource[]): ServerEnv {
  const appEnv = latestString("APP_ENV", sources);
  if (appEnv !== "development" && appEnv !== "staging" && appEnv !== "production") throw new Error("APP_ENV must be development, staging, or production.");
  const appHostname = latestString("APP_HOSTNAME", sources) ?? "";
  if (normalizeHost(appHostname) !== appHostname || appHostname.includes(":")) throw new Error("APP_HOSTNAME must be a canonical hostname without a port.");
  let url: URL;
  try { url = new URL(latestString("SUPABASE_URL", sources) ?? ""); } catch { throw new Error("SUPABASE_URL must be an absolute URL."); }
  const localHttp = appEnv === "development" && ["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol === "http:";
  if ((!localHttp && url.protocol !== "https:") || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("SUPABASE_URL must be a clean HTTPS origin (local HTTP allowed in development).");
  const supabaseKey = latestString("SUPABASE_PUBLISHABLE_KEY", sources) ?? "";
  if (!isPublicKey(supabaseKey)) throw new Error("SUPABASE_PUBLISHABLE_KEY must be a publishable key or legacy anon JWT.");
  return { appEnv, appHostname, supabaseUrl: url.origin, supabaseKey };
}
