import assert from "node:assert/strict";
import test from "node:test";

import { validateZapTarget } from "./validate-zap-target.mjs";

test("accepts a Railway staging origin", () => {
  assert.equal(
    validateZapTarget("https://study-buddy-staging.up.railway.app/"),
    "https://study-buddy-staging.up.railway.app",
  );
});

test("accepts the approved custom staging origin", () => {
  assert.equal(
    validateZapTarget("https://staging.studybuddyng.com/"),
    "https://staging.studybuddyng.com",
  );
});

for (const target of [
  "https://studybuddyng.com/",
  "https://www.studybuddyng.com/",
  "http://study-buddy-staging.up.railway.app/",
  "https://example.com/",
  "https://study-buddy-staging.up.railway.app/login",
  "https://user:password@study-buddy-staging.up.railway.app/",
]) {
  test(`rejects unsafe target ${target}`, () => {
    assert.throws(() => validateZapTarget(target));
  });
}
