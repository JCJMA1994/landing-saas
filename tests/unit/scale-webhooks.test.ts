import { describe, expect, it, vi } from "vitest";
import {
  parseWebhookSignatureHeader,
  signWebhookPayload,
  verifyWebhookSignature,
} from "../../src/domain/scale/webhook";
import {
  dispatchWebhookEventUseCase,
  InvalidWebhookEndpointError,
  registerWebhookEndpointUseCase,
} from "../../src/application/scale/manage-webhooks";
import type {
  RecordDeliveryInput,
  RegisterWebhookInput,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookRepository,
} from "../../src/application/scale/webhook-repository";

class InMemoryWebhookRepository implements WebhookRepository {
  public endpoints: WebhookEndpoint[] = [];
  public deliveries: WebhookDelivery[] = [];

  async registerEndpoint(input: RegisterWebhookInput): Promise<WebhookEndpoint> {
    const ep: WebhookEndpoint = {
      id: `ep-${this.endpoints.length + 1}`,
      tenantId: input.tenantId,
      url: input.url,
      secret: input.secret,
      subscribedEvents: input.subscribedEvents || [],
      enabled: input.enabled ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.endpoints.push(ep);
    return ep;
  }

  async listEndpointsForEvent(tenantId: string, eventName: string): Promise<WebhookEndpoint[]> {
    return this.endpoints.filter(
      (ep) =>
        ep.tenantId === tenantId &&
        ep.enabled &&
        (ep.subscribedEvents.length === 0 ||
          ep.subscribedEvents.includes(eventName) ||
          ep.subscribedEvents.includes("*"))
    );
  }

  async recordDelivery(input: RecordDeliveryInput): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: `del-${this.deliveries.length + 1}`,
      endpointId: input.endpointId,
      eventName: input.eventName,
      payload: input.payload,
      status: input.status,
      statusCode: input.statusCode,
      responseBody: input.responseBody,
      attempt: input.attempt ?? 1,
      createdAt: new Date().toISOString(),
    };
    this.deliveries.push(delivery);
    return delivery;
  }
}

describe("Webhooks Engine & Signatures", () => {
  const secret = "whsec_super_secret_test_key_123456789";

  it("signs and verifies HMAC signatures with replay window protection", () => {
    const payload = JSON.stringify({ event: "site.published", siteId: "s-123" });
    const now = 1720000000;
    const header = signWebhookPayload(payload, secret, now);

    expect(header).toMatch(/^t=1720000000,v1=[a-f0-9]{64}$/);

    // Valid signature within tolerance window
    expect(verifyWebhookSignature(payload, header, secret, 300, now + 10)).toBe(true);

    // Replay attack: outside tolerance window (> 300s)
    expect(verifyWebhookSignature(payload, header, secret, 300, now + 500)).toBe(false);

    // Tampered payload
    const tampered = JSON.stringify({ event: "site.published", siteId: "tampered" });
    expect(verifyWebhookSignature(tampered, header, secret, 300, now)).toBe(false);

    // Wrong secret
    expect(verifyWebhookSignature(payload, header, "wrong_secret_1234567890", 300, now)).toBe(false);
  });

  it("parses signature headers correctly", () => {
    const header = "t=1720000000,v1=abcdef0123456789";
    const parts = parseWebhookSignatureHeader(header);
    expect(parts?.timestamp).toBe(1720000000);
    expect(parts?.signature).toBe("abcdef0123456789");
  });

  it("validates endpoint registration constraints", async () => {
    const repo = new InMemoryWebhookRepository();

    await expect(
      registerWebhookEndpointUseCase(
        {
          tenantId: "t-1",
          url: "ftp://invalid-url.com",
          secret: "secret-long-enough-1234",
        },
        repo
      )
    ).rejects.toThrow(InvalidWebhookEndpointError);

    await expect(
      registerWebhookEndpointUseCase(
        {
          tenantId: "t-1",
          url: "https://example.com/webhook",
          secret: "short", // < 16 chars
        },
        repo
      )
    ).rejects.toThrow(InvalidWebhookEndpointError);
  });

  it("dispatches signed webhooks and logs delivery receipts", async () => {
    const repo = new InMemoryWebhookRepository();
    await repo.registerEndpoint({
      tenantId: "t-1",
      url: "https://example.com/webhook",
      secret,
      subscribedEvents: ["site.published"],
    });

    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue("OK"),
    });

    const summary = await dispatchWebhookEventUseCase({
      tenantId: "t-1",
      eventName: "site.published",
      payload: { siteId: "s-1" },
      repository: repo,
      fetcher: mockFetcher as any,
    });

    expect(summary.totalEndpoints).toBe(1);
    expect(summary.successfulDeliveries).toBe(1);
    expect(summary.failedDeliveries).toBe(0);

    expect(mockFetcher).toHaveBeenCalledWith(
      "https://example.com/webhook",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-SaaS-Event": "site.published",
        }),
      })
    );

    const delivery = repo.deliveries[0];
    expect(delivery?.status).toBe("delivered");
    expect(delivery?.statusCode).toBe(200);
  });
});
