import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RecordDeliveryInput,
  RegisterWebhookInput,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookRepository,
} from "../../application/scale/webhook-repository";

interface DbEndpointRow {
  id: string;
  tenant_id: string;
  url: string;
  secret: string;
  subscribed_events: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface DbDeliveryRow {
  id: string;
  endpoint_id: string;
  event_name: string;
  payload: any;
  status: string;
  status_code: number | null;
  response_body: string | null;
  attempt: number;
  created_at: string;
}

function mapEndpoint(row: DbEndpointRow): WebhookEndpoint {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    url: row.url,
    secret: row.secret,
    subscribedEvents: row.subscribed_events,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDelivery(row: DbDeliveryRow): WebhookDelivery {
  return {
    id: row.id,
    endpointId: row.endpoint_id,
    eventName: row.event_name,
    payload: row.payload,
    status: row.status as "delivered" | "failed",
    statusCode: row.status_code ?? undefined,
    responseBody: row.response_body ?? undefined,
    attempt: row.attempt,
    createdAt: row.created_at,
  };
}

export class SupabaseWebhookRepository implements WebhookRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async registerEndpoint(input: RegisterWebhookInput): Promise<WebhookEndpoint> {
    const payload = {
      tenant_id: input.tenantId,
      url: input.url,
      secret: input.secret,
      subscribed_events: input.subscribedEvents || [],
      enabled: input.enabled ?? true,
    };

    const { data, error } = await this.supabase
      .from("webhook_endpoints")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to register webhook endpoint: ${error?.message}`);
    }

    return mapEndpoint(data as DbEndpointRow);
  }

  async listEndpointsForEvent(tenantId: string, eventName: string): Promise<WebhookEndpoint[]> {
    const { data, error } = await this.supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("enabled", true);

    if (error || !Array.isArray(data)) {
      return [];
    }

    return (data as DbEndpointRow[])
      .filter(
        (ep) =>
          ep.subscribed_events.length === 0 ||
          ep.subscribed_events.includes(eventName) ||
          ep.subscribed_events.includes("*")
      )
      .map(mapEndpoint);
  }

  async recordDelivery(input: RecordDeliveryInput): Promise<WebhookDelivery> {
    const payload = {
      endpoint_id: input.endpointId,
      event_name: input.eventName,
      payload: input.payload,
      status: input.status,
      status_code: input.statusCode || null,
      response_body: input.responseBody || null,
      attempt: input.attempt ?? 1,
    };

    const { data, error } = await this.supabase
      .from("webhook_deliveries")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to record webhook delivery: ${error?.message}`);
    }

    return mapDelivery(data as DbDeliveryRow);
  }
}
