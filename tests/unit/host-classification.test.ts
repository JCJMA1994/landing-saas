import { describe, expect, it } from "vitest";
import {
  classifyRoutingHost,
  classifyHost,
} from "../../src/domain/tenant/host";

describe("Host Classification & Routing Hints", () => {
  const platformHost = "landingsaas.com";

  it("preserves Phase 0 security invariant: classifyHost does not grant tenant access", () => {
    expect(classifyHost("customer.landingsaas.com", platformHost)).toEqual({ kind: "unknown" });
    expect(classifyHost("landingsaas.com:443", platformHost)).toEqual({ kind: "platform" });
  });

  it("classifies direct platform host", () => {
    expect(classifyRoutingHost("landingsaas.com", platformHost)).toEqual({ kind: "platform" });
    expect(classifyRoutingHost("LANDINGSAAS.COM:443", platformHost)).toEqual({ kind: "platform" });
  });

  it("classifies reserved platform subdomains as platform context", () => {
    expect(classifyRoutingHost("www.landingsaas.com", platformHost)).toEqual({ kind: "platform" });
    expect(classifyRoutingHost("admin.landingsaas.com", platformHost)).toEqual({ kind: "platform" });
    expect(classifyRoutingHost("app.landingsaas.com", platformHost)).toEqual({ kind: "platform" });
    expect(classifyRoutingHost("api.landingsaas.com", platformHost)).toEqual({ kind: "platform" });
  });

  it("classifies valid tenant subdomains for public routing", () => {
    expect(classifyRoutingHost("taller-rayo.landingsaas.com", platformHost)).toEqual({
      kind: "subdomain",
      slug: "taller-rayo",
    });
    expect(classifyRoutingHost("malleret-auto.landingsaas.com:4321", platformHost)).toEqual({
      kind: "subdomain",
      slug: "malleret-auto",
    });
  });

  it("rejects multi-level or malformed subdomains", () => {
    expect(classifyRoutingHost("nested.sub.landingsaas.com", platformHost)).toEqual({
      kind: "unknown",
    });
    expect(classifyRoutingHost(".landingsaas.com", platformHost)).toEqual({
      kind: "unknown",
    });
  });

  it("classifies external verified custom domains", () => {
    expect(classifyRoutingHost("taller-rayo.pe", platformHost)).toEqual({
      kind: "custom_domain",
      domain: "taller-rayo.pe",
    });
    expect(classifyRoutingHost("landing.malleret.com:443", platformHost)).toEqual({
      kind: "custom_domain",
      domain: "landing.malleret.com",
    });
  });

  it("fails closed on invalid host headers or attacks", () => {
    expect(classifyRoutingHost(null, platformHost)).toEqual({ kind: "unknown" });
    expect(classifyRoutingHost("", platformHost)).toEqual({ kind: "unknown" });
    expect(classifyRoutingHost("evil.test,landingsaas.com", platformHost)).toEqual({ kind: "unknown" });
    expect(classifyRoutingHost("localhost/path", platformHost)).toEqual({ kind: "unknown" });
    expect(classifyRoutingHost("user@landingsaas.com", platformHost)).toEqual({ kind: "unknown" });
    expect(classifyRoutingHost("landingsaas.com:abc", platformHost)).toEqual({ kind: "unknown" });
    expect(classifyRoutingHost("landingsaas.com:70000", platformHost)).toEqual({ kind: "unknown" });
  });
});
