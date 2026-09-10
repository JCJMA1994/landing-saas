import type { APIRoute } from "astro";
import { GET as healthGet } from "./api/health";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  // Always enforce HTML content negotiation for the /status user-facing route unless explicitly requested as JSON
  const headers = new Headers(context.request.headers);
  if (!headers.get("accept") || !headers.get("accept")?.includes("application/json")) {
    headers.set("accept", "text/html,application/xhtml+xml");
  }

  const modifiedRequest = new Request(context.request.url, {
    method: context.request.method,
    headers,
  });

  return healthGet({
    ...context,
    request: modifiedRequest,
  });
};
