import { describe, expect, it, vi } from "vitest";
import { GET as getRobots } from "../../src/pages/robots.txt";
import { GET as getSitemap } from "../../src/pages/sitemap.xml";

describe("Dynamic Sitemap & Robots.txt Generation", () => {
  it("generates valid robots.txt with disallow directives and sitemap link", async () => {
    const mockRequest = {
      headers: {
        get: (h: string) => (h === "host" ? "landingsaas.com" : null),
      },
    } as any;

    const response = await getRobots({ request: mockRequest } as any);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/plain");

    const text = await response.text();
    expect(text).toContain("User-agent: *");
    expect(text).toContain("Disallow: /admin/");
    expect(text).toContain("Disallow: /backoffice/");
    expect(text).toContain("Disallow: /preview/");
    expect(text).toContain("Sitemap: https://landingsaas.com/sitemap.xml");
  });

  it("generates valid sitemap.xml for platform host with public routes", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    const mockRequest = {
      headers: {
        get: (h: string) => (h === "host" ? "landingsaas.com" : null),
      },
    } as any;

    const mockLocals = {
      supabase: mockSupabase,
      hostRouting: { kind: "platform" },
    } as any;

    const response = await getSitemap({ request: mockRequest, locals: mockLocals } as any);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/xml");

    const xml = await response.text();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://landingsaas.com/</loc>");
  });
});
