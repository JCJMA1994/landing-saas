import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const start = performance.now();
  let dbStatus = "unknown";

  try {
    const { error } = await locals.supabase.from("tenants").select("id").limit(1);
    dbStatus = error ? "degraded" : "healthy";
  } catch {
    dbStatus = "unreachable";
  }

  const memory = process.memoryUsage ? process.memoryUsage() : { rss: 0, heapUsed: 0 };
  const uptime = process.uptime ? process.uptime() : 0;
  const isHealthy = dbStatus === "healthy";

  const payload = {
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(uptime),
    durationMs: Math.round(performance.now() - start),
    services: {
      database: dbStatus,
      runtime: "healthy",
    },
    memory: {
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: isHealthy ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
};
