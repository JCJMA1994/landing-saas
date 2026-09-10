import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookSignatureParts {
  readonly timestamp: number;
  readonly signature: string;
}

export function signWebhookPayload(
  payloadString: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  const signedPayload = `${timestamp}.${payloadString}`;
  const hmac = createHmac("sha256", secret);
  hmac.update(signedPayload);
  const signature = hmac.digest("hex");

  return `t=${timestamp},v1=${signature}`;
}

export function parseWebhookSignatureHeader(
  headerValue: string | null | undefined
): WebhookSignatureParts | null {
  if (!headerValue) return null;

  const items = headerValue.split(",");
  let timestamp: number | null = null;
  let signature: string | null = null;

  for (const item of items) {
    const [k, v] = item.trim().split("=");
    if (k === "t" && v) {
      const parsed = parseInt(v, 10);
      if (!isNaN(parsed)) timestamp = parsed;
    } else if (k === "v1" && v) {
      signature = v;
    }
  }

  if (timestamp === null || !signature) return null;
  return { timestamp, signature };
}

export function verifyWebhookSignature(
  payloadString: string,
  headerValue: string | null | undefined,
  secret: string,
  toleranceSeconds = 300,
  now: number = Math.floor(Date.now() / 1000)
): boolean {
  const parts = parseWebhookSignatureHeader(headerValue);
  if (!parts) return false;

  // Anti-replay protection: verify timestamp within tolerance window
  if (Math.abs(now - parts.timestamp) > toleranceSeconds) {
    return false;
  }

  const expectedSignatureHeader = signWebhookPayload(payloadString, secret, parts.timestamp);
  const expectedParts = parseWebhookSignatureHeader(expectedSignatureHeader);
  if (!expectedParts) return false;

  try {
    const receivedBuf = Buffer.from(parts.signature, "hex");
    const expectedBuf = Buffer.from(expectedParts.signature, "hex");

    if (receivedBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}
