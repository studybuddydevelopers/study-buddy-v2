import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyWhatsAppSignature: vi.fn(),
  parseIncomingMessages: vi.fn(),
  sendWhatsAppText: vi.fn(),
  handleIncomingMessage: vi.fn(),
  getClientIp: vi.fn(),
  logSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/whatsapp", () => ({
  verifyWhatsAppSignature: mocks.verifyWhatsAppSignature,
  parseIncomingMessages: mocks.parseIncomingMessages,
  sendWhatsAppText: mocks.sendWhatsAppText,
}));
vi.mock("@/lib/whatsapp-flow", () => ({
  handleIncomingMessage: mocks.handleIncomingMessage,
}));
vi.mock("@/lib/security/rate-limit", () => ({
  getClientIp: mocks.getClientIp,
}));
vi.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
  securityFingerprint: (value: string) => `fingerprint:${value}`,
}));

import { GET, POST } from "./route";

describe("WhatsApp webhook boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "verification-secret");
    mocks.getClientIp.mockReturnValue("203.0.113.10");
    mocks.verifyWhatsAppSignature.mockReturnValue(false);
    mocks.parseIncomingMessages.mockReturnValue([]);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns the challenge only for the exact verification token", async () => {
    const accepted = await GET(
      verificationRequest("verification-secret", "challenge-123")
    );
    const rejected = await GET(
      verificationRequest("wrong-secret", "challenge-123")
    );

    expect(accepted.status).toBe(200);
    await expect(accepted.text()).resolves.toBe("challenge-123");
    expect(rejected.status).toBe(403);
  });

  it("rejects an invalid signature before parsing the JSON payload", async () => {
    const response = await POST(deliveryRequest("{not-json"));

    expect(response.status).toBe(401);
    expect(mocks.parseIncomingMessages).not.toHaveBeenCalled();
    expect(mocks.handleIncomingMessage).not.toHaveBeenCalled();
    expect(mocks.sendWhatsAppText).not.toHaveBeenCalled();
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      "webhook_signature_failed",
      "warn",
      {
        provider: "whatsapp",
        ipFingerprint: "fingerprint:203.0.113.10",
      }
    );
  });

  it("rejects an oversized body before signature verification", async () => {
    const response = await POST(
      deliveryRequest("{}", { "content-length": "1048577" })
    );

    expect(response.status).toBe(413);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.verifyWhatsAppSignature).not.toHaveBeenCalled();
    expect(mocks.parseIncomingMessages).not.toHaveBeenCalled();
  });

  it("acknowledges a valid signed delivery", async () => {
    mocks.verifyWhatsAppSignature.mockReturnValue(true);
    const body = JSON.stringify({ object: "whatsapp_business_account" });

    const response = await POST(deliveryRequest(body));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(mocks.verifyWhatsAppSignature).toHaveBeenCalledWith(
      body,
      "sha256=test-signature"
    );
    expect(mocks.parseIncomingMessages).toHaveBeenCalledWith(
      JSON.parse(body)
    );
  });

  it("normalizes a signed malformed payload to a generic failure", async () => {
    mocks.verifyWhatsAppSignature.mockReturnValue(true);

    const response = await POST(deliveryRequest("{not-json"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook error" });
    expect(mocks.parseIncomingMessages).not.toHaveBeenCalled();
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      "whatsapp_webhook_processing_failed",
      "error"
    );
  });
});

function verificationRequest(token: string, challenge: string) {
  const url = new URL("https://studybuddyng.com/api/v1/whatsapp/webhook");
  url.searchParams.set("hub.mode", "subscribe");
  url.searchParams.set("hub.verify_token", token);
  url.searchParams.set("hub.challenge", challenge);
  return new Request(url);
}

function deliveryRequest(
  body: string,
  extraHeaders: Record<string, string> = {}
) {
  return new Request("https://studybuddyng.com/api/v1/whatsapp/webhook", {
    method: "POST",
    headers: {
      "x-hub-signature-256": "sha256=test-signature",
      ...extraHeaders,
    },
    body,
  });
}
