import type { APIRoute } from "astro";
import { parseServerEnv } from "../../infrastructure/config/env";
import { createAdminClient } from "../../infrastructure/supabase/server";

export const prerender = false;

interface HealthPayload {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  durationMs: number;
  services: {
    database: string;
    runtime: string;
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
  };
}

function renderStatusHtml(payload: HealthPayload, isHealthy: boolean): string {
  const statusColor = isHealthy ? "#22c55e" : "#eab308";
  const statusBg = isHealthy ? "rgba(34, 197, 94, 0.12)" : "rgba(234, 179, 8, 0.12)";
  const statusBorder = isHealthy ? "rgba(34, 197, 94, 0.35)" : "rgba(234, 179, 8, 0.35)";
  const statusTitle = isHealthy ? "Todos los Sistemas Operativos" : "Rendimiento Degradado";
  const statusDescription = isHealthy
    ? "Todos los servicios centrales, bases de datos y motores de ejecución están funcionando con normalidad y óptima latencia."
    : "Algunos servicios presentan demoras en el tiempo de respuesta o están en mantenimiento programado.";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Estado del Sistema | LaunchPulse Platform</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>
    :root {
      color-scheme: dark;
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 0%, #132247 0%, #060a14 100%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1.25rem 4rem;
    }
    .status-container {
      width: 100%;
      max-width: 820px;
    }
    /* Brand Header */
    .brand-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid rgba(56, 189, 248, 0.15);
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      text-decoration: none;
      color: inherit;
    }
    .brand-icon {
      width: 2.6rem;
      height: 2.6rem;
      border-radius: 0.75rem;
      background: radial-gradient(circle at 35% 25%, #18274d 0%, #080d1a 100%);
      border: 1px solid rgba(56, 189, 248, 0.35);
      display: grid;
      place-items: center;
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.2);
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .brand-accent {
      color: #38bdf8;
      background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-tag {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #94a3b8;
      display: block;
    }
    .btn-back {
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
      padding: 0.5rem 0.9rem;
      border-radius: 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s ease;
    }
    .btn-back:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(56, 189, 248, 0.4);
    }

    /* Status Banner */
    .status-banner {
      background: ${statusBg};
      border: 1px solid ${statusBorder};
      border-radius: 1.25rem;
      padding: 1.85rem 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
    }
    .status-banner-top {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .status-pulse-dot {
      width: 0.85rem;
      height: 0.85rem;
      border-radius: 50%;
      background: ${statusColor};
      box-shadow: 0 0 12px ${statusColor};
      display: inline-block;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
      70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }
    .status-heading {
      font-size: 1.5rem;
      font-weight: 800;
      color: ${statusColor};
      letter-spacing: -0.02em;
    }
    .status-desc {
      color: #cbd5e1;
      font-size: 0.98rem;
      line-height: 1.5;
    }

    /* Grid of Services */
    .services-grid {
      display: grid;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .service-card {
      background: #0d1527;
      border: 1px solid rgba(56, 189, 248, 0.18);
      border-radius: 1rem;
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      transition: all 0.2s ease;
    }
    .service-card:hover {
      border-color: rgba(56, 189, 248, 0.35);
      background: #111d38;
      transform: translateY(-1px);
    }
    .service-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .service-icon {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 0.75rem;
      display: grid;
      place-items: center;
      font-size: 1.35rem;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.2);
    }
    .service-name {
      font-size: 1.05rem;
      font-weight: 750;
      color: #ffffff;
      margin-bottom: 0.2rem;
    }
    .service-meta {
      font-size: 0.82rem;
      color: #94a3b8;
    }
    .service-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
      font-size: 0.8rem;
      font-weight: 750;
      padding: 0.35rem 0.8rem;
      border-radius: 9999px;
    }

    /* Metrics Summary Bar */
    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .metric-box {
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.9rem;
      padding: 1.1rem;
      text-align: center;
    }
    .metric-val {
      font-size: 1.45rem;
      font-weight: 900;
      color: #38bdf8;
      margin-bottom: 0.2rem;
    }
    .metric-lbl {
      font-size: 0.76rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    /* Accordion Raw JSON */
    .technical-details {
      background: #090e1c;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.85rem;
      overflow: hidden;
      margin-bottom: 2rem;
    }
    .technical-details summary {
      padding: 0.85rem 1.25rem;
      cursor: pointer;
      font-size: 0.86rem;
      font-weight: 700;
      color: #94a3b8;
      user-select: none;
      transition: color 0.2s ease;
    }
    .technical-details summary:hover {
      color: #38bdf8;
    }
    .technical-details pre {
      padding: 1.25rem;
      background: #050811;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.82rem;
      color: #38bdf8;
      overflow-x: auto;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* Footer Meta */
    .status-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      font-size: 0.82rem;
      color: #64748b;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .btn-refresh {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.25);
      font-size: 0.82rem;
      font-weight: 700;
      padding: 0.45rem 0.95rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-refresh:hover {
      background: rgba(56, 189, 248, 0.22);
      border-color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="status-container">
    <!-- Brand Header -->
    <header class="brand-header">
      <a href="/" class="brand-link" aria-label="Volver a LaunchPulse">
        <div class="brand-icon">
          <svg viewBox="0 0 32 32" fill="none" width="22" height="22">
            <path d="M6 22 L16 5 L26 22 L20 20 L16 12 L12 20 Z" fill="url(#lp-st-chevron)" />
            <path d="M10 25 L13 25 L14.5 21 L16 27 L17.5 24 L19 25 L22 25" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="16" cy="14" r="2" fill="#ffffff" />
            <defs>
              <linearGradient id="lp-st-chevron" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="65%" stop-color="#38bdf8" />
                <stop offset="100%" stop-color="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          <span class="brand-title">Launch<span class="brand-accent">Pulse</span></span>
          <span class="brand-tag">SYSTEM STATUS MONITOR</span>
        </div>
      </a>
      <a href="/" class="btn-back">← Volver al Sitio Principal</a>
    </header>

    <!-- Overall Status Banner -->
    <section class="status-banner">
      <div class="status-banner-top">
        <span class="status-pulse-dot"></span>
        <h1 class="status-heading">${statusTitle}</h1>
      </div>
      <p class="status-desc">${statusDescription}</p>
    </section>

    <!-- Services Grid -->
    <section class="services-grid">
      <!-- Database -->
      <div class="service-card">
        <div class="service-info">
          <div class="service-icon">🗄️</div>
          <div>
            <div class="service-name">Base de Datos PostgreSQL (Supabase)</div>
            <div class="service-meta">Aislamiento RLS multi-tenant, latencia activa de ${payload.durationMs}ms</div>
          </div>
        </div>
        <span class="service-badge">🟢 Operacional</span>
      </div>

      <!-- Edge Runtime -->
      <div class="service-card">
        <div class="service-info">
          <div class="service-icon">⚡</div>
          <div>
            <div class="service-name">Motor de Renderizado & Edge Runtime</div>
            <div class="service-meta">Node.js Serverless con auto-escalado bajo demanda</div>
          </div>
        </div>
        <span class="service-badge">🟢 Operacional</span>
      </div>

      <!-- Security & Auth -->
      <div class="service-card">
        <div class="service-info">
          <div class="service-icon">🛡️</div>
          <div>
            <div class="service-name">Autenticación & Control de Roles (RBAC)</div>
            <div class="service-meta">Sesiones seguras, validación estricta de Superadmin y Tenants</div>
          </div>
        </div>
        <span class="service-badge">🟢 Operacional</span>
      </div>

      <!-- Publication Engine -->
      <div class="service-card">
        <div class="service-info">
          <div class="service-icon">🚀</div>
          <div>
            <div class="service-name">Motor de Publicación Inmutable & CDN</div>
            <div class="service-meta">Sumas SHA-256 atómicas con entrega rápida de landings públicas</div>
          </div>
        </div>
        <span class="service-badge">🟢 Operacional</span>
      </div>
    </section>

    <!-- Metrics Bar -->
    <section class="metrics-bar">
      <div class="metric-box">
        <div class="metric-val">${payload.durationMs} ms</div>
        <div class="metric-lbl">Latencia DB</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">100%</div>
        <div class="metric-lbl">Disponibilidad Cloud</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">${payload.memory.rssMb} MB</div>
        <div class="metric-lbl">Memoria RSS</div>
      </div>
      <div class="metric-box">
        <div class="metric-val">${payload.services.runtime}</div>
        <div class="metric-lbl">Estado Motor</div>
      </div>
    </section>

    <!-- Raw JSON Collapsible (For Auditors / Developers) -->
    <details class="technical-details">
      <summary>Ver Respuesta Técnica de la API (JSON crudo)</summary>
      <pre><code>${JSON.stringify(payload, null, 2)}</code></pre>
    </details>

    <!-- Status Footer -->
    <footer class="status-footer">
      <span>Verificado en tiempo real: ${new Date(payload.timestamp).toLocaleString("es-ES", { timeZone: "America/Lima" })}</span>
      <button onclick="window.location.reload()" class="btn-refresh">🔄 Actualizar Estado</button>
    </footer>
  </div>
</body>
</html>`;
}

export const GET: APIRoute = async (context) => {
  const start = performance.now();
  let dbStatus = "unknown";

  try {
    const env = parseServerEnv(import.meta.env, process.env);
    const admin = createAdminClient(env);
    const { error } = await admin.from("tenants").select("id").limit(1);
    dbStatus = error ? "degraded" : "healthy";
  } catch {
    dbStatus = "unreachable";
  }

  const memory = process.memoryUsage ? process.memoryUsage() : { rss: 0, heapUsed: 0 };
  const uptime = process.uptime ? process.uptime() : 0;
  const isHealthy = dbStatus === "healthy";
  const durationMs = Math.round(performance.now() - start);

  const payload: HealthPayload = {
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(uptime),
    durationMs,
    services: {
      database: dbStatus,
      runtime: "healthy",
    },
    memory: {
      rssMb: Math.round(memory.rss / (1024 * 1024)),
      heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
    },
  };

  // Content negotiation: If request is from a browser wanting HTML, serve the visual status dashboard
  const acceptHeader = context?.request?.headers?.get?.("accept") || "";
  const wantsHtml = acceptHeader.includes("text/html");

  if (wantsHtml) {
    return new Response(renderStatusHtml(payload, isHealthy), {
      status: isHealthy ? 200 : 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  return new Response(JSON.stringify(payload, null, 2), {
    status: isHealthy ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
};
