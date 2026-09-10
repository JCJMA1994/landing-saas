import type { APIRoute } from "astro";
import { SupabasePublicationRepository } from "../infrastructure/supabase/publication-repository";
import { SupabaseDomainRepository } from "../infrastructure/supabase/domain-repository";
import { parseServerEnv } from "../infrastructure/config/env";

export const prerender = false;

export const GET: APIRoute = async ({ locals, request }) => {
  let appHostname = "landingsaas.com";
  try {
    const env = parseServerEnv({ ...import.meta.env, ...process.env });
    appHostname = env.appHostname;
  } catch {}
  const rawHost = request.headers.get("host") || appHostname;
  const hostRouting = locals.hostRouting;
  const publicationRepo = new SupabasePublicationRepository(locals.supabase);

  const entries: { loc: string; lastmod?: string | undefined; changefreq: string; priority: string }[] = [];

  if (hostRouting?.kind === "subdomain") {
    // Specific site subdomain
    const pub = await publicationRepo.getActivePublicationBySlug(hostRouting.slug);
    if (pub) {
      entries.push({
        loc: `https://${rawHost}/`,
        lastmod: pub.publishedAt ? new Date(pub.publishedAt).toISOString().slice(0, 10) : undefined,
        changefreq: "weekly",
        priority: "1.0",
      });
    }
  } else if (hostRouting?.kind === "custom_domain") {
    // Custom domain site
    const domainRepo = new SupabaseDomainRepository(locals.supabase);
    const verifiedDomain = await domainRepo.getVerifiedDomain(hostRouting.domain);
    if (verifiedDomain) {
      const pub = await publicationRepo.getActivePublication(verifiedDomain.siteId);
      if (pub) {
        entries.push({
          loc: `https://${verifiedDomain.domain}/`,
          lastmod: pub.publishedAt ? new Date(pub.publishedAt).toISOString().slice(0, 10) : undefined,
          changefreq: "weekly",
          priority: "1.0",
        });
      }
    }
  } else {
    // Platform host: include homepage and published sites
    entries.push({
      loc: `https://${appHostname}/`,
      changefreq: "daily",
      priority: "1.0",
    });

    const { data: sites } = await locals.supabase.from("sites").select("id, slug");
    if (sites) {
      for (const site of sites) {
        const pub = await publicationRepo.getActivePublication(site.id);
        if (pub) {
          entries.push({
            loc: `https://${appHostname}/sites/${site.slug}`,
            lastmod: pub.publishedAt ? new Date(pub.publishedAt).toISOString().slice(0, 10) : undefined,
            changefreq: "weekly",
            priority: "0.8",
          });
        }
      }
    }
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
    ${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemapXml.trim(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
