import { describe, expect, it } from "vitest";
import {
  isValidDomain,
  generateVerificationToken,
  getDnsChallengeRecords,
} from "../../src/domain/domain/site-domain";

describe("Site Domain Entity & Validation", () => {
  it("validates legitimate domain names", () => {
    expect(isValidDomain("example.com")).toBe(true);
    expect(isValidDomain("landing.malleret.com")).toBe(true);
    expect(isValidDomain("taller-rayo.pe")).toBe(true);
    expect(isValidDomain("sub.domain.co.uk")).toBe(true);
  });

  it("rejects invalid domains, IPs, and localhost", () => {
    expect(isValidDomain(null)).toBe(false);
    expect(isValidDomain("")).toBe(false);
    expect(isValidDomain("localhost")).toBe(false);
    expect(isValidDomain("site.localhost")).toBe(false);
    expect(isValidDomain("192.168.1.1")).toBe(false);
    expect(isValidDomain("127.0.0.1")).toBe(false);
    expect(isValidDomain("-invalid.com")).toBe(false);
    expect(isValidDomain("invalid-.com")).toBe(false);
    expect(isValidDomain("singlelabel")).toBe(false);
    expect(isValidDomain("http://example.com")).toBe(false);
    expect(isValidDomain("example.com/path")).toBe(false);
    expect(isValidDomain("evil@example.com")).toBe(false);
  });

  it("generates unique cryptographically prefixed verification tokens", () => {
    const token1 = generateVerificationToken();
    const token2 = generateVerificationToken();

    expect(token1).toMatch(/^saas-verify-[0-9a-f-]{36}$/);
    expect(token2).toMatch(/^saas-verify-[0-9a-f-]{36}$/);
    expect(token1).not.toBe(token2);
  });

  it("computes accurate DNS challenge records for TXT and CNAME", () => {
    const domain = "taller.malleret.com";
    const token = "saas-verify-12345";
    const records = getDnsChallengeRecords(domain, token, "cname.landingsaas.com");

    expect(records.txt.type).toBe("TXT");
    expect(records.txt.host).toBe("_saas-challenge.taller.malleret.com");
    expect(records.txt.target).toBe(token);
    expect(records.txt.instruction).toContain("_saas-challenge.taller.malleret.com");

    expect(records.cname.type).toBe("CNAME");
    expect(records.cname.host).toBe("taller.malleret.com");
    expect(records.cname.target).toBe("cname.landingsaas.com");
  });
});
