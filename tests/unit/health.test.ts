import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock infrastructure modules before importing the handler
vi.mock("../../src/infrastructure/supabase/server", () => ({
  createAdminClient: vi.fn(),
  createRequestClient: vi.fn(),
}));

vi.mock("../../src/infrastructure/config/env", () => ({
  parseServerEnv: vi.fn(() => ({
    appEnv: "production" as const,
    appHostname: "system-failed-tech.com",
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "anon-key",
  })),
}));

import { GET } from "../../src/pages/api/health";
import { createAdminClient } from "../../src/infrastructure/supabase/server";

const mockCreateAdminClient = vi.mocked(createAdminClient);

describe("Health Check API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 OK with healthy status when database is reachable", async () => {
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [{ id: "t-1" }], error: null }),
        }),
      }),
    } as any);

    const response = await GET({} as any);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.services.database).toBe("healthy");
    expect(body.services.runtime).toBe("healthy");
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(body.memory).toHaveProperty("rssMb");
  });

  it("returns 503 degraded status when database is unreachable", async () => {
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: new Error("DB Connection Error") }),
        }),
      }),
    } as any);

    const response = await GET({} as any);
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.status).toBe("degraded");
    expect(body.services.database).toBe("degraded");
  });
});
