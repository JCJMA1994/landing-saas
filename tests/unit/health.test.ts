import { describe, expect, it, vi } from "vitest";
import { GET } from "../../src/pages/api/health";

describe("Health Check API Route", () => {
  it("returns 200 OK with healthy status when database is reachable", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [{ id: "t-1" }], error: null }),
        }),
      }),
    };

    const mockContext = {
      locals: {
        supabase: mockSupabase,
      },
    } as any;

    const response = await GET(mockContext);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.services.database).toBe("healthy");
    expect(body.services.runtime).toBe("healthy");
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(body.memory).toHaveProperty("rssMb");
  });

  it("returns 503 degraded status when database is unreachable", async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: new Error("DB Connection Error") }),
        }),
      }),
    };

    const mockContext = {
      locals: {
        supabase: mockSupabase,
      },
    } as any;

    const response = await GET(mockContext);
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.status).toBe("degraded");
    expect(body.services.database).toBe("degraded");
  });
});
