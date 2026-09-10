import type { APIRoute } from "astro";
import { parseServerEnv } from "../infrastructure/config/env";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  let appHostname = "landingsaas.com";
  try {
    const env = parseServerEnv({ ...import.meta.env, ...process.env });
    appHostname = env.appHostname;
  } catch {}
  const rawHost = request.headers.get("host") || appHostname;

  const robotsTxt = `# Multi-Tenant Robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /preview/
Disallow: /api/

Sitemap: https://${rawHost}/sitemap.xml
`;

  return new Response(robotsTxt.trim(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
};
