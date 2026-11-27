import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  transaction: vi.fn(),
  findGrant: vi.fn(),
  restrictUser: vi.fn(),
  updateGrant: vi.fn(),
  cancelConfirmation: vi.fn(),
  writeEvent: vi.fn(),
  syncStatus: vi.fn(),
  getUser: vi.fn(),
  sendMail: vi.fn(),
  logEvent: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction, guardianAuthorization: { updateMany: mocks.updateGrant } },
}));
vi.mock("@/lib/guardian-authorization", () => ({ syncAuthAccountStatus: mocks.syncStatus }));
vi.mock("@/lib/security/timeouts", () => ({ fetchWithTimeout: mocks.sendMail }));
vi.mock("@/lib/security/audit-log", () => ({ logSecurityEvent: mocks.logEvent, securityFingerprint: () => "fingerprint" }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => ({ auth: { admin: { getUserById: mocks.getUser } } }) }));

import { GuardianWithdrawalConflict, requireGuardianWithdrawalOperator, withdrawGuardianAuthorisation } from "./guardian-withdrawal";

const request = {
  authorizationId: "authorization-1",
  caseReference: "privacy-case-1",
  operatorUserId: "privacy-operator",
};
const now = new Date("2026-11-27T12:00:00.000Z");

function activeGrant() {
  return {
    id: request.authorizationId,
    studentUserId: "learner-1",
    guardianEmail: "guardian@example.test",
    status: "GRANTED",
    withdrawalStudentNotifiedAt: null,
    withdrawalGuardianNotifiedAt: null,
    student: { accountStatus: "ACTIVE", profile: { dateOfBirth: new Date("2011-01-01") } },
    events: [],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  vi.stubEnv("RESEND_API_KEY", "synthetic-key");
  vi.stubEnv("TRANSACTIONAL_EMAIL_FROM", "Study Buddy <sender@example.test>");
  vi.stubEnv("GUARDIAN_WITHDRAWAL_OPERATOR_USER_IDS", "privacy-operator");
  mocks.transaction.mockImplementation(async (operation) => operation({
    guardianAuthorization: { findUnique: mocks.findGrant, updateMany: mocks.updateGrant },
    user: { updateMany: mocks.restrictUser },
    accountDeletionRequest: { updateMany: mocks.cancelConfirmation },
    guardianAuthorizationEvent: { create: mocks.writeEvent },
  }));
  mocks.findGrant.mockResolvedValue(activeGrant());
  mocks.restrictUser.mockResolvedValue({ count: 1 });
  mocks.updateGrant.mockResolvedValue({ count: 1 });
  mocks.getUser.mockResolvedValue({ error: null, data: { user: { email: "learner-current@example.test", email_confirmed_at: now.toISOString() } } });
  mocks.sendMail.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("guardian withdrawal", () => {
  it("admits only a confirmed, individually listed operator", async () => {
    for (const [id, emailConfirmed, allowed] of [
      ["privacy-operator", true, true],
      ["privacy-operator", false, false],
      ["another-staff-user", true, false],
    ] as const) {
      mocks.requireUser.mockResolvedValue({ dbUser: { id }, user: { email: "member@studybuddyng.com", email_confirmed_at: emailConfirmed ? now.toISOString() : null } });
      const result = await requireGuardianWithdrawalOperator();
      expect("errorResponse" in result).toBe(!allowed);
    }
  });

  it("records the case and emails the confirmed current learner address and the guardian separately", async () => {
    await expect(withdrawGuardianAuthorisation(request)).resolves.toEqual({ studentNotified: true, guardianNotified: true });
    expect(mocks.restrictUser).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "learner-1", accountStatus: { in: ["ACTIVE", "DEACTIVATED"] } }),
      data: { accountStatus: "GUARDIAN_AUTHORIZATION_WITHDRAWN", aiAccessAuthorized: false, inactiveDeletionAt: null },
    }));
    expect(mocks.cancelConfirmation).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "learner-1", status: "AWAITING_CONFIRMATION" },
    }));
    expect(mocks.writeEvent).toHaveBeenCalledOnce();
    expect(mocks.writeEvent).toHaveBeenCalledWith({ data: {
      authorizationId: request.authorizationId, eventType: "WITHDRAWN", actorType: "PRIVACY_OPERATOR",
      details: { caseReference: request.caseReference, operatorUserId: request.operatorUserId },
    } });
    expect(mocks.syncStatus).toHaveBeenCalledWith("learner-1", "GUARDIAN_AUTHORIZATION_WITHDRAWN");
    const deliveries = mocks.sendMail.mock.calls.map(([, { body, headers }]) => ({
      to: JSON.parse(body).to[0],
      key: headers["Idempotency-Key"],
    }));
    expect(deliveries).toEqual(expect.arrayContaining([
      { to: "learner-current@example.test", key: "guardian-withdrawal-authorization-1-student" },
      { to: "guardian@example.test", key: "guardian-withdrawal-authorization-1-guardian" },
    ]));
  });

  it("retries only the outstanding notice for the original case", async () => {
    const grant = activeGrant();
    mocks.findGrant.mockResolvedValue({
      ...grant,
      status: "WITHDRAWN",
      withdrawalStudentNotifiedAt: now,
      student: { ...grant.student, accountStatus: "GUARDIAN_AUTHORIZATION_WITHDRAWN" },
      events: [{ details: { caseReference: request.caseReference } }],
    });
    await expect(withdrawGuardianAuthorisation({ ...request, caseReference: "other-case" })).rejects.toThrow(GuardianWithdrawalConflict);
    expect(mocks.sendMail).not.toHaveBeenCalled();
    mocks.sendMail.mockResolvedValueOnce({ ok: false });
    await expect(withdrawGuardianAuthorisation(request)).resolves.toEqual({ studentNotified: true, guardianNotified: false });
    await expect(withdrawGuardianAuthorisation(request)).resolves.toEqual({ studentNotified: true, guardianNotified: true });
    expect(mocks.sendMail).toHaveBeenCalledTimes(2);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.writeEvent).not.toHaveBeenCalled();
  });

  it("leaves a conflicting account state and its email untouched", async () => {
    mocks.restrictUser.mockResolvedValue({ count: 0 });
    await expect(withdrawGuardianAuthorisation(request)).rejects.toThrow(GuardianWithdrawalConflict);
    expect(mocks.updateGrant).not.toHaveBeenCalled();
    expect(mocks.syncStatus).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
