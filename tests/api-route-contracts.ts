export const HTTP_METHODS = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];
type Access = "public" | "email-link" | "session" | "learner" | "ai" | "support" | "scheduled" | "signed-callback" | "disabled" | "retired";

type Contract = {
  access: Access;
  input: string;
};

function rule(access: Access, input: string): Contract {
  return { access, input };
}

// The Next.js default HEAD (when GET exists) and OPTIONS inherit framework behavior.
// The inventory test checks only explicitly exported route methods.
const routes: Record<string, Partial<Record<HttpMethod, Contract>>> = {
  "/api/health": { GET: rule("public", "No input") },
  "/auth/confirm": { GET: rule("email-link", "Confirmation token and email type") },
  "/auth/password-reset": { GET: rule("public", "Recovery callback parameters with an app-owned redirect") },
  "/api/v1/account/age-verification": { POST: rule("session", "Birth date, terms and guardian details when required") },
  "/api/v1/account/deletion/confirm": { POST: rule("email-link", "One-time deletion confirmation token") },
  "/api/v1/account/deletion/cron": { POST: rule("scheduled", "Scheduled-service authentication") },
  "/api/v1/account/lifecycle": {
    GET: rule("session", "Current account only"),
    POST: rule("session", "Allowed lifecycle action and reauthentication for deletion"),
  },
  "/api/v1/account/security/password-reset-lock": { POST: rule("email-link", "One-time security confirmation token") },
  "/api/v1/account/security/password-reset-recovery": { POST: rule("email-link", "One-time security recovery token") },
  "/api/v1/account/security/password-reset-recovery/complete": { POST: rule("session", "Current account and recovery state") },
  "/api/v1/ai/chats": {
    GET: rule("ai", "Own chats, bounded pagination and title search"),
    POST: rule("ai", "Validated title and study scope"),
  },
  "/api/v1/ai/chats/[chatId]": {
    GET: rule("ai", "Owned chat ID"),
    PATCH: rule("ai", "Owned chat ID and validated changes"),
    DELETE: rule("ai", "Owned chat ID"),
  },
  "/api/v1/ai/chats/[chatId]/citations/[citationId]": { GET: rule("ai", "Owned chat and visible citation IDs") },
  "/api/v1/ai/chats/[chatId]/messages": {
    GET: rule("ai", "Owned chat ID and bounded pagination"),
    POST: rule("ai", "Owned chat, bounded message and client request ID"),
  },
  "/api/v1/ai/chats/[chatId]/messages/[messageId]/report": {
    GET: rule("ai", "Owned chat and assistant message IDs"),
    POST: rule("ai", "Owned chat and assistant message, valid reason and bounded details"),
  },
  "/api/v1/ai/chats/[chatId]/requests/[requestId]/retry": { POST: rule("ai", "Owned chat and retryable request IDs") },
  "/api/v1/ai/messages": { POST: rule("ai", "Validated legacy question and bounded message") },
  "/api/v1/ai/questions/[id]/reply": { POST: rule("ai", "Owned legacy question and bounded reply") },
  "/api/v1/ai/questions/create": { POST: rule("ai", "Bounded question and study scope") },
  "/api/v1/ai/questions/list": { GET: rule("ai", "Current learner's threads and pagination") },
  "/api/v1/ai/recommendations": {
    GET: rule("ai", "Current learner's recommendations"),
    POST: rule("ai", "Supported recommendation request for the current learner"),
  },
  "/api/v1/ai/recommendations/cron": { POST: rule("scheduled", "Scheduled-service authentication") },
  "/api/v1/contact": { POST: rule("public", "Validated, bounded contact form") },
  "/api/v1/dashboard/stats": { GET: rule("learner", "Current learner only") },
  "/api/v1/guardian-authorizations/decision": { POST: rule("email-link", "One-time token, decision and required declarations") },
  "/api/v1/guardian-authorizations/lookup": { POST: rule("email-link", "Guardian token for the requested decision") },
  "/api/v1/guardian-authorizations/resend": { POST: rule("session", "Current account's pending guardian request") },
  "/api/v1/login": { POST: rule("public", "Bounded credentials and CAPTCHA when required") },
  "/api/v1/logout": { POST: rule("public", "Idempotent sign-out for the current session") },
  "/api/v1/materials/overview": { GET: rule("learner", "No caller-supplied identity") },
  "/api/v1/me": { GET: rule("learner", "Current learner only") },
  "/api/v1/mock-exams/ai-mark": { POST: rule("ai", "Owned submitted written exam ID") },
  "/api/v1/mock-exams/grade": { POST: rule("learner", "Owned submitted objective exam ID") },
  "/api/v1/mock-exams/instance": { GET: rule("learner", "Owned exam instance ID in query") },
  "/api/v1/mock-exams/marking-reviews": {
    GET: rule("learner", "Current learner's review cases"),
    POST: rule("learner", "Owned AI-marked answer and validated reason"),
  },
  "/api/v1/mock-exams/mock-exam-templates": { GET: rule("learner", "Availability for the current learner") },
  "/api/v1/mock-exams/save-progress": { POST: rule("learner", "Owned exam and matching answer IDs") },
  "/api/v1/mock-exams/self-grade": { POST: rule("retired", "Always rejects manual grading") },
  "/api/v1/mock-exams/start": { POST: rule("learner", "Eligible exam template ID") },
  "/api/v1/mock-exams/submit": { POST: rule("learner", "Owned exam and matching answer IDs") },
  "/api/v1/notifications": {
    GET: rule("learner", "Own inbox, unread count and bounded pagination"),
    PATCH: rule("learner", "Owned notification and read state, or cutoff for bulk update"),
  },
  "/api/v1/past-questions/attempt": { POST: rule("learner", "Question, answer and timing for the current learner") },
  "/api/v1/past-questions/by-topic": { GET: rule("learner", "Topic ID and bounded pagination") },
  "/api/v1/past-questions/drafts": {
    GET: rule("learner", "Own drafts for the requested topic and questions"),
    PATCH: rule("learner", "Validated question IDs and bounded draft batch"),
  },
  "/api/v1/past-questions/explanation": { POST: rule("learner", "Question ID") },
  "/api/v1/past-questions/query": { POST: rule("learner", "Question ID") },
  "/api/v1/past-questions/quiz-session": { POST: rule("learner", "Topic, times and bounded answer snapshots") },
  "/api/v1/payments/verify": { POST: rule("learner", "Payment reference verified by the provider") },
  "/api/v1/payments/webhook": { POST: rule("signed-callback", "Provider signature and bounded raw event") },
  "/api/v1/profile": {
    GET: rule("learner", "Current learner's profile"),
    PATCH: rule("learner", "Validated editable profile fields for the current learner"),
  },
  "/api/v1/progress/full-report": { GET: rule("learner", "Own progress, filters and bounded pagination") },
  "/api/v1/progress/subject": { POST: rule("learner", "Subject and progress value") },
  "/api/v1/progress/update": { POST: rule("learner", "Validated subject IDs and progress updates") },
  "/api/v1/reset-password": { POST: rule("public", "Bounded email and CAPTCHA when required") },
  "/api/v1/settings": {
    GET: rule("learner", "Current learner's settings"),
    PATCH: rule("learner", "Editable boolean settings for the current learner"),
  },
  "/api/v1/signup": { POST: rule("public", "Bounded credentials, age, terms and conditional guardian details") },
  "/api/v1/subscriptions/[id]/status": { GET: rule("learner", "Owned subscription ID") },
  "/api/v1/subscriptions/list": { GET: rule("learner", "Own subscriptions, filters and bounded pagination") },
  "/api/v1/support/chat-reports/[id]": { PATCH: rule("support", "Report ID, decision and note") },
  "/api/v1/support/marking-reviews": { GET: rule("support", "Supported status filter") },
  "/api/v1/support/marking-reviews/[id]": { PATCH: rule("support", "Review ID, decision, note and score when adjusted") },
  "/api/v1/whatsapp/webhook": {
    GET: rule("disabled", "Provider handshake when enabled"),
    POST: rule("disabled", "Signed, bounded provider event when enabled"),
  },
};

export const API_ROUTE_CONTRACTS = Object.entries(routes).flatMap(([path, methods]) =>
  HTTP_METHODS.flatMap((method) => {
    const contract = methods[method];
    return contract ? [{ path, method, ...contract }] : [];
  })
);
