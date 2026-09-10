import { signWebhookPayload } from "../../domain/scale/webhook";
import type {
  RegisterWebhookInput,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookRepository,
} from "./webhook-repository";

export class InvalidWebhookEndpointError extends Error {
  constructor(message: string) {
    super(`Invalid webhook endpoint: ${message}`);
    this.name = "InvalidWebhookEndpointError";
  }
}

export async function registerWebhookEndpointUseCase(
  input: RegisterWebhookInput,
  repository: WebhookRepository
): Promise<WebhookEndpoint> {
  if (!input.url || !/^https?:\/\//i.test(input.url)) {
    throw new InvalidWebhookEndpointError("A valid HTTP or HTTPS URL is required.");
  }

  if (!input.secret || input.secret.length < 16) {
    throw new InvalidWebhookEndpointError("Webhook secret must be at least 16 characters long.");
  }

  return repository.registerEndpoint(input);
}

export interface DispatchWebhookInput {
  tenantId: string;
  eventName: string;
  payload: Record<string, unknown>;
  repository: WebhookRepository;
  fetcher?: typeof fetch | undefined;
}

export interface DispatchSummary {
  readonly totalEndpoints: number;
  readonly successfulDeliveries: number;
  readonly failedDeliveries: number;
  readonly deliveries: readonly WebhookDelivery[];
}

export async function dispatchWebhookEventUseCase(
  input: DispatchWebhookInput
): Promise<DispatchSummary> {
  const { tenantId, eventName, payload, repository, fetcher = fetch } = input;
  const endpoints = await repository.listEndpointsForEvent(tenantId, eventName);

  if (endpoints.length === 0) {
    return {
      totalEndpoints: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      deliveries: [],
    };
  }

  const payloadString = JSON.stringify(payload);
  const deliveryPromises = endpoints.map(async (endpoint) => {
    const signatureHeader = signWebhookPayload(payloadString, endpoint.secret);

    try {
      const response = await fetcher(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SaaS-Event": eventName,
          "X-SaaS-Signature": signatureHeader,
          "User-Agent": "LandingSaaS-Webhook/1.0",
        },
        body: payloadString,
      });

      const isSuccess = response.ok;
      const text = await response.text().catch(() => "");

      return await repository.recordDelivery({
        endpointId: endpoint.id,
        eventName,
        payload,
        status: isSuccess ? "delivered" : "failed",
        statusCode: response.status,
        responseBody: text.slice(0, 500),
      });
    } catch (error: any) {
      return await repository.recordDelivery({
        endpointId: endpoint.id,
        eventName,
        payload,
        status: "failed",
        responseBody: error?.message || String(error),
      });
    }
  });

  const deliveries = await Promise.all(deliveryPromises);
  const successfulDeliveries = deliveries.filter((d) => d.status === "delivered").length;
  const failedDeliveries = deliveries.length - successfulDeliveries;

  return {
    totalEndpoints: endpoints.length,
    successfulDeliveries,
    failedDeliveries,
    deliveries,
  };
}
