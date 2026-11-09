import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  getClientIp: vi.fn(),
  logSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: { findFirst: mocks.findFirst, create: mocks.create },
  },
}));
vi.mock("@/lib/security/rate-limit", () => ({
  getClientIp: mocks.getClientIp,
}));
vi.mock("@/lib/security/audit-log", () => ({
  logSecurityEvent: mocks.logSecurityEvent,
  securityFingerprint: (value: string) => `fingerprint:${value}`,
}));

import { POST } from "./route";

const secret = "paystack-test-secret";

describe("Paystack webhook boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PAYSTACK_SECRET_KEY", secret);
    mocks.getClientIp.mockReturnValue("203.0.113.9");
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "transaction-1" });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects an invalid signature before parsing or persistence", async () => {
    const response = await POST(
      request("{not-json", "0".repeat(128))
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid Paystack signature",
    });
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      "webhook_signature_failed",
      "warn",
      {
        provider: "paystack",
        ipFingerprint: "fingerprint:203.0.113.9",
      }
    );
  });

  it("rejects an oversized body before signature or persistence work", async () => {
    const body = "{}";
    const response = await POST(
      request(body, signature(body), { "content-length": "1048577" })
    );

    expect(response.status).toBe(413);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("acknowledges a previously processed reference without duplicating it", async () => {
    mocks.findFirst.mockResolvedValue({ id: "existing-transaction" });
    const body = paymentEvent();

    const response = await POST(request(body, signature(body)));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { reference: "paystack-reference-1" },
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("persists a valid signed payment using Paystack's minor currency unit", async () => {
    const body = paymentEvent();

    const response = await POST(request(body, signature(body)));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: 25,
        reference: "paystack-reference-1",
        currency: "NGN",
        status: "success",
      },
    });
  });

  it("normalizes a signed malformed payload to a generic failure", async () => {
    const body = "{not-json";

    const response = await POST(request(body, signature(body)));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook error" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.logSecurityEvent).toHaveBeenCalledWith(
      "payment_webhook_processing_failed",
      "error",
      { provider: "paystack" }
    );
  });
});

function paymentEvent() {
  return JSON.stringify({
    event: "charge.success",
    data: {
      reference: "paystack-reference-1",
      amount: 2_500,
      currency: "NGN",
      status: "success",
      metadata: { userId: "user-1" },
    },
  });
}

function signature(body: string) {
  return createHmac("sha512", secret).update(body).digest("hex");
}

function request(
  body: string,
  webhookSignature: string,
  extraHeaders: Record<string, string> = {}
) {
  return new Request("https://studybuddyng.com/api/v1/payments/webhook", {
    method: "POST",
    headers: {
      "x-paystack-signature": webhookSignature,
      ...extraHeaders,
    },
    body,
  });
}
