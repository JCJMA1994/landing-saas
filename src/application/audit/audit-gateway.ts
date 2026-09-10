export interface AuditLogEntry {
  tenantId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown> | undefined;
  createdAt?: string | undefined;
}

export interface AuditLogGateway {
  record(entry: AuditLogEntry): Promise<void>;
  listRecent(tenantId: string, limit?: number): Promise<AuditLogEntry[]>;
}

export class AuditGatewayError extends Error {
  constructor(message = "Audit log is temporarily unavailable.") {
    super(message);
    this.name = "AuditGatewayError";
  }
}
