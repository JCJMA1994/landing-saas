export type HostContext = { kind: "platform" } | { kind: "unknown" };

export type HostRoutingContext =
  | { kind: "platform" }
  | { kind: "subdomain"; slug: string }
  | { kind: "custom_domain"; domain: string }
  | { kind: "unknown" };

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "admin",
  "app",
  "api",
  "auth",
  "mail",
  "cdn",
  "assets",
  "preview",
]);

// A host is a routing hint, never proof of identity or tenant membership.
export function normalizeHost(value: string | null): string | null {
  if (!value || !/^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/.test(value)) return null;
  const [rawHostname, port] = value.split(":");
  if (!rawHostname || (port && (Number(port) < 1 || Number(port) > 65535))) return null;
  const hostname = rawHostname.toLowerCase().replace(/\.$/, "");
  if (hostname.length > 253 || hostname.split(".").some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  return hostname;
}

export function classifyHost(host: string | null, platformHostname: string): HostContext {
  return normalizeHost(host) === platformHostname ? { kind: "platform" } : { kind: "unknown" };
}

/**
 * Classifies an incoming host for request routing purposes.
 * Note: Returned values are routing hints only; they never grant tenant permissions.
 */
export function classifyRoutingHost(
  host: string | null,
  platformHostname: string
): HostRoutingContext {
  const normalized = normalizeHost(host);
  if (!normalized) return { kind: "unknown" };

  const normPlatform = normalizeHost(platformHostname);
  if (!normPlatform) return { kind: "unknown" };

  // 1. Direct platform host match
  if (normalized === normPlatform) {
    return { kind: "platform" };
  }

  // 2. Subdomain check (e.g. `taller-rayo.example.com` or `taller-rayo.localhost`)
  const suffix = `.${normPlatform}`;
  if (normalized.endsWith(suffix)) {
    const prefix = normalized.slice(0, -suffix.length);
    // Disallow nested subdomains (e.g. a.b.example.com) for tenant site routing
    if (prefix.includes(".")) {
      return { kind: "unknown" };
    }
    if (RESERVED_SUBDOMAINS.has(prefix)) {
      return { kind: "platform" };
    }
    return { kind: "subdomain", slug: prefix };
  }

  // 3. Custom domain check: Must have at least 2 labels and valid TLD
  const labels = normalized.split(".");
  if (labels.length >= 2 && !normalized.endsWith(".localhost") && !normalized.endsWith(".local")) {
    const tld = labels[labels.length - 1];
    if (tld && /^[a-z]{2,}$/.test(tld)) {
      return { kind: "custom_domain", domain: normalized };
    }
  }

  return { kind: "unknown" };
}

