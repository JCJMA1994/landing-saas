import { normalizeHost } from "../../domain/tenant/host";
export interface ServerEnv { appEnv: "development" | "staging" | "production"; appHostname: string; supabaseUrl: string; supabaseKey: string; }

function isPublicKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  const parts = key.split(".");
  if (parts.length !== 3 || !parts[1]) return false;
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload === "object" && payload !== null && "role" in payload && payload.role === "anon";
  } catch { return false; }
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const appEnv = source["APP_ENV"];
  if (appEnv !== "development" && appEnv !== "staging" && appEnv !== "production") throw new Error("APP_ENV must be development, staging, or production.");
  const appHostname = source["APP_HOSTNAME"] ?? "";
  if (normalizeHost(appHostname) !== appHostname || appHostname.includes(":")) throw new Error("APP_HOSTNAME must be a canonical hostname without a port.");
  let url: URL;
  try { url = new URL(source["SUPABASE_URL"] ?? ""); } catch { throw new Error("SUPABASE_URL must be an absolute URL."); }
  const localHttp = appEnv === "development" && ["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol === "http:";
  if ((!localHttp && url.protocol !== "https:") || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("SUPABASE_URL must be a clean HTTPS origin (local HTTP allowed in development).");
  const supabaseKey = source["SUPABASE_PUBLISHABLE_KEY"] ?? "";
  if (!isPublicKey(supabaseKey)) throw new Error("SUPABASE_PUBLISHABLE_KEY must be a publishable key or legacy anon JWT.");
  return { appEnv, appHostname, supabaseUrl: url.origin, supabaseKey };
}
