export interface WebhookEndpoint {
  readonly id: string;
  readonly tenantId: string;
  readonly url: string;
  readonly secret: string;
  readonly subscribedEvents: readonly string[];
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WebhookDelivery {
  readonly id: string;
  readonly endpointId: string;
  readonly eventName: string;
  readonly payload: Record<string, unknown>;
  readonly status: "delivered" | "failed";
  readonly statusCode?: number | undefined;
  readonly responseBody?: string | undefined;
  readonly attempt: number;
  readonly createdAt: string;
}

export interface RegisterWebhookInput {
  readonly tenantId: string;
  readonly url: string;
  readonly secret: string;
  readonly subscribedEvents?: readonly string[] | undefined;
  readonly enabled?: boolean | undefined;
}

export interface RecordDeliveryInput {
  readonly endpointId: string;
  readonly eventName: string;
  readonly payload: Record<string, unknown>;
  readonly status: "delivered" | "failed";
  readonly statusCode?: number | undefined;
  readonly responseBody?: string | undefined;
  readonly attempt?: number | undefined;
}

export interface WebhookRepository {
  registerEndpoint(input: RegisterWebhookInput): Promise<WebhookEndpoint>;
  listEndpointsForEvent(tenantId: string, eventName: string): Promise<WebhookEndpoint[]>;
  recordDelivery(input: RecordDeliveryInput): Promise<WebhookDelivery>;
}
