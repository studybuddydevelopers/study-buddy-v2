import assert from "node:assert/strict";
import test from "node:test";

import { lifecycleEndpoint } from "./run-account-lifecycle-cron.mjs";

const CRON_SECRET = "a".repeat(32);
const privateOriginWithCredentials = new URL(
  "http://study-buddy-v2.railway.internal:8080"
);
privateOriginWithCredentials.username = "test-user";
privateOriginWithCredentials.password = "test-password";

test("uses a Railway-private HTTP origin when configured", () => {
  const result = lifecycleEndpoint({
    ACCOUNT_LIFECYCLE_CRON_ORIGIN:
      "http://study-buddy-v2.railway.internal:8080/",
    ACCOUNT_DELETION_CRON_SECRET: CRON_SECRET,
  });

  assert.equal(
    result.endpoint.toString(),
    "http://study-buddy-v2.railway.internal:8080/api/v1/account/deletion/cron"
  );
  assert.equal(result.cronSecret, CRON_SECRET);
});

test("falls back to the public HTTPS app origin", () => {
  const result = lifecycleEndpoint({
    APP_ORIGIN: "https://staging.studybuddyng.com/",
    ACCOUNT_DELETION_CRON_SECRET: CRON_SECRET,
  });

  assert.equal(
    result.endpoint.toString(),
    "https://staging.studybuddyng.com/api/v1/account/deletion/cron"
  );
});

for (const origin of [
  "http://example.com:8080",
  "https://study-buddy-v2.railway.internal:8080",
  "http://railway.internal:8080",
  "http://study-buddy-v2.railway.internal.example.com:8080",
  privateOriginWithCredentials.toString(),
  "http://study-buddy-v2.railway.internal:8080/unexpected-path",
  "http://study-buddy-v2.railway.internal:8080/?unexpected=query",
]) {
  test(`rejects unsafe private cron origin ${origin}`, () => {
    assert.throws(
      () =>
        lifecycleEndpoint({
          ACCOUNT_LIFECYCLE_CRON_ORIGIN: origin,
          ACCOUNT_DELETION_CRON_SECRET: CRON_SECRET,
        }),
      /ACCOUNT_LIFECYCLE_CRON_ORIGIN/
    );
  });
}

test("still rejects insecure public fallback origins", () => {
  assert.throws(
    () =>
      lifecycleEndpoint({
        APP_ORIGIN: "http://staging.studybuddyng.com",
        ACCOUNT_DELETION_CRON_SECRET: CRON_SECRET,
      }),
    /APP_ORIGIN_MUST_USE_HTTPS/
  );
});
