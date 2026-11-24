import assert from "node:assert/strict";
import { test } from "node:test";
import { validateNodeRuntime } from "./verify-node-runtime.mjs";

test("accepts one exact Node version across package, nvm and runtime", () => {
  const result = validateNodeRuntime({
    packageVersion: "24.22.3",
    nvmVersion: "24.22.3\n",
    actualVersion: "24.22.3",
  });

  assert.deepEqual(result.problems, []);
});

test("reports configuration and active-runtime mismatches", () => {
  const result = validateNodeRuntime({
    packageVersion: "24.22.3",
    nvmVersion: "v24.21.0",
    actualVersion: "20.19.0",
  });

  assert.equal(result.problems.length, 2);
  assert.match(result.problems[0], /disagree/);
  assert.match(result.problems[1], /expected 24\.22\.3/);
});

